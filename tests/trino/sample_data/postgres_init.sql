-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
);

-- Insert sample data
INSERT INTO users (email, first_name, last_name, is_active) VALUES
('john.doe@example.com', 'John', 'Doe', true),
('jane.smith@example.com', 'Jane', 'Smith', true),
('bob.wilson@example.com', 'Bob', 'Wilson', false);

INSERT INTO products (name, description, price, category, stock_quantity) VALUES
('Laptop', 'High-performance laptop', 999.99, 'Electronics', 50),
('Mouse', 'Wireless mouse', 29.99, 'Electronics', 100),
('Keyboard', 'Mechanical keyboard', 89.99, 'Electronics', 75),
('Book', 'Programming guide', 49.99, 'Books', 200);

INSERT INTO orders (user_id, total_amount, status) VALUES
(1, 1029.98, 'completed'),
(2, 89.99, 'pending'),
(1, 49.99, 'shipped');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 999.99),
(1, 2, 1, 29.99),
(2, 3, 1, 89.99),
(3, 4, 1, 49.99);

-- View: active_users
CREATE OR REPLACE VIEW active_users AS
SELECT id, email, first_name, last_name
FROM users
WHERE is_active = true;

-- Materialized View: expensive_products_mv
CREATE MATERIALIZED VIEW expensive_products_mv AS
SELECT id, name, price
FROM products
WHERE price > 500;

-- Function: user_full_name
CREATE OR REPLACE FUNCTION user_full_name(uid integer)
RETURNS text AS $$
DECLARE
	fname text;
	lname text;
BEGIN
	SELECT first_name, last_name INTO fname, lname FROM users WHERE id = uid;
	RETURN fname || ' ' || lname;
END;
$$ LANGUAGE plpgsql;

-- Procedure: activate_user
CREATE OR REPLACE PROCEDURE activate_user(uid integer)
LANGUAGE plpgsql
AS $$
BEGIN
	UPDATE users SET is_active = true WHERE id = uid;
END;
$$; 