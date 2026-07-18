CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT,
  role TEXT,
  initiative INTEGER,
  hp INTEGER,
  maxHp INTEGER,
  stress INTEGER,
  st INTEGER,
  dx INTEGER,
  iq INTEGER,
  ht INTEGER,
  will INTEGER,
  per INTEGER,
  notes TEXT
);

INSERT INTO players (id, name, role, initiative, hp, maxHp, stress, st, dx, iq, ht, will, per, notes) VALUES
('mara-quinn', 'Mara Quinn', 'Tracker', 12, 10, 10, 6, 10, 11, 13, 10, 13, 12, 'Lead investigator and primary witness to the lights.'),
('tom-wren', 'Tom Wren', 'Stockman', 11, 11, 11, 3, 11, 10, 10, 11, 10, 11, 'Reliable with routes but spooks easily in open dark country.'),
('ellen-vale', 'Ellen Vale', 'Schoolteacher Occultist', 10, 9, 9, 8, 9, 10, 12, 9, 12, 11, 'Knows comparative folklore and pattern recognition rituals.');
