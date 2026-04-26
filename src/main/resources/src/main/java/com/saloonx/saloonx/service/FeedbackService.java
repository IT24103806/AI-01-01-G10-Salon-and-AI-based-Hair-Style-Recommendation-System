package com.saloonx.saloonx.service;

import com.saloonx.saloonx.model.Feedback;
import com.saloonx.saloonx.repository.FeedbackRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FeedbackService {

    private final FeedbackRepository repository;

    public FeedbackService(FeedbackRepository repository) {
        this.repository = repository;
    }
    public Feedback saveFeedback(Feedback feedback) {
        return repository.save(feedback);
    }
    public Feedback getFeedbackById(Long id) {
        Optional<Feedback> feedback = repository.findById(id);
        return feedback.orElse(null);
    }
    public List<Feedback> getAllFeedback() {
        return repository.findAll();
    }

    public void deleteFeedback(Long id) {
        repository.deleteById(id);
    }

    public Feedback getLatestFeedbackByEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return repository.findTopByEmailIgnoreCaseOrderByIdDesc(email).orElse(null);
    }

    public List<Feedback> getFeedbackHistoryForEmail(String email) {
        if (email == null || email.isBlank()) {
            return List.of();
        }
        return repository.findAllByEmailIgnoreCaseOrderByUpdatedAtDesc(email);
    }

    public Feedback saveOrUpdateSingleFeedback(Feedback incoming) {
        Feedback existing = getLatestFeedbackByEmail(incoming.getEmail());
        if (existing != null) {
            existing.setName(incoming.getName());
            existing.setEmail(incoming.getEmail());
            existing.setPhone(incoming.getPhone());
            existing.setAppointmentDate(incoming.getAppointmentDate());
            existing.setRating(incoming.getRating());
            existing.setMessage(incoming.getMessage());
            return repository.save(existing);
        }
        return repository.save(incoming);
    }
}
