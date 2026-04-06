-- Add new column for corporate video in Quienes Somos
ALTER TABLE settings ADD COLUMN IF NOT EXISTS about_corporate_video TEXT;
