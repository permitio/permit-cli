# Trino Test Environment

This directory contains a Docker Compose setup for testing the `permit env apply trino` command with a real Trino cluster and sample databases.

## Setup

1. **Start the environment:**

   ```bash
   cd tests/trino
   docker-compose up -d
   ```

2. **Wait for services to be healthy:**

   ```bash
   docker-compose ps
   ```

   All services should show "healthy" status.

3. **Verify Trino is accessible:**
   ```bash
   curl http://localhost:8080/v1/info
   ```

## Test Data

The setup includes two databases with sample data:

### PostgreSQL (catalog: postgresql)

- **Schema:** public
- **Tables:** users, products, orders, order_items
- **Sample data:** 3 users, 4 products, 3 orders

### MySQL (catalog: mysql)

- **Schema:** testdb
- **Tables:** customers, inventory, transactions, transaction_items
- **Sample data:** 3 customers, 4 inventory items, 3 transactions

## Testing the CLI Command

Once the environment is running, you can test the `permit env apply trino` command:

```bash
# Test with all catalogs
permit env apply trino --url http://localhost:8080 --user test

# Test with specific catalog
permit env apply trino --url http://localhost:8080 --user test --catalog postgresql

# Test with specific schema
permit env apply trino --url http://localhost:8080 --user test --catalog postgresql --schema public
```

## Expected Resources

The command should create the following Permit resources:

### Catalogs

- `postgresql` - PostgreSQL catalog
- `mysql` - MySQL catalog

### Schemas

- `postgresql|public` - Public schema in PostgreSQL
- `mysql|testdb` - TestDB schema in MySQL

### Tables (with columns as attributes)

- `postgresql|public|users` - Users table with columns as attributes
- `postgresql|public|products` - Products table with columns as attributes
- `postgresql|public|orders` - Orders table with columns as attributes
- `postgresql|public|order_items` - Order items table with columns as attributes
- `mysql|testdb|customers` - Customers table with columns as attributes
- `mysql|testdb|inventory` - Inventory table with columns as attributes
- `mysql|testdb|transactions` - Transactions table with columns as attributes
- `mysql|testdb|transaction_items` - Transaction items table with columns as attributes

### Columns (as separate resources)

- Each column in each table as a separate resource with hierarchical keys

## Cleanup

To stop and remove the environment:

```bash
docker-compose down -v
```
