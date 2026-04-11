package com.saloonx.saloonx.service;

import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.io.File;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Map;
import java.util.List;

@Service
public class AiService {

    @org.springframework.beans.factory.annotation.Value("${deepseek.api.key}")
    private String deepseekApiKey;

    @org.springframework.beans.factory.annotation.Value("${deepseek.api.base.url}")
    private String deepseekApiBaseUrl;

    @org.springframework.beans.factory.annotation.Value("${lightx.api.key}")
    private String lightXApiKey;

    @org.springframework.beans.factory.annotation.Value("${lightx.api.base.url}")
    private String lightXBaseUrl;

    private static final String DEEPSEEK_MODEL = "deepseek-chat";
    private static final String DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

    private String getDeepseekBaseUrl() {
        if (deepseekApiBaseUrl != null && !deepseekApiBaseUrl.isBlank()) {
            return deepseekApiBaseUrl;
        }
        return DEEPSEEK_API_URL;
    }

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // URL from Ngrok (Update this when restarting Colab)
    // Example: "https://a1b2-34-56-78-90.ngrok-free.app/predict"
    private String pythonApiUrl = "";

    public String detectFaceShape(byte[] imageBytes, String filename) {
        // 1. Try Remote API (Cloud/Ngrok)
        if (pythonApiUrl != null && !pythonApiUrl.isEmpty()) {
            String remoteResult = detectFaceShapeRemote(imageBytes, filename);
            if (!remoteResult.startsWith("Error") && !remoteResult.startsWith("Failed")) {
                return remoteResult;
            }
            System.err.println("Remote API failed, falling back to local script: " + remoteResult);
        }

        // 2. Fallback to Local Script
        return detectFaceShapeLocal(imageBytes);
    }

