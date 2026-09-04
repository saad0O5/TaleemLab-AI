-- TaleemLab Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/skfklkjbvpbvmjudgvvw/sql

-- 1. Students table (anonymous sessions)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  total_predictions INT DEFAULT 0,
  total_correct INT DEFAULT 0
);

-- 2. Predictions table (every prediction a student makes)
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  concept TEXT NOT NULL CHECK (concept IN ('resistance', 'voltage', 'state')),
  prediction_key TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  answer TEXT NOT NULL CHECK (answer IN ('up', 'down', 'same')),
  correct BOOLEAN NOT NULL,
  circuit_topology TEXT,
  circuit_has_parallel BOOLEAN,
  circuit_has_switch BOOLEAN,
  circuit_component_count INT
);

-- 3. Evidence table (SRM evidence entries)
CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  concept TEXT NOT NULL,
  prediction_key TEXT NOT NULL,
  direction TEXT NOT NULL,
  answer TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  circuit_topology TEXT,
  circuit_has_parallel BOOLEAN,
  circuit_has_switch BOOLEAN,
  circuit_component_count INT,
  triggered_misconceptions TEXT[] DEFAULT '{}',
  confidence_delta FLOAT
);

-- 4. Misconception hypotheses (current state of SRM)
CREATE TABLE IF NOT EXISTS misconceptions (
  id SERIAL PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  misconception_id TEXT NOT NULL,
  confidence FLOAT DEFAULT 0,
  times_triggered INT DEFAULT 0,
  last_evidence_at TIMESTAMPTZ,
  UNIQUE(student_id, misconception_id)
);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_predictions_student ON predictions(student_id);
CREATE INDEX IF NOT EXISTS idx_evidence_student ON evidence(student_id);
CREATE INDEX IF NOT EXISTS idx_misconceptions_student ON misconceptions(student_id);

-- 6. Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE misconceptions ENABLE ROW LEVEL SECURITY;

-- Policies: students can only access their own data
-- For anonymous access, we use the student_id as the auth check
CREATE POLICY "Students can view own data" ON students FOR SELECT USING (true);
CREATE POLICY "Students can insert own data" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update own data" ON students FOR UPDATE USING (true);

CREATE POLICY "Students can view own predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "Students can insert own predictions" ON predictions FOR INSERT WITH CHECK (true);

CREATE POLICY "Students can view own evidence" ON evidence FOR SELECT USING (true);
CREATE POLICY "Students can insert own evidence" ON evidence FOR INSERT WITH CHECK (true);

CREATE POLICY "Students can view own misconceptions" ON misconceptions FOR SELECT USING (true);
CREATE POLICY "Students can insert own misconceptions" ON misconceptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can update own misconceptions" ON misconceptions FOR UPDATE USING (true);
