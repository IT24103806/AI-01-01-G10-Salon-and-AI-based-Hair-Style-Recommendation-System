package com.saloonx.saloonx.service;

import com.saloonx.saloonx.model.Appointment;
import com.saloonx.saloonx.model.Product;
import com.saloonx.saloonx.model.PurchaseOrder;
import com.saloonx.saloonx.model.Transaction;
import com.saloonx.saloonx.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AccountingService {

    @Autowired
    private TransactionRepository transactionRepository;

    public List<Transaction> getAllTransactions() {
        return transactionRepository.findAll().stream()
                .sorted(Comparator.comparing(Transaction::getDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Transaction::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public List<Transaction> getRecentTransactions() {
        return transactionRepository.findTop20ByOrderByDateDescIdDesc();
    }

    public Transaction addManualTransaction(Transaction transaction) {
        if (transaction.getDate() == null) {
            transaction.setDate(LocalDate.now());
        }
        if (transaction.getCategory() == null || transaction.getCategory().isBlank()) {
            transaction.setCategory("income".equalsIgnoreCase(transaction.getType()) ? "SERVICE_REVENUE" : "GENERAL_EXPENSE");
        }
        transaction.setSourceModule("MANUAL");
        transaction.setSystemGenerated(false);
        if (transaction.getCreatedAt() == null) {
            transaction.setCreatedAt(LocalDateTime.now());
        }
        if (transaction.getTransactionCode() == null || transaction.getTransactionCode().isBlank()) {
            transaction.setTransactionCode(buildTransactionCode(transaction.getCategory()));
        }
        return transactionRepository.save(transaction);
    }

    public void deleteTransaction(Long id) {
        transactionRepository.deleteById(id);
    }

    public Transaction updateTransaction(Long id, Transaction updated) {
        Transaction existing = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        existing.setDescription(updated.getDescription());
        existing.setAmount(updated.getAmount());
        existing.setType(updated.getType());
        existing.setCategory(updated.getCategory());
        existing.setSourceModule(updated.getSourceModule());
        existing.setDate(updated.getDate());
        existing.setNotes(updated.getNotes());

        return transactionRepository.save(existing);
    }


    public Map<String, Object> getDailyStats() {
        LocalDate today = LocalDate.now();
        List<Transaction> transactions = transactionRepository.findByDate(today);
        return calculateStats(transactions);
    }

    public Map<String, Object> getMonthlyStats() {
        LocalDate today = LocalDate.now();
        List<Transaction> transactions = transactionRepository.findByMonth(today.getYear(), today.getMonthValue());
        return calculateStats(transactions);
    }

    public Map<String, Object> getYearlyStats() {
        LocalDate today = LocalDate.now();
        List<Transaction> transactions = transactionRepository.findByYear(today.getYear());
        return calculateStats(transactions);
    }

    public List<Map<String, Object>> getMonthlyHistoricalStats(int year) {
        List<Map<String, Object>> history = new ArrayList<>();
        for (int month = 1; month <= 12; month++) {
            List<Transaction> transactions = transactionRepository.findByMonth(year, month);
            Map<String, Object> stats = calculateStats(transactions);
            stats.put("month", month);
            stats.put("monthName", java.time.Month.of(month).name());
            history.add(stats);
        }
        return history;
    }

    public List<Map<String, Object>> getYearlyHistoricalStats() {
        List<Transaction> allTransactions = transactionRepository.findAll();
        Map<Integer, List<Transaction>> groupedByYear = allTransactions.stream()
                .collect(Collectors.groupingBy(t -> t.getDate().getYear()));

        return groupedByYear.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    Map<String, Object> stats = calculateStats(entry.getValue());
                    stats.put("year", entry.getKey());
                    return stats;
                })
                .collect(Collectors.toList());
    }

    public Map<String, Object> getDashboardMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("daily", getDailyStats());
        metrics.put("monthly", getMonthlyStats());
        metrics.put("yearly", getYearlyStats());
        metrics.put("categoryBreakdown", getCategoryBreakdownForCurrentMonth());
        metrics.put("recentTransactions", getRecentTransactions());
        return metrics;
    }

    public Map<String, Double> getCategoryBreakdownForCurrentMonth() {
        LocalDate today = LocalDate.now();
        List<Transaction> transactions = transactionRepository.findByMonth(today.getYear(), today.getMonthValue());
        return transactions.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getCategory() == null || t.getCategory().isBlank() ? "UNCATEGORIZED" : t.getCategory(),
                        Collectors.summingDouble(Transaction::getAmount)
                ));
    }

    public Transaction recordInventoryPurchase(PurchaseOrder purchaseOrder, Product product, double amount, String createdBy, String notes) {
        Transaction transaction = new Transaction();
        transaction.setDescription("Inventory purchase: " + product.getName());
        transaction.setAmount(amount);
        transaction.setType("expense");
        transaction.setDate(purchaseOrder.getActualDeliveryDate() != null ? purchaseOrder.getActualDeliveryDate() : LocalDate.now());
        transaction.setCategory("INVENTORY_PURCHASE");
        transaction.setSourceModule("INVENTORY");
        transaction.setReferenceType("PURCHASE_ORDER");
        transaction.setReferenceId(purchaseOrder.getId());
        transaction.setSupplierName(purchaseOrder.getSupplier() != null ? purchaseOrder.getSupplier().getName() : null);
        transaction.setCreatedBy(createdBy);
        transaction.setNotes(notes);
        transaction.setSystemGenerated(true);
        transaction.setTransactionCode(buildTransactionCode("INVENTORY_PURCHASE"));
        transaction.setCreatedAt(LocalDateTime.now());
        return transactionRepository.save(transaction);
    }

    public Transaction recordInventoryUsage(Appointment appointment, Product product, double amount, String createdBy, String notes) {
        Transaction transaction = new Transaction();
        transaction.setDescription("Inventory usage for " + appointment.getService() + ": " + product.getName());
        transaction.setAmount(amount);
        transaction.setType("expense");
        transaction.setDate(appointment.getAppointmentDate() != null ? appointment.getAppointmentDate() : LocalDate.now());
        transaction.setCategory("INVENTORY_USAGE");
        transaction.setSourceModule("INVENTORY");
        transaction.setReferenceType("APPOINTMENT");
        transaction.setReferenceId(appointment.getId());
        transaction.setCreatedBy(createdBy);
        transaction.setNotes(notes);
        transaction.setSystemGenerated(true);
        transaction.setTransactionCode(buildTransactionCode("INVENTORY_USAGE"));
        transaction.setCreatedAt(LocalDateTime.now());
        return transactionRepository.save(transaction);
    }

    public void recordServiceIncome(Appointment appointment) {
        String serviceStr = appointment.getService();
        if (serviceStr == null || serviceStr.isBlank()) return;

        double totalAmount = 0;
        String[] services = serviceStr.split(",");
        
        for (String s : services) {
            String clean = s.trim().toLowerCase();
            if (clean.contains("haircut")) totalAmount += 350;
            else if (clean.contains("beard trim")) totalAmount += 350;
            else if (clean.contains("head massage")) totalAmount += 250;
            // Fallback: If it's a generic service not listed, maybe add a default? 
            // The user only specified these three.
        }

        if (totalAmount > 0) {
            Transaction transaction = new Transaction();
            transaction.setDescription("Completed Appointment #" + appointment.getId() + " - " + appointment.getCustomerName());
            transaction.setAmount(totalAmount);
            transaction.setType("income");
            transaction.setDate(LocalDate.now());
            transaction.setCategory("SERVICE_REVENUE");
            transaction.setSourceModule("APPOINTMENT");
            transaction.setReferenceType("APPOINTMENT");
            transaction.setReferenceId(appointment.getId());
            transaction.setSystemGenerated(true);
            transaction.setTransactionCode(buildTransactionCode("SERVICE_REVENUE"));
            transaction.setCreatedAt(LocalDateTime.now());
            transactionRepository.save(transaction);
            System.err.println("DEBUG: Recorded automatic income of RS " + totalAmount + " for appointment #" + appointment.getId());
        }
    }

    public Transaction recordInventoryWriteOff(Product product, double amount, String createdBy, String notes) {
        Transaction transaction = new Transaction();
        transaction.setDescription("Inventory write-off: " + product.getName());
        transaction.setAmount(Math.abs(amount));
        transaction.setType("expense");
        transaction.setDate(LocalDate.now());
        transaction.setCategory("INVENTORY_WRITE_OFF");
        transaction.setSourceModule("INVENTORY");
        transaction.setReferenceType("PRODUCT");
        transaction.setReferenceId(product.getId());
        transaction.setCreatedBy(createdBy);
        transaction.setNotes(notes);
        transaction.setSystemGenerated(true);
        transaction.setTransactionCode(buildTransactionCode("INVENTORY_WRITE_OFF"));
        transaction.setCreatedAt(LocalDateTime.now());
        return transactionRepository.save(transaction);
    }

    private Map<String, Object> calculateStats(List<Transaction> transactions) {
        double income = transactions.stream()
                .filter(t -> "income".equalsIgnoreCase(t.getType()))
                .mapToDouble(Transaction::getAmount)
                .sum();

        double expense = transactions.stream()
                .filter(t -> "expense".equalsIgnoreCase(t.getType()))
                .mapToDouble(Transaction::getAmount)
                .sum();

        Map<String, Object> stats = new HashMap<>();
        stats.put("income", income);
        stats.put("expense", expense);
        stats.put("profit", income - expense);
        return stats;
    }

    private String buildTransactionCode(String category) {
        String prefix = (category == null || category.isBlank()) ? "TXN" : category.replaceAll("[^A-Z]", "");
        if (prefix.length() > 6) {
            prefix = prefix.substring(0, 6);
        }
        return prefix + "-" + System.currentTimeMillis();
    }
}
