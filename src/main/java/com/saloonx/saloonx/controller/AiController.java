package com.saloonx.saloonx.controller;

import com.saloonx.saloonx.service.AiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private AiService aiService;

    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeFace(@RequestParam("image") MultipartFile image) {
        if (image.isEmpty()) {
            return ResponseEntity.badRequest().body("Please select an image.");
        }

        try {
            byte[] imageBytes = image.getBytes();

            // 1. Detect Face Shape (Local script now returns error if no human face found)
            String faceShape = aiService.detectFaceShape(imageBytes, image.getOriginalFilename());
            if (faceShape.startsWith("Error")) {
                return ResponseEntity.badRequest().body("No human face detected. Please upload a clear photo of yourself.");
            }

            // 2. Get Recommendation from Gemini (Multimodal - now includes human face validation)
            String recommendation = aiService.getHairstyleRecommendation(imageBytes, image.getContentType(), faceShape);
            
            if ("INVALID".equalsIgnoreCase(recommendation.trim())) {
                return ResponseEntity.badRequest().body("The uploaded photo does not appear to be a clear human face. Please upload a clear photo of yourself for hairstyle suggestions.");
            }

            // 3. Generate Hairstyle Image using BytePlus (Needs the image bytes)
            String generatedImage = aiService.generateHairstyleImage(imageBytes, image.getContentType(), faceShape, recommendation);

            // Return JSON response
            return ResponseEntity.ok(Map.of(
                    "faceShape", faceShape,
                    "recommendation", recommendation,
                    "generatedImage", generatedImage != null ? generatedImage : ""));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error processing image: " + e.getMessage());
        }
    }
}
