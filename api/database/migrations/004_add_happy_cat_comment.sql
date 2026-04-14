-- Migration 004: Add optional comment column to happy_cats table

ALTER TABLE happy_cats ADD COLUMN comment TEXT;
