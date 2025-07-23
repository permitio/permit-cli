-- Create customers table
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create inventory table
CREATE TABLE inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    stock_quantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Create transaction_items table
CREATE TABLE transaction_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT,
    inventory_id INT,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (inventory_id) REFERENCES inventory(id)
);

-- Insert sample data
INSERT INTO customers (email, first_name, last_name, is_active) VALUES
('alice.johnson@example.com', 'Alice', 'Johnson', TRUE),
('charlie.brown@example.com', 'Charlie', 'Brown', TRUE),
('diana.prince@example.com', 'Diana', 'Prince', FALSE);

INSERT INTO inventory (name, description, price, category, stock_quantity) VALUES
('Tablet', '10-inch tablet', 299.99, 'Electronics', 30),
('Headphones', 'Noise-cancelling headphones', 199.99, 'Electronics', 60),
('Monitor', '24-inch monitor', 149.99, 'Electronics', 40),
('Desk', 'Office desk', 199.99, 'Furniture', 25);

INSERT INTO transactions (customer_id, total_amount, status) VALUES
(1, 499.98, 'completed'),
(2, 149.99, 'pending'),
(1, 199.99, 'shipped');

INSERT INTO transaction_items (transaction_id, inventory_id, quantity, unit_price) VALUES
(1, 1, 1, 299.99),
(1, 2, 1, 199.99),
(2, 3, 1, 149.99),
(3, 4, 1, 199.99);

-- View: active_customers
CREATE OR REPLACE VIEW active_customers AS
SELECT id, email, first_name, last_name
FROM customers
WHERE is_active = TRUE;

-- Simulated Materialized View: expensive_inventory_mv
CREATE TABLE IF NOT EXISTS expensive_inventory_mv AS
SELECT id, name, price
FROM inventory
WHERE price > 200;

-- Function: customer_full_name
DELIMITER //
CREATE FUNCTION customer_full_name(cid INT) RETURNS VARCHAR(255)
DETERMINISTIC
BEGIN
	DECLARE fname VARCHAR(100);
	DECLARE lname VARCHAR(100);
	SELECT first_name, last_name INTO fname, lname FROM customers WHERE id = cid;
	RETURN CONCAT(fname, ' ', lname);
END //
DELIMITER ;

-- Procedure: activate_customer
DELIMITER //
CREATE PROCEDURE activate_customer(IN cid INT)
BEGIN
	UPDATE customers SET is_active = TRUE WHERE id = cid;
END //
DELIMITER ; 