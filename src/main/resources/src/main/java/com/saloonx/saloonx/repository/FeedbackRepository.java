package com.saloonx.saloonx.repository;

import com.saloonx.saloonx.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    long countByEmailIgnoreCase(String email);
    Optional<Feedback> findTopByEmailIgnoreCaseOrderByIdDesc(String email);
    List<Feedback> findAllByEmailIgnoreCaseOrderByUpdatedAtDesc(String email);
}
