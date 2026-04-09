package com.saloonx.saloonx.controller;

import com.saloonx.saloonx.model.Transaction;
import com.saloonx.saloonx.service.AccountingService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

@Controller
public class AccountingController {

    @Autowired
    private AccountingService accountingService;

    @GetMapping("/accounting")
    public String accountingRedirect() {
        return "redirect:/admin/accounting";
    }

    @GetMapping("/admin/accounting")
    public String accountingPage(HttpSession session, Model model) {
        Object user = session.getAttribute("user");
        if (user == null) {
            return "redirect:/login";
        }
        model.addAllAttributes(accountingService.getDashboardMetrics());
        return "admin/accounting";
    }

    @ResponseBody
    @GetMapping("/api/accounting/transactions")
    public List<Transaction> getTransactions() {
        return accountingService.getAllTransactions();
    }

    @ResponseBody
    @PostMapping("/api/accounting/transactions")
    public ResponseEntity<?> addTransaction(@Valid @RequestBody Transaction transaction, BindingResult result) {
        if (result.hasErrors()) {
            return ResponseEntity.badRequest().body(result.getAllErrors().get(0).getDefaultMessage());
        }
        try {
            Transaction saved = accountingService.addManualTransaction(transaction);
            return ResponseEntity.ok(saved);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @ResponseBody
    @DeleteMapping("/api/accounting/transactions/{id}")
    public void deleteTransaction(@PathVariable Long id) {
        accountingService.deleteTransaction(id);
    }

    @ResponseBody
    @PutMapping("/api/accounting/transactions/{id}")
    public ResponseEntity<?> updateTransaction(@PathVariable Long id, @Valid @RequestBody Transaction transaction, BindingResult result) {
        if (result.hasErrors()) {
            return ResponseEntity.badRequest().body(result.getAllErrors().get(0).getDefaultMessage());
        }
        try {
            Transaction updated = accountingService.updateTransaction(id, transaction);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @ResponseBody
    @GetMapping("/api/accounting/stats/daily")
    public Map<String, Object> getDailyStats() {
        return accountingService.getDailyStats();
    }

    @ResponseBody
    @GetMapping("/api/accounting/stats/monthly")
    public Map<String, Object> getMonthlyStats() {
        return accountingService.getMonthlyStats();
    }

    @ResponseBody
    @GetMapping("/api/accounting/stats/yearly")
    public Map<String, Object> getYearlyStats() {
        return accountingService.getYearlyStats();
    }

    @ResponseBody
    @GetMapping("/api/accounting/stats/history/monthly")
    public List<Map<String, Object>> getMonthlyHistory(@RequestParam int year) {
        return accountingService.getMonthlyHistoricalStats(year);
    }

    @ResponseBody
    @GetMapping("/api/accounting/stats/history/yearly")
    public List<Map<String, Object>> getYearlyHistory() {
        return accountingService.getYearlyHistoricalStats();
    }

    @ResponseBody
    @GetMapping("/api/accounting/stats/categories")
    public Map<String, Double> getCurrentMonthCategories() {
        return accountingService.getCategoryBreakdownForCurrentMonth();
    }
}
