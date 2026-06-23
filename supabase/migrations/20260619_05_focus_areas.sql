-- Add focus_areas column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS focus_areas text[] DEFAULT '{}';
