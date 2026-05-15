-- User memories: persistent diary of events, stories, and lessons extracted from posts/voice notes
CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('life_event', 'achievement', 'story', 'lesson', 'preference')),
  content TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('voice_note', 'post', 'manual')),
  source_id UUID,
  occurred_at TIMESTAMPTZ,
  posted_about BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_memories_user_id_idx ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS user_memories_posted_about_idx ON user_memories(user_id, posted_about);

-- Add topic tags extracted from each post for richer deduplication
ALTER TABLE posts ADD COLUMN IF NOT EXISTS topics_extracted TEXT[];

-- RLS
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own memories" ON user_memories
  FOR ALL USING (auth.uid() = user_id);
