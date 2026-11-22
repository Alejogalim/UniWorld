-- The program name the detail page was opened with when the university was added. The student may rename
-- programName later; the detail page keeps using this value so it reads the cache instead of searching again.
ALTER TABLE tracked_uni ADD COLUMN detail_program TEXT;
