-- Run this in your Supabase SQL Editor to set up the tables.
-- Go to https://app.supabase.com → your project → SQL Editor → paste & run.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cards_deck_id ON cards(deck_id);

-- Enable row-level security (optional, for public access disable RLS or add policies)
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Public access policies (allow all operations without auth)
CREATE POLICY "public_decks" ON decks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_cards" ON cards FOR ALL USING (true) WITH CHECK (true);

-- MCQ tables
CREATE TABLE mcq_decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mcq_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deck_id UUID REFERENCES mcq_decks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_index INTEGER NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mcq_questions_deck_id ON mcq_questions(deck_id);

ALTER TABLE mcq_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_mcq_decks" ON mcq_decks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_mcq_questions" ON mcq_questions FOR ALL USING (true) WITH CHECK (true);

-- Notes table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_notes" ON notes FOR ALL USING (true) WITH CHECK (true);

-- Folders system
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('flashcards', 'mcq', 'notes')),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE decks ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
ALTER TABLE mcq_decks ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS annotations TEXT NOT NULL DEFAULT '';

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_folders" ON folders FOR ALL USING (true) WITH CHECK (true);
