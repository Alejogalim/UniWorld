-- Running counselor notes (plan 30): a short JSON summary of what the student has shared, per checklist area.
-- NULL until the first update. Never holds secrets.
ALTER TABLE counselor_session ADD COLUMN notes_json TEXT;
