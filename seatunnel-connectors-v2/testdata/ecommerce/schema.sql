-- Complete relational data model for the SeaTunnel database-connector test data.
-- PostgreSQL dialect (portable to MySQL: swap SERIAL->AUTO_INCREMENT, NUMERIC ok,
-- TIMESTAMPTZ->DATETIME, BOOLEAN ok).
--
--   customers 1───* orders 1───* order_items *───1 products
--
-- Referential integrity is enforced with FKs; the generator emits rows that
-- satisfy them (every order has a real customer, every item a real order+product).

CREATE TABLE customers (
    id          BIGINT       PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    email       VARCHAR(160) NOT NULL UNIQUE,
    country     CHAR(2)      NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL
);

CREATE TABLE products (
    id          BIGINT       PRIMARY KEY,
    sku         VARCHAR(32)  NOT NULL UNIQUE,
    name        VARCHAR(160) NOT NULL,
    category    VARCHAR(40)  NOT NULL,
    price       NUMERIC(10,2) NOT NULL,
    in_stock    BOOLEAN      NOT NULL
);

CREATE TABLE orders (
    id          BIGINT       PRIMARY KEY,
    customer_id BIGINT       NOT NULL REFERENCES customers(id),
    status      VARCHAR(16)  NOT NULL,         -- PENDING | PAID | SHIPPED | CANCELLED
    order_date  TIMESTAMPTZ  NOT NULL,
    total       NUMERIC(12,2) NOT NULL         -- == sum(order_items.quantity*unit_price)
);

CREATE TABLE order_items (
    id          BIGINT       PRIMARY KEY,
    order_id    BIGINT       NOT NULL REFERENCES orders(id),
    product_id  BIGINT       NOT NULL REFERENCES products(id),
    quantity    INTEGER      NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_items_order     ON order_items(order_id);
CREATE INDEX idx_items_product   ON order_items(product_id);
