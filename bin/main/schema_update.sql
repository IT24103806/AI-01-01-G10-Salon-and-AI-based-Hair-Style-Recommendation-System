-- SQL script to add unique constraint to prevent duplicate transactions
-- This ensures that no two transactions can have the same description, amount, type, and date.

ALTER TABLE transactions
ADD CONSTRAINT unique_transaction UNIQUE (description, amount, type, date);
