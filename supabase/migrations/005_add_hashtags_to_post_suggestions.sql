ALTER TABLE post_suggestions ADD COLUMN IF NOT EXISTS hashtags text[] DEFAULT '{}';
