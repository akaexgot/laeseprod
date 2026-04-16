-- =====================================================
-- MIGRATION: FAQ Section Toggle
-- Adds faq_section_enabled column to settings table
-- Run this in Supabase SQL Editor
-- =====================================================

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS faq_section_enabled BOOLEAN DEFAULT TRUE;
