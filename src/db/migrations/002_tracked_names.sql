-- Name and city for tracked universities, so My universities can show them without the detail cache.
ALTER TABLE tracked_uni ADD COLUMN name TEXT;
ALTER TABLE tracked_uni ADD COLUMN city TEXT;
