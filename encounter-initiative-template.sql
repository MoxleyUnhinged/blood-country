CREATE TABLE IF NOT EXISTS initiative_order (
  type TEXT,
  id TEXT PRIMARY KEY,
  sourceId TEXT,
  name TEXT,
  roleOrCategory TEXT,
  initiative INTEGER,
  hp INTEGER,
  maxHp INTEGER,
  stress INTEGER
);

INSERT INTO initiative_order (type, id, sourceId, name, roleOrCategory, initiative, hp, maxHp, stress) VALUES
('player', 'mara-quinn', 'mara-quinn', 'Mara Quinn', 'Tracker', 12, 10, 10, 6),
('player', 'tom-wren', 'tom-wren', 'Tom Wren', 'Stockman', 11, 11, 11, 3),
('creature', 'creature-init-quinkan-shade', 'quinkan-shade', 'Quinkan Shade', 'Rock-shadow entity', 10, 12, 12, 0),
('creature', 'creature-init-bog-howler', 'bog-howler', 'Bog Howler', 'Swamp beast', 9, 14, 14, 0);
