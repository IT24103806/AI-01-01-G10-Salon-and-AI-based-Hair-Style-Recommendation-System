package com.saloonx.saloonx.controller;

import com.saloonx.saloonx.model.Product;
import com.saloonx.saloonx.model.Supplier;
import com.saloonx.saloonx.model.User;
import com.saloonx.saloonx.service.InventoryService;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalDate;
import java.util.Map;

@Controller
@RequestMapping("/admin/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public String dashboard(HttpSession session, Model model) {
        User user = (User) session.getAttribute("user");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return "redirect:/login";
        }

        Map<String, Object> data = inventoryService.getDashboardData();
        data.forEach(model::addAttribute);
        return "admin/inventory";
    }

    @PostMapping("/products")
    public String createProduct(@RequestParam String name,
                                @RequestParam(required = false) String barcode,
                                @RequestParam(required = false) String category,
                                @RequestParam(required = false) String brand,
                                @RequestParam(required = false) String description,
                                @RequestParam(required = false) String unit,
                                @RequestParam(defaultValue = "0") Double reorderLevel,
                                @RequestParam(defaultValue = "0") Double unitCost,
                                @RequestParam(defaultValue = "0") Double sellingPrice,
                                @RequestParam(required = false) String searchKeywords,
                                @RequestParam(required = false) String imageUrl,
                                HttpSession session,
                                RedirectAttributes redirectAttributes) {
        User user = (User) session.getAttribute("user");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return "redirect:/login";
        }

        Product product = new Product();
        product.setName(name);
        product.setBarcode(barcode);
        product.setCategory(category);
        product.setBrand(brand);
        product.setDescription(description);
        product.setUnit(unit);
        product.setReorderLevel(reorderLevel);
        product.setUnitCost(unitCost);
        product.setSellingPrice(sellingPrice);
        product.setSearchKeywords(searchKeywords);
        product.setImageUrl(imageUrl);
        inventoryService.createProduct(product);
        redirectAttributes.addAttribute("productSaved", true);
        return "redirect:/admin/inventory";
    }

    @PostMapping("/suppliers")
    public String createSupplier(@RequestParam String name,
                                 @RequestParam(required = false) String contactPerson,
                                 @RequestParam(required = false) String email,
                                 @RequestParam(required = false) String phone,
                                 @RequestParam(required = false) String address,
                                 @RequestParam(required = false) String paymentTerms,
                                 @RequestParam(required = false) String taxId,
                                 HttpSession session,
                                 RedirectAttributes redirectAttributes) {
        User user = (User) session.getAttribute("user");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return "redirect:/login";
        }

        Supplier supplier = new Supplier();
        supplier.setName(name);
        supplier.setContactPerson(contactPerson);
        supplier.setEmail(email);
        supplier.setPhone(phone);
        supplier.setAddress(address);
        supplier.setPaymentTerms(paymentTerms);
        supplier.setTaxId(taxId);
        inventoryService.createSupplier(supplier);
        redirectAttributes.addAttribute("supplierSaved", true);
        return "redirect:/admin/inventory";
    }

    @PostMapping("/purchases")
    public String receivePurchase(@RequestParam Long supplierId,
                                  @RequestParam Long productId,
                                  @RequestParam Double quantity,
                                  @RequestParam Double unitPrice,
                                  @RequestParam(required = false) String expectedDeliveryDate,
                                  @RequestParam(required = false) String notes,
                                  HttpSession session,
                                  RedirectAttributes redirectAttributes) {
        User user = (User) session.getAttribute("user");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return "redirect:/login";
        }

        LocalDate expectedDate = (expectedDeliveryDate == null || expectedDeliveryDate.isBlank())
                ? null
                : LocalDate.parse(expectedDeliveryDate);
        inventoryService.receivePurchase(supplierId, productId, quantity, unitPrice, expectedDate, notes, user.getEmail());
        redirectAttributes.addAttribute("purchaseSaved", true);
        return "redirect:/admin/inventory";
    }

    @PostMapping("/adjustments")
    public String adjustStock(@RequestParam Long productId,
                              @RequestParam Double quantityDelta,
                              @RequestParam(required = false) String notes,
                              HttpSession session,
                              RedirectAttributes redirectAttributes) {
        User user = (User) session.getAttribute("user");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return "redirect:/login";
        }

        inventoryService.adjustStock(productId, quantityDelta, notes, user.getEmail());
        redirectAttributes.addAttribute("adjustmentSaved", true);
        return "redirect:/admin/inventory";
    }

    @PostMapping("/requirements")
    public String createRequirement(@RequestParam String serviceName,
                                    @RequestParam Long productId,
                                    @RequestParam Double quantityUsed,
                                    @RequestParam(defaultValue = "true") boolean mandatory,
                                    HttpSession session,
                                    RedirectAttributes redirectAttributes) {
        User user = (User) session.getAttribute("user");
        if (user == null || !"ADMIN".equals(user.getRole())) {
            return "redirect:/login";
        }

        inventoryService.createServiceRequirement(serviceName, productId, quantityUsed, mandatory);
        redirectAttributes.addAttribute("requirementSaved", true);
        return "redirect:/admin/inventory";
    }
}
