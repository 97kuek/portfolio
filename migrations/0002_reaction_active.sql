-- Keep existing reactions selected while allowing each toggle to be atomic.
ALTER TABLE reactions
  ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1));
