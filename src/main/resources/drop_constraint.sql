-- SQL script to remove the unique constraint
ALTER TABLE transactions
DROP INDEX unique_transaction;
