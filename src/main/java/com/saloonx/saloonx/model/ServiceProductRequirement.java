package com.saloonx.saloonx.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "service_product_requirements")
public class ServiceProductRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String serviceName;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    private Double quantityUsed = 0.0;

    private Boolean mandatory = true;
}
