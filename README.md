# Blood Country Web UI

A dependency-free website UI scaffold for an Australian-folklore-inspired RPG.

## What This Is

This project is a front-end foundation you can build onto. It is designed to run directly in a browser without Node.js or npm.

Included UI surfaces:

- Landing hero section
- Dashboard with campaign trackers
- Character sheet panel
- Campaign scene board
- Lore index / bestiary panel
- GM tools panel for quick prototype interaction

## Files

- `index.html` - main website shell
- `styles.css` - visual system and responsive layout
- `app.js` - module entrypoint and event wiring
- `csv-templates/` - starter CSV sheets for players, creatures, and initiative order
- `js/default-state.js` - sample campaign/character/lore data
- `js/state.js` - lightweight store and subscriptions
- `js/character.js` - character rendering and editor helpers
- `js/campaign.js` - scene board rendering and scene management
- `js/lore.js` - lore index rendering and lore editor helpers
- `js/encounter.js` - dashboard/encounter rendering helpers
- `js/persistence.js` - localStorage and JSON import/export

## How To Use

1. Open `index.html` in a browser.
2. Use the navigation tabs to inspect each surface.
3. Use the built-in editors to change characters, scenes, lore, and campaign trackers live.
4. Save to browser storage or export/import JSON from the sidebar tools.
5. Use the CSV files in `csv-templates/` as spreadsheet-ready starters for player rosters, enemy creature imports, and encounter initiative sheets.

## Included Upgrades

- Editable forms for character, campaign, scene, and lore data
- Split client code into focused modules
- Browser persistence via localStorage
- JSON export/import for content iteration and backups
- Inventory and equipment editors on the character sheet
- In-browser 3d6 resolution console for skill and fright checks
- GM authoring editors for scenarios, encounters, and creature stat blocks
- Encounter-to-creature linking, difficulty ratings, tags, search/filtering, and a compact run-encounter preview
- GM player roster tracking with initiative, HP, stress, and core stat fields

## Suggested Next Steps

- Add inventory and equipment editors
- Add actual rules resolution and encounter outcomes
- Add networking or a backend once the UI data model stabilizes

## Note

This is original UI scaffolding inspired by horror roleplaying structures. It does not reproduce copyrighted GURPS text.
