package com.saloonx.saloonx.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private Double amount;

    @NotBlank(message = "Type is required")
    private String type;

    @NotNull(message = "Date is required")
    @PastOrPresent(message = "Date cannot be in the future")
    private LocalDate date;

    @Column(length = 50)
    private String category;

    @Column(length = 50)
    private String sourceModule;

    @Column(length = 50)
    private String referenceType;

    private Long referenceId;

    @Column(length = 255)
    private String supplierName;

    @Column(length = 255)
    private String transactionCode;

    @Column(length = 255)
    private String createdBy;

    @Column(length = 1000)
    private String notes;

    private Boolean systemGenerated = false;

    private LocalDateTime createdAt;

    public Transaction() {
        this.date = LocalDate.now();
    }

    public Transaction(String description, Double amount, String type, LocalDate date) {
        this.description = description;
        this.amount = amount;
        this.type = type;
        this.date = date != null ? date : LocalDate.now();
    }

    @PrePersist
    public void beforeInsert() {
        if (date == null) {
            date = LocalDate.now();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (category == null || category.isBlank()) {
            category = "income".equalsIgnoreCase(type) ? "SERVICE_REVENUE" : "GENERAL_EXPENSE";
        }
        if (sourceModule == null || sourceModule.isBlank()) {
            sourceModule = "MANUAL";
        }
        if (systemGenerated == null) {
            systemGenerated = false;
        }
    }
}
