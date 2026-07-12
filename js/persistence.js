const STORAGE_KEY = "blood-country-web-ui-state";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateState(data) {
  return Boolean(data && data.campaign && data.character && Array.isArray(data.party) && Array.isArray(data.lore));
}

export function loadLocalState(fallback) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return clone(fallback);
    }
    const parsed = JSON.parse(raw);
    return validateState(parsed) ? parsed : clone(fallback);
  } catch {
    return clone(fallback);
  }
}

export function saveLocalState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return "Saved state to local browser storage.";
}

export function exportStateFile(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "blood-country-state.json";
  link.click();
  URL.revokeObjectURL(url);
  return "Exported state as blood-country-state.json.";
}

export async function importStateFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!validateState(parsed)) {
    throw new Error("Imported JSON does not match expected game state shape.");
  }
  return parsed;
}

function escapeCsvField(value) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function exportSingleNoteCsvFile({ section, note, filename }) {
  const headers = ["section", "note"];
  const normalizedNote = String(note || "").replace(/\r?\n/g, "\\n");
  const row = [escapeCsvField(section || ""), escapeCsvField(normalizedNote)].join(",");
  const csv = `${headers.join(",")}\n${row}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "blood-country-notes.csv";
  link.click();
  URL.revokeObjectURL(url);
  return `Exported notes as ${link.download}.`;
}

export function exportCreaturesCsvFile(creatures) {
  const rows = Array.isArray(creatures) ? creatures : [];
  const headers = [
    "id",
    "name",
    "category",
    "difficulty",
    "st",
    "dx",
    "iq",
    "ht",
    "will",
    "per",
    "hp",
    "fp",
    "speed",
    "move",
    "dr",
    "attack",
    "damage",
    "tags",
    "traits",
    "notes",
  ];

  const csvLines = [headers.join(",")];
  rows.forEach((item) => {
    const data = {
      ...item,
      tags: Array.isArray(item?.tags) ? item.tags.join("|") : "",
    };
    const row = headers.map((header) => escapeCsvField(data[header]));
    csvLines.push(row.join(","));
  });

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "blood-country-creatures.csv";
  link.click();
  URL.revokeObjectURL(url);
  return "Exported creatures as blood-country-creatures.csv.";
}

export function exportPlayersCsvFile(players) {
  const rows = Array.isArray(players) ? players : [];
  const headers = ["id", "name", "role", "initiative", "hp", "maxHp", "stress", "st", "dx", "iq", "ht", "will", "per", "notes"];

  const csvLines = [headers.join(",")];
  rows.forEach((item) => {
    const row = headers.map((header) => escapeCsvField(item?.[header]));
    csvLines.push(row.join(","));
  });

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "blood-country-players.csv";
  link.click();
  URL.revokeObjectURL(url);
  return "Exported players as blood-country-players.csv.";
}

export function exportInitiativeOrderCsvFile(players, initiativeCreatures) {
  const safePlayers = Array.isArray(players) ? players : [];
  const safeCreatures = Array.isArray(initiativeCreatures) ? initiativeCreatures : [];
  const merged = [
    ...safePlayers.map((item) => ({
      type: "player",
      id: item.id,
      sourceId: item.id,
      name: item.name,
      roleOrCategory: item.role,
      initiative: Number(item.initiative || 0),
      hp: Number(item.hp || 0),
      maxHp: Number(item.maxHp || item.hp || 0),
      stress: Number(item.stress || 0),
    })),
    ...safeCreatures.map((item) => ({
      type: "creature",
      id: item.id,
      sourceId: item.creatureId || "",
      name: item.name,
      roleOrCategory: item.category || "",
      initiative: Number(item.initiative || 0),
      hp: Number(item.hp || 0),
      maxHp: Number(item.maxHp || item.hp || 0),
      stress: Number(item.stress || 0),
    })),
  ].sort((left, right) => Number(right.initiative || 0) - Number(left.initiative || 0));

  const headers = ["type", "id", "sourceId", "name", "roleOrCategory", "initiative", "hp", "maxHp", "stress"];
  const csvLines = [headers.join(",")];
  merged.forEach((item) => {
    const row = headers.map((header) => escapeCsvField(item?.[header]));
    csvLines.push(row.join(","));
  });

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "blood-country-initiative-order.csv";
  link.click();
  URL.revokeObjectURL(url);
  return "Exported initiative order as blood-country-initiative-order.csv.";
}
