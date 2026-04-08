package com.saloonx.saloonx.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "stock_transactions")
public class StockTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(length = 30, nullable = false)
    private String transactionType;

    private Double quantity;

    private Double previousStock;

    private Double newStock;

    private Long referenceId;

    @Column(length = 50)
    private String referenceType;

    @Column(length = 255)
    private String performedBy;

    @Column(length = 1000)
    private String notes;

    private Double unitCost;

    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
