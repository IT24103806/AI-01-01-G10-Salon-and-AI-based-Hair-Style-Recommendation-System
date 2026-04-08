package com.saloonx.saloonx.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "purchase_orders")
public class PurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String poNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    private LocalDate orderDate;

    private LocalDate expectedDeliveryDate;

    private LocalDate actualDeliveryDate;

    private Double totalAmount = 0.0;

    @Column(length = 30)
    private String status;

    @Column(length = 1000)
    private String notes;

    private String createdBy;

    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (orderDate == null) {
            orderDate = LocalDate.now();
        }
        if (status == null || status.isBlank()) {
            status = "RECEIVED";
        }
        if (totalAmount == null) {
            totalAmount = 0.0;
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
