package com.saloonx.saloonx.controller;

import com.saloonx.saloonx.model.Appointment;
import com.saloonx.saloonx.model.User;
import com.saloonx.saloonx.service.AppointmentService;
import com.saloonx.saloonx.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Controller
public class PageController {

    @Autowired
    private AppointmentService appointmentService;

    @Autowired
    private UserService userService;

    @GetMapping("/")
    public String home() {
        return "index";
    }

    @GetMapping("/ai-hairstyle")
    public String aiHairstyle() {
        return "hairstyle-ai";
    }

    @GetMapping("/appointment")
    public String appointment(@RequestParam(required = false) String service, HttpSession session, Model model) {
        if (session.getAttribute("user") == null) {
            return "redirect:/login";
        }
        if (service != null) {
            model.addAttribute("selectedService", service);
        }
        return "appointment";
    }

    @PostMapping("/appointment")
    public String bookAppointment(@RequestParam String name,
                                  @RequestParam String phone,
                                  @RequestParam String date,
                                  @RequestParam String time,
                                  @RequestParam String service,
                                  HttpSession session,
                                  Model model) {

        User user = (User) session.getAttribute("user");
        if (user == null) {
            return "redirect:/login";
        }

        try {
            Appointment appointment = new Appointment();
            appointment.setCustomerName(name);
            appointment.setCustomerPhone(phone);
            LocalDate appointmentDate = LocalDate.parse(date);
            LocalTime appointmentTime = LocalTime.parse(time);
            if (appointmentDate.isBefore(LocalDate.now())) {
                model.addAttribute("error", "You cannot book an appointment for a past date.");
                return "appointment";
            }
            if (appointmentDate.isEqual(LocalDate.now()) && appointmentTime.isBefore(LocalTime.now())) {
                model.addAttribute("error", "You cannot book an appointment for a past time.");
                return "appointment";
            }
            appointment.setAppointmentDate(appointmentDate);
            appointment.setAppointmentTime(appointmentTime);
            appointment.setService(service);
            appointment.setUser(user);

            appointmentService.saveAppointment(appointment);
            model.addAttribute("success", "Appointment booked successfully!");
        } catch (Exception e) {
            model.addAttribute("error", "Failed to book appointment: " + e.getMessage());
        }
        return "appointment";
    }

    @GetMapping("/home")
    public String homePage() {
        return "home";
    }

    @GetMapping("/login")
    public String login() {
        return "login";
    }

    @GetMapping("/oauth2/authorization/{provider}")
    public String deprecatedOAuthEntry(@PathVariable String provider) {
        return "redirect:/login";
    }

    @GetMapping("/signup")
    public String signup() {
        return "signup";
    }

    @PostMapping("/signup")
    public String signup(@RequestParam String name,
                         @RequestParam String email,
                         @RequestParam String password,
                         @RequestParam String confirmPassword,
                         @RequestParam(required = false) String referralCode,
                         Model model) {
        if (!password.equals(confirmPassword)) {
            model.addAttribute("error", "Passwords do not match");
            model.addAttribute("submittedReferralCode", referralCode);
            return "signup";
        }
        try {
            User user = new User();
            user.setFullName(name);
            user.setEmail(email);
            user.setPassword(password);
            userService.registerUser(user, referralCode);
            return "redirect:/login?registered";
        } catch (Exception e) {
            model.addAttribute("error", "Registration failed: " + e.getMessage());
            model.addAttribute("submittedReferralCode", referralCode);
            return "signup";
        }
    }

    @GetMapping("/my-appointments")
    public String myAppointments(HttpSession session, Model model) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return "redirect:/login";
        }
        List<Appointment> appointments = appointmentService.getAppointmentsByUserId(user.getId());
        model.addAttribute("appointments", appointments);
        return "my-appointments";
    }

    @PostMapping("/my-appointments/delete/{id}")
    public String deleteMyAppointment(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return "redirect:/login";
        }

        appointmentService.getAppointmentById(id).ifPresent(appt -> {
            if (appt.getUser() != null && appt.getUser().getId().equals(user.getId())) {
                appointmentService.deleteAppointment(id);
            }
        });
        return "redirect:/my-appointments";
    }

    @PostMapping("/my-appointments/update/{id}")
    public String updateMyAppointment(@PathVariable Long id,
                                      @RequestParam String date,
                                      @RequestParam String time,
                                      @RequestParam String service,
                                      HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return "redirect:/login";
        }

        appointmentService.getAppointmentById(id).ifPresent(appt -> {
            if (appt.getUser() != null && appt.getUser().getId().equals(user.getId())) {
                LocalDate appointmentDate = LocalDate.parse(date);
                LocalTime appointmentTime = LocalTime.parse(time);
                boolean isPast = appointmentDate.isBefore(LocalDate.now()) ||
                        (appointmentDate.isEqual(LocalDate.now()) && appointmentTime.isBefore(LocalTime.now()));
                if (!isPast) {
                    appt.setAppointmentDate(appointmentDate);
                    appt.setAppointmentTime(appointmentTime);
                    appt.setService(service);
                    appointmentService.saveAppointment(appt);
                }
            }
        });
        return "redirect:/my-appointments";
    }

    @GetMapping("/api/booked-slots")
    @ResponseBody
    public List<String> getBookedSlots(@RequestParam String date) {
        LocalDate localDate = LocalDate.parse(date);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
        return appointmentService.getBookedTimesByDate(localDate).stream()
                .map(time -> time.format(formatter))
                .toList();
    }
}
