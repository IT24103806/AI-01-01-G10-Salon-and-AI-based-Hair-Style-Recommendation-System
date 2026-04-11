-- Full SQL schema for Salon Accounting Module

-- Create the transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount DOUBLE NOT NULL,
    type VARCHAR(20) NOT NULL COMMENT 'income or expense',
    date DATE NOT NULL
);

-- Optional: Index on date for faster performance on statistics queries
CREATE INDEX idx_transaction_date ON transactions(date);
