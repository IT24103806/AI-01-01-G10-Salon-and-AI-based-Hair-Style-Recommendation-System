package com.saloonx.saloonx.repository;

import com.saloonx.saloonx.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByDate(LocalDate date);

    @Query("SELECT t FROM Transaction t WHERE t.date BETWEEN :startDate AND :endDate")
    List<Transaction> findByDateRange(LocalDate startDate, LocalDate endDate);

    @Query("SELECT t FROM Transaction t WHERE YEAR(t.date) = :year")
    List<Transaction> findByYear(int year);

    @Query("SELECT t FROM Transaction t WHERE YEAR(t.date) = :year AND MONTH(t.date) = :month")
    List<Transaction> findByMonth(int year, int month);

    List<Transaction> findTop20ByOrderByDateDescIdDesc();

    List<Transaction> findByCategoryIgnoreCase(String category);

    boolean existsByDescriptionAndAmountAndTypeAndDate(String description, Double amount, String type, LocalDate date);
}
