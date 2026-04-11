package com.saloonx.saloonx.service;

import com.saloonx.saloonx.model.Appointment;
import com.saloonx.saloonx.repository.AppointmentRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class AppointmentService {

    private final AppointmentRepository repository;

    public AppointmentService(AppointmentRepository repository) {
        this.repository = repository;
    }

    public Appointment saveAppointment(Appointment appointment) {
        return repository.save(appointment);
    }

    public List<Appointment> getAllAppointments() {
        return repository.findAll();
    }

    public Optional<Appointment> getAppointmentById(Long id) {
        return repository.findById(id);
    }

    public List<Appointment> getAppointmentsByUser(com.saloonx.saloonx.model.User user) {
        return repository.findByUser(user);
    }

    public List<Appointment> getAppointmentsByUserId(Long userId) {
        return repository.findByUserId(userId);
    }

    public void deleteAppointment(Long id) {
        repository.deleteById(id);
    }

    public List<java.time.LocalTime> getBookedTimesByDate(java.time.LocalDate date) {
        return repository.findByAppointmentDate(date).stream()
                .filter(a -> !"REJECTED".equals(a.getStatus()))
                .map(Appointment::getAppointmentTime)
                .toList();
    }
}
