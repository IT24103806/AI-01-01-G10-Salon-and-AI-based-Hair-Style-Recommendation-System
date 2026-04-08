package com.saloonx.saloonx.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Product name is required")
    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false, length = 100)
    private String sku;

    @Column(unique = true, length = 100)
    private String barcode;

    @Column(length = 100)
    private String category;

    @Column(length = 100)
    private String brand;

    @Column(length = 1000)
    private String description;

    @Column(length = 50)
    private String unit;

    @Min(value = 0, message = "Reorder level cannot be negative")
    private Double reorderLevel = 0.0;

    @Min(value = 0, message = "Current stock cannot be negative")
    private Double currentStock = 0.0;

    @Min(value = 0, message = "Unit cost cannot be negative")
    private Double unitCost = 0.0;

    @Min(value = 0, message = "Selling price cannot be negative")
    private Double sellingPrice = 0.0;

    @Column(length = 1000)
    private String searchKeywords;

    @Column(length = 500)
    private String imageUrl;

    @Column(length = 2000)
    private String searchIndex;

    private Boolean active = true;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (reorderLevel == null) {
            reorderLevel = 0.0;
        }
        if (currentStock == null) {
            currentStock = 0.0;
        }
        if (unitCost == null) {
            unitCost = 0.0;
        }
        if (sellingPrice == null) {
            sellingPrice = 0.0;
        }
        if (active == null) {
            active = true;
        }
        refreshSearchIndex();
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
        refreshSearchIndex();
    }

    public void refreshSearchIndex() {
        this.searchIndex = String.join(" ",
                safe(name),
                safe(brand),
                safe(category),
                safe(searchKeywords),
                safe(unit),
                safe(barcode),
                safe(sku)).trim().toLowerCase();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
