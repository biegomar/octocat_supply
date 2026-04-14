-- Migration 003: Add happy_cats table for customer cat photo uploads

CREATE TABLE happy_cats (
    happy_cat_id INTEGER PRIMARY KEY,
    cat_name TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);
CREATE INDEX idx_happy_cats_product_id ON happy_cats(product_id);
CREATE INDEX idx_happy_cats_uploaded_at ON happy_cats(uploaded_at);
