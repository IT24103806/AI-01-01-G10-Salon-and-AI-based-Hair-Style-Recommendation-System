package com.saloonx.saloonx.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "purchase_order_items")
public class PurchaseOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    private Double quantity = 0.0;

    private Double unitPrice = 0.0;

    private Double totalPrice = 0.0;

    @PrePersist
    @PreUpdate
    public void calculateTotal() {
        if (quantity == null) {
            quantity = 0.0;
        }
        if (unitPrice == null) {
            unitPrice = 0.0;
        }
        totalPrice = quantity * unitPrice;
    }
}