    private String detectFaceShapeRemote(byte[] imageBytes, String filename) {
        try {
            String boundary = "Boundary-" + System.currentTimeMillis();

            String contentType = "image/jpeg"; // Default or detect from filename
            if (filename.toLowerCase().endsWith(".png"))
                contentType = "image/png";

            StringBuilder header = new StringBuilder();
            header.append("--").append(boundary).append("\r\n");
            header.append("Content-Disposition: form-data; name=\"image\"; filename=\"").append(filename)
                    .append("\"\r\n");
            header.append("Content-Type: ").append(contentType).append("\r\n\r\n");

            byte[] headerBytes = header.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
            byte[] footerBytes = ("\r\n--" + boundary + "--\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8);

            byte[] body = new byte[headerBytes.length + imageBytes.length + footerBytes.length];
            System.arraycopy(headerBytes, 0, body, 0, headerBytes.length);
            System.arraycopy(imageBytes, 0, body, headerBytes.length, imageBytes.length);
            System.arraycopy(footerBytes, 0, body, headerBytes.length + imageBytes.length, footerBytes.length);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(pythonApiUrl))
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                if (root.has("face_shape")) {
                    return root.get("face_shape").asText();
                }
            }
            return "Error from Remote AI: " + response.body();

        } catch (Exception e) {
            System.err.println("Remote AI connection failed: " + e.getMessage());
            return "Failed to connect to Remote AI Check URL.";
        }
    }

    private String detectFaceShapeLocal(byte[] imageBytes) {
        try {
            // Save temp file
            File tempFile = File.createTempFile("upload_", ".jpg");
            java.nio.file.Files.write(tempFile.toPath(), imageBytes);

            // Execute Python Script
            String currentDir = System.getProperty("user.dir");
            System.err.println("AI Service DEBUG: user.dir = " + currentDir);

            // Search for script in common locations
            File scriptFile = new File(currentDir, "member05_integration.py");
            if (!scriptFile.exists()) {
                scriptFile = new File(new File(currentDir, "salonX"), "member05_integration.py");
            }
            if (!scriptFile.exists()) {
                // Try parent if we are in 'src/main/resources' or something weirdly relative
                scriptFile = new File(new File(currentDir).getParentFile(), "member05_integration.py");
            }
            if (!scriptFile.exists()) {
                // Try one level deeper in child 'salonX' of parent
                scriptFile = new File(new File(new File(currentDir).getParentFile(), "salonX"),
                        "member05_integration.py");
            }

            if (!scriptFile.exists()) {
                return "Error: Could not locate 'member05_integration.py' in " + currentDir + " or its surroundings.";
            }

            String scriptName = scriptFile.getName();
            String scriptDir = scriptFile.getParentFile().getAbsolutePath();
            String imagePath = tempFile.getAbsolutePath();

            System.err.println("Executing AI script: " + scriptName + " in directory: " + scriptDir);

            ProcessBuilder pb = new ProcessBuilder(
                    "python",
                    scriptName,
                    "--image", imagePath,
                    "--mode", "detect_only");

            pb.directory(scriptFile.getParentFile());
            pb.redirectErrorStream(true);
            Process process = pb.start();
            // Read Output
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }

            int exitCode = process.waitFor();
            if (exitCode != 0) {
                // If it's a known error from my script about "No human face detected", capture
                // it
                if (output.toString().contains("No human face detected")) {
                    return "Error: No human face detected";
                }
                return "Error: Python script failed. Exit code: " + exitCode + "\nOutput:\n" + output.toString();
            }

            // Parse valid JSON output
            // The script might print other logs, so we look for the last valid JSON line or
            // specific format
            String result = output.toString().trim();
            // Simple parsing for robustness (Script assumes clean output in detect_only
            // mode)
            // If the script behaves well, 'result' is the face shape directly OR valid
            // JSON.
            // Let's assume the script outputs ONLY the face shape name in detect_only mode
            // based on previous edits.
            // If it outputs JSON, we parse it.

            // Cleanup matches behavior of member05_integration.py
            String[] lines = result.split("\n");
            String lastLine = lines[lines.length - 1].trim();

            // Try to see if it's a simple string like "Oval" or JSON
            if (lastLine.startsWith("{")) {
                JsonNode root = objectMapper.readTree(lastLine);
                if (root.has("face_shape"))
                    return root.get("face_shape").asText();
            }
            return lastLine; // Fallback to raw string if script was modified to print just shape

        } catch (Exception e) {
            e.printStackTrace();
            return "Error executing local AI: " + e.getMessage();
        }
    }

    /**
     * Calls LightX AI Hairstyle API to get a visual recommendation.
     * Flow: 1. Get Upload URL -> 2. PUT Image -> 3. POST Generate -> 4. Poll for
     * Status
     */
    public String generateHairstyleImage(byte[] imageBytes, String contentType, String faceShape,
            String recommendation) {
        if (lightXApiKey == null || lightXApiKey.contains("YOUR_LIGHTX_API_KEY")) {
            System.err.println("LightX API Key is missing. Please add it to application.properties.");
            return null;
        }

        try {
            // STEP 1: Get Upload URL (Correct V2 Payload)
            Map<String, Object> uploadReq = Map.of(
                    "uploadType", "imageUrl",
                    "size", imageBytes.length,
                    "contentType", contentType);

            HttpRequest request1 = HttpRequest.newBuilder()
                    .uri(URI.create(lightXBaseUrl + "/v2/uploadImageUrl"))
                    .header("Content-Type", "application/json")
                    .header("x-api-key", lightXApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(uploadReq)))
                    .build();

            HttpResponse<String> resp1 = httpClient.send(request1, HttpResponse.BodyHandlers.ofString());
            System.err.println("LightX STEP 1: Get Upload URL. Status: " + resp1.statusCode());
            if (resp1.statusCode() != 200) {
                System.err.println("LightX STEP 1 failed: " + resp1.body());
                return null;
            }

            JsonNode node1 = objectMapper.readTree(resp1.body());
            JsonNode dataNode = node1.path("body"); // FIX: LightX uses 'body' for V2
            if (dataNode.isMissingNode() || !dataNode.has("uploadImage")) {
                // Try fallback to 'data' just in case of inconsistency
                dataNode = node1.path("data");
                if (dataNode.isMissingNode() || !dataNode.has("uploadImage")) {
                    System.err.println("LightX STEP 1 missing body/data node: " + resp1.body());
                    return null;
                }
            }
            String uploadUrl = dataNode.get("uploadImage").asText();
            String imageUrl = dataNode.get("imageUrl").asText();

            // STEP 2: PUT Image File
            HttpRequest request2 = HttpRequest.newBuilder()
                    .uri(URI.create(uploadUrl))
                    .header("Content-Type", contentType)
                    .PUT(HttpRequest.BodyPublishers.ofByteArray(imageBytes))
                    .build();
            HttpResponse<String> resp2 = httpClient.send(request2, HttpResponse.BodyHandlers.ofString());
            System.err.println("LightX STEP 2: PUT Image. Status: " + resp2.statusCode());

            // STEP 3: Generate 3 Hairstyles
            // Improved Parser: Extract Name AND Length Change for better accuracy
            java.util.List<String> prompts = new java.util.ArrayList<>();
            String[] lines = recommendation.split("\n");
            String currentName = null;

            for (String line : lines) {
                line = line.trim();
                // Match "1. Style Name"
                if (line.matches("^[1-3]\\.\\s*.*")) {
                    currentName = line.replaceAll("^[1-3]\\.\\s*", "").trim();
                }
                // Match "• Length change: short"
                else if (currentName != null && line.toLowerCase().contains("length change:")) {
                    String lengthInfo = line.replaceAll(".*(?i)length change:\\s*", "").replace("]", "").trim();
                    // Construct a powerful prompt for LightX
                    String powerfulPrompt = String.format(
                            "%s hairstyle, %s than current hair, clean barber shop cut, sharp edges, professional grooming, realistic, photorealistic, no long hair",
                            currentName, lengthInfo);
                    prompts.add(powerfulPrompt);
                    currentName = null; // Reset for next suggestion
                }
            }

            // Fallback: If for some reason the length lines aren't found, use my previous
            // simple extraction
            if (prompts.isEmpty()) {
                java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("^[1-3]\\.\\s*(.*)$");
                for (String line : lines) {
                    java.util.regex.Matcher matcher = pattern.matcher(line.trim());
                    if (matcher.find()) {
                        String clean = matcher.group(1).trim();
                        if (!clean.isEmpty())
                            prompts.add(clean + " hairstyle, short hair, clean cut");
                    }
                }
            }

            // Ensure we have at least 3 prompt candidates and generate at least 3 images.
            java.util.List<String> candidatePrompts = new java.util.ArrayList<>(prompts);
            java.util.List<String> fallbackPrompts = java.util.List.of(
                    "Short textured crop hairstyle, clean short barber cut, realistic portrait",
                    "Taper fade with quiff hairstyle, modern barbershop style, realistic portrait",
                    "Classic side part hairstyle, neat professional look, realistic portrait");

            for (String fallbackPrompt : fallbackPrompts) {
                if (candidatePrompts.size() >= 3)
                    break;
                if (!candidatePrompts.contains(fallbackPrompt)) {
                    candidatePrompts.add(fallbackPrompt);
                }
            }

            java.util.List<String> resultUrls = new java.util.ArrayList<>();

            for (int i = 0; i < candidatePrompts.size() && resultUrls.size() < 3; i++) {
                String promptText = candidatePrompts.get(i);
                System.err
                        .println("LightX STEP 3: Generating suggestion " + (resultUrls.size() + 1) + ": " + promptText);

                Map<String, String> genReq = Map.of("imageUrl", imageUrl, "textPrompt", promptText);
                HttpRequest request3 = HttpRequest.newBuilder()
                        .uri(URI.create(lightXBaseUrl + "/v1/hairstyle"))
                        .header("Content-Type", "application/json")
                        .header("x-api-key", lightXApiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(genReq)))
                        .build();

                HttpResponse<String> resp3 = httpClient.send(request3, HttpResponse.BodyHandlers.ofString());
                if (resp3.statusCode() == 200) {
                    JsonNode node3 = objectMapper.readTree(resp3.body());
                    JsonNode orderIdNode = node3.path("body").path("orderId");
                    if (orderIdNode.isMissingNode() || orderIdNode.isNull()) {
                        orderIdNode = node3.path("data").path("orderId");
                    }

                    if (!orderIdNode.isMissingNode() && !orderIdNode.isNull()) {
                        String orderId = orderIdNode.asText();
                        String resultUrl = pollLightXStatus(orderId);
                        if (resultUrl != null) {
                            resultUrls.add(resultUrl);
                            continue;
                        }
                        System.err.println("LightX STEP 3 poll failed for orderId: " + orderId);
                    } else {
                        System.err.println("LightX STEP 3 response missing orderId: " + resp3.body());
                    }
                } else {
                    System.err.println("LightX STEP 3 failed for prompt [" + promptText + "]: " + resp3.body());
                }

                // If generation failed for this prompt, continue to next prompt.
            }

            // If we still have fewer than 3 results, pad with the first successful image if
            // available.
            if (!resultUrls.isEmpty()) {
                while (resultUrls.size() < 3) {
                    resultUrls.add(resultUrls.get(0));
                }
            }

            return resultUrls.isEmpty() ? null : String.join(",", resultUrls);

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    private String pollLightXStatus(String orderId) {
        try {
            for (int i = 0; i < 30; i++) { // Poll for 30 seconds max
                Thread.sleep(1000);
                Map<String, String> statusReq = Map.of("orderId", orderId);
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(lightXBaseUrl + "/v1/order-status"))
                        .header("Content-Type", "application/json")
                        .header("x-api-key", lightXApiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(statusReq)))
                        .build();

                HttpResponse<String> resp = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                JsonNode node = objectMapper.readTree(resp.body());
                JsonNode bodyNode = node.path("body"); // FIX: Use 'body'
                if (bodyNode.isMissingNode())
                    bodyNode = node.path("data");

                String status = bodyNode.get("status").asText();

                if ("active".equals(status)) {
                    return bodyNode.get("output").asText();
                } else if ("failed".equals(status)) {
                    return null;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    /**
     * Calls deepseek API (Multimodal) to get hairstyle recommendations based on
     * face
     * shape and current hair length.
     */
    public String getHairstyleRecommendation(byte[] imageBytes, String contentType, String faceShape) {
        String prompt = "You are an expert men's barber and men's grooming stylist with up-to-date knowledge of 2025–2026 trends.\n\n"
                +
                "STEP 1: Carefully analyze the image.\n" +
                "• Is this a clear, well-lit, front-facing photo of an adult human male's face and current hairstyle?\n"
                +
                "• If it is NOT (animal, object, group photo, cartoon, scenery, woman, child, blurry, heavily filtered, only partial face, etc.), respond with ONLY the single word 'INVALID' and nothing else.\n\n"
                +
                "STEP 2: If it is a valid male face →\n" +
                "First, determine and briefly state his face shape (oval, square, round, diamond, heart, oblong/rectangular, triangle) in one short sentence.\n\n"
                +
                "Then suggest exactly 3 modern, trendy men's hairstyles that suit his " + faceShape
                + " face shape extremely well.\n\n" +
                "STRICT RULES:\n" +
                "• All suggestions MUST be the SAME LENGTH as his current hair OR SHORTER.\n" +
                "• Do NOT suggest anything longer than what is visible in the photo.\n" +
                "• Focus on popular 2025–2026 men's cuts (e.g. textured crop, modern mullet variants only if short, French crop, Ivy League, bro flow only if already medium-short, fade variations, buzz cuts, etc.).\n"
                +
                "• Choose realistic, flattering styles that work with typical male hair density and growth patterns.\n"
                +
                "• For each suggestion give:\n" +
                "  1. Name of the style (short & recognizable name)\n" +
                "  2. One sentence why it flatters his specific face shape\n" +
                "  3. One short sentence on how much shorter (or same length) it would be compared to now\n\n" +
                "Format exactly like this (concise, no extra text):\n\n" +
                "Face shape: [shape]\n\n" +
                "1. [Style Name]\n" +
                "   • Suits because [one reason]\n" +
                "   • Length change: [same / slightly shorter / noticeably shorter / very short]\n\n" +
                "2. [Style Name]\n" +
                "...\n\n" +
                "Keep total response short, focused and barber-shop practical.";

        try {
            // DeepSeek uses OpenAI-compatible chat completions.
            Map<String, Object> payload = Map.of(
                    "model", DEEPSEEK_MODEL,
                    "messages", List.of(
                            Map.of(
                                    "role", "user",
                                    "content", prompt)),
                    "stream", false);

            String requestBody = objectMapper.writeValueAsString(payload);

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(getDeepseekBaseUrl()))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody));

            if (deepseekApiKey != null && !deepseekApiKey.isBlank()) {
                requestBuilder.header("Authorization", "Bearer " + deepseekApiKey);
                requestBuilder.header("x-api-key", deepseekApiKey);
            }

            HttpRequest request = requestBuilder.build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int statusCode = response.statusCode();
            String responseBody = response.body();

            if (statusCode == 200) {
                String aiResult = parseDeepseekResponse(responseBody);
                if ("INVALID".equalsIgnoreCase(aiResult.trim())) {
                    // DeepSeek returned no valid suggestion; use local fallback instead.
                    return fallbackHairstyleRecommendation(faceShape);
                }
                return aiResult;
            } else if (statusCode == 402) {
                System.err.println(
                        "DeepSeek recommendation failed with 402 (Insufficient Balance). Using fallback recommendation. Body: "
                                + responseBody);
                return fallbackHairstyleRecommendation(faceShape);
            } else if (statusCode == 429) {
                System.err.println(
                        "DeepSeek recommendation failed with 429 (Rate limit). Using fallback recommendation. Body: "
                                + responseBody);
                return fallbackHairstyleRecommendation(faceShape);
            } else if (statusCode >= 500) {
                System.err.println("DeepSeek recommendation failed with server error " + statusCode
                        + ". Using fallback recommendation. Body: " + responseBody);
                return fallbackHairstyleRecommendation(faceShape);
            } else {
                System.err.println("DeepSeek recommendation failed. Status: " + statusCode + " Body: " + responseBody);
                return fallbackHairstyleRecommendation(faceShape);
            }

        } catch (Exception e) {
            e.printStackTrace();
            return fallbackHairstyleRecommendation(faceShape);
        }
    }

    private String parseDeepseekResponse(String jsonResponse) {
        // LOG THE RESPONSE FOR DEBUGGING
        System.err.println("DEBUG: DeepSeek Raw Response: " + jsonResponse);
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);

            JsonNode choices = root.path("choices");
            if (choices.isMissingNode() || !choices.isArray() || choices.size() == 0) {
                System.err.println("DeepSeek returned no choices: " + jsonResponse);
                return "INVALID";
            }

            JsonNode content = choices.get(0).path("message").path("content");
            if (!content.isMissingNode() && !content.isNull()) {
                return content.asText();
            }
            return "INVALID";
        } catch (Exception e) {
            e.printStackTrace();
            return "INVALID";
        }
    }

    private String fallbackHairstyleRecommendation(String faceShape) {
        // Minimal rule-based fallback when DeepSeek is unavailable/blocked due to
        // insufficient balance.
        String normalized = (faceShape == null ? "" : faceShape.trim().toLowerCase());
        switch (normalized) {
            case "oval":
                return "Face shape: oval\n\n1. Textured crop\n   • Suits because it accentuates balanced proportions\n   • Length change: slightly shorter\n\n2. Taper fade with quiff\n   • Suits because it adds structure without overwhelming\n   • Length change: same\n\n3. Classic side part\n   • Suits because it is versatile and softens features\n   • Length change: same";
            case "square":
                return "Face shape: square\n\n1. Modern pompadour\n   • Suits because it adds height and softens strong jawline\n   • Length change: slightly longer on top\n\n2. Short textured crop\n   • Suits because it reduces angularity with relaxed top texture\n   • Length change: slightly shorter\n\n3. Low fade crew cut\n   • Suits because it keeps sides clean and jawline defined\n   • Length change: short";
            case "round":
                return "Face shape: round\n\n1. High fade with quiff\n   • Suits because it adds vertical volume and elongates face\n   • Length change: slightly longer on top\n\n2. Angular fringe\n   • Suits because it creates sharper lines and contrast\n   • Length change: same\n\n3. Textured faux hawk\n   • Suits because it gives structure and avoids roundness\n   • Length change: slightly shorter";
            case "diamond":
                return "Face shape: diamond\n\n1. Side-swept textured crop\n   • Suits because it balances narrow chin and forehead\n   • Length change: same\n\n2. Short pompadour\n   • Suits because it fills the upper forehead area\n   • Length change: same\n\n3. Undercut with soft top\n   • Suits because it adds width to cheekbones area\n   • Length change: short";
            case "heart":
                return "Face shape: heart\n\n1. Volumized quiff\n   • Suits because it softens forehead width and adds bottom weight\n   • Length change: same\n\n2. Brushed up fringe\n   • Suits because it shortens forehead and balances chin area\n   • Length change: same\n\n3. Textured crop with low fade\n   • Suits because it matches narrow chin with fullness on top\n   • Length change: short";
            case "oblong":
            case "rectangular":
                return "Face shape: oblong/rectangular\n\n1. Fringe cut\n   • Suits because it reduces face length visually\n   • Length change: same\n\n2. Layered top with mid fade\n   • Suits because it adds width and texture\n   • Length change: same\n\n3. Classic side part with volume\n   • Suits because it provides balance and avoids extra length\n   • Length change: same";
            case "triangle":
                return "Face shape: triangle\n\n1. Textured crop with full top\n   • Suits because it balances wider jaw with top fullness\n   • Length change: same\n\n2. Tapered pompadour\n   • Suits because it draws attention upward and softens jawline\n   • Length change: same\n\n3. Crew cut with skin fade\n   • Suits because it cleans sides and emphasizes face shape proportion\n   • Length change: short";
            default:
                return "Face shape: unknown\n\n1. Textured crop\n   • Suits because it is universally flattering and low maintenance\n   • Length change: slightly shorter\n\n2. Faux hawk\n   • Suits because it adds structure for most faces\n   • Length change: same\n\n3. Taper fade\n   • Suits because it is a safe, modern choice\n   • Length change: short";
        }
    }
}
