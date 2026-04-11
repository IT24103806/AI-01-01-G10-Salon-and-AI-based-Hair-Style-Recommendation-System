package com.saloonx.saloonx.repository;

import com.saloonx.saloonx.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByUser(com.saloonx.saloonx.model.User user);

    List<Appointment> findByUserId(Long userId);

    List<Appointment> findByUserIdAndStatus(Long userId, String status);

    long countByUserIdAndStatus(Long userId, String status);

    List<Appointment> findByAppointmentDate(LocalDate date);
}
