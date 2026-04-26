package com.saloonx.saloonx.controller;

import com.saloonx.saloonx.model.Feedback;
import com.saloonx.saloonx.service.FeedbackService;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

import java.util.List;
import java.util.Optional;

@Controller
public class FeedbackController {

    private final FeedbackService service;
    private final AppointmentService appointmentService;
    private final UserService userService;

    public FeedbackController(FeedbackService service, AppointmentService appointmentService, UserService userService) {
        this.service = service;
        this.appointmentService = appointmentService;
        this.userService = userService;
    }

    @GetMapping("/feedback")
    public String showFeedbackForm(HttpSession session, Model model) {
        Feedback feedback = new Feedback();
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return "redirect:/login";
        }
        if (user != null) {
            Feedback existingFeedback = service.getLatestFeedbackByEmail(user.getEmail());
            if (existingFeedback != null) {
                feedback = existingFeedback;
            } else {
                feedback.setName(user.getFullName());
                feedback.setEmail(user.getEmail());
                List<Appointment> appointments = appointmentService.getAppointmentsByUserId(user.getId());
                if (!appointments.isEmpty()) {
                    feedback.setPhone(appointments.get(appointments.size() - 1).getCustomerPhone());
                    feedback.setAppointmentDate(appointments.get(appointments.size() - 1).getAppointmentDate());
                }
            }
            applyAppointmentContext(user, feedback);
        }
        model.addAttribute("prefilledFeedback", feedback);
        model.addAttribute("hasExistingFeedback", feedback.getId() != null);
        return "feedback";
    }

    @PostMapping("/submit-feedback")
    public String submitFeedback(@ModelAttribute Feedback feedback, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return "redirect:/login";
        }
        if (user != null) {
            feedback.setName(user.getFullName());
            feedback.setEmail(user.getEmail());
            applyAppointmentContext(user, feedback);
        }

        Feedback existingFeedback = service.getLatestFeedbackByEmail(feedback.getEmail());
        boolean rewardEligible = existingFeedback == null;
        Feedback savedFeedback = service.saveOrUpdateSingleFeedback(feedback);

        if (user != null && rewardEligible && !Boolean.TRUE.equals(savedFeedback.getRewardProcessed())) {
            savedFeedback.setRewardProcessed(true);
            service.saveFeedback(savedFeedback);
            User refreshedUser = userService.awardReviewSubmission(user);
            session.setAttribute("user", refreshedUser);
        }

        return "redirect:/readFeedback/" + savedFeedback.getId() + "?saved";
    }

    @GetMapping("/readFeedback/{id}")
    public String readFeedback(@PathVariable Long id, HttpSession session, Model model) {
        Feedback feedback = service.getFeedbackById(id);
        if (feedback == null) {
            return "redirect:/readFeedback";
        }
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return "redirect:/login";
        }
        if (!"ADMIN".equals(user.getRole()) && !user.getEmail().equalsIgnoreCase(feedback.getEmail())) {
            Feedback ownFeedback = service.getLatestFeedbackByEmail(user.getEmail());
            return ownFeedback != null ? "redirect:/readFeedback/" + ownFeedback.getId() : "redirect:/feedback";
        }
        model.addAttribute("feedback", feedback);
        model.addAttribute("feedbackList", "ADMIN".equals(user.getRole())
                ? service.getAllFeedback()
                : service.getFeedbackHistoryForEmail(user.getEmail()));
        return "read-feedback";
    }

    @GetMapping("/readFeedback")
    public String readAllFeedback(HttpSession session, Model model) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return "redirect:/login";
        }
        // By always providing an empty Feedback object, the detail card at the top will be hidden by default
        Feedback feedback = new Feedback(); 
        
        model.addAttribute("feedbackList", "ADMIN".equals(user.getRole())
                ? service.getAllFeedback()
                : service.getFeedbackHistoryForEmail(user.getEmail()));
        model.addAttribute("feedback", feedback);
        return "read-feedback";
    }

    @PostMapping("/update-feedback")
    public String updateFeedback(@ModelAttribute Feedback feedback, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return "redirect:/login";
        }

        Feedback existing = service.getFeedbackById(feedback.getId());
        if (existing == null) {
            return "redirect:/feedback";
        }
        if (!"ADMIN".equals(user.getRole()) && !user.getEmail().equalsIgnoreCase(existing.getEmail())) {
            return "redirect:/feedback";
        }

        existing.setName("ADMIN".equals(user.getRole()) ? feedback.getName() : user.getFullName());
        existing.setEmail("ADMIN".equals(user.getRole()) ? feedback.getEmail() : user.getEmail());
        existing.setPhone(feedback.getPhone());
        existing.setAppointmentDate(feedback.getAppointmentDate());
        existing.setRating(feedback.getRating());
        existing.setMessage(feedback.getMessage());
        if (!"ADMIN".equals(user.getRole())) {
            applyAppointmentContext(user, existing);
        } else {
            existing.setBeauticianName(feedback.getBeauticianName());
        }
        service.saveFeedback(existing);
        return "redirect:/readFeedback/" + existing.getId() + "?updated";
    }

    @GetMapping("/delete-feedback/{id}")
    public String deleteFeedback(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return "redirect:/login";
        }
        Feedback feedback = service.getFeedbackById(id);
        if (feedback == null) {
            return "redirect:/readFeedback";
        }
        if (!"ADMIN".equals(user.getRole()) && !user.getEmail().equalsIgnoreCase(feedback.getEmail())) {
            return "redirect:/feedback";
        }
        service.deleteFeedback(id);
        return "redirect:/readFeedback?deleted";
    }

    private void applyAppointmentContext(User user, Feedback feedback) {
        List<Appointment> appointments = appointmentService.getAppointmentsByUserId(user.getId());
        if (appointments == null || appointments.isEmpty()) {
            return;
        }

        Optional<Appointment> matchingAppointment = appointments.stream()
                .filter(a -> feedback.getAppointmentDate() != null && feedback.getAppointmentDate().equals(a.getAppointmentDate()))
                .filter(a -> a.getBeautician() != null)
                .findFirst();

        Appointment selected = matchingAppointment.orElseGet(() -> appointments.stream()
                .filter(a -> a.getBeautician() != null)
                .reduce((first, second) -> second)
                .orElse(appointments.get(appointments.size() - 1)));

        feedback.setPhone(selected.getCustomerPhone());
        feedback.setAppointmentDate(selected.getAppointmentDate());
        feedback.setBeauticianName(selected.getBeautician() != null ? selected.getBeautician().getFullName() : "Not Assigned");
    }
}
