import { createDefaultState } from "./js/default-state.js";
import { createStore } from "./js/state.js";
import {
  exportCreaturesCsvFile,
  exportInitiativeOrderCsvFile,
  exportPlayersCsvFile,
  exportSingleNoteCsvFile,
  exportStateFile,
  importStateFile,
  loadLocalState,
  saveLocalState,
} from "./js/persistence.js";
import { randomiseCharacterStress, renderCharacterPanel } from "./js/character.js";
import { advanceScene, renderCampaignPanel, safeSceneId } from "./js/campaign.js";
import { renderLorePanel } from "./js/lore.js";
import { appendLog, renderEncounterPanels, resolveCheck } from "./js/encounter.js";
import { renderGMPanel } from "./js/gm.js";

const ui = {
  activeTab: "dashboard",
  loreFilter: "All",
  selectedSceneId: null,
  selectedLoreIndex: 0,
  selectedScenarioId: null,
  selectedEncounterId: null,
  selectedCreatureId: null,
  selectedPlayerId: null,
  scenarioSearch: "",
  creatureSearch: "",
  scenarioDifficultyFilter: "All",
  creatureDifficultyFilter: "All",
  sceneDraft: null,
  loreDraft: null,
  scenarioDraft: null,
  encounterDraft: null,
  creatureDraft: null,
  playerDraft: null,
};

const store = createStore(loadLocalState(createDefaultState()));

const elements = {
  tabs: Array.from(document.querySelectorAll(".nav-chip")),
  panels: Array.from(document.querySelectorAll(".tab-panel")),
  trackerGrid: document.getElementById("trackerGrid"),
  partyList: document.getElementById("partyList"),
  logList: document.getElementById("logList"),
  dashboardTitle: document.getElementById("dashboardTitle"),
  resolutionConsole: document.getElementById("resolutionConsole"),
  characterName: document.getElementById("characterName"),
  attributeGrid: document.getElementById("attributeGrid"),
  skillList: document.getElementById("skillList"),
  traitList: document.getElementById("traitList"),
  equipmentList: document.getElementById("equipmentList"),
  characterEditor: document.getElementById("characterEditor"),
  campaignPercent: document.getElementById("campaignPercent"),
  campaignBar: document.getElementById("campaignBar"),
  sceneBoard: document.getElementById("sceneBoard"),
  campaignEditor: document.getElementById("campaignEditor"),
  sceneEditor: document.getElementById("sceneEditor"),
  loreGrid: document.getElementById("loreGrid"),
  loreFilters: document.getElementById("loreFilters"),
  loreEditor: document.getElementById("loreEditor"),
  sessionBadges: document.getElementById("sessionBadges"),
  scenePulse: document.getElementById("scenePulse"),
  threatInput: document.getElementById("threatInput"),
  doomInput: document.getElementById("doomInput"),
  omenInput: document.getElementById("omenInput"),
  gmNote: document.getElementById("gmNote"),
  importGmNotesCsvInput: document.getElementById("gmNotesCsvInput"),
  playerTrackerEditor: document.getElementById("playerTrackerEditor"),
  scenarioEditor: document.getElementById("scenarioEditor"),
  encounterEditor: document.getElementById("encounterEditor"),
  creatureEditor: document.getElementById("creatureEditor"),
  saveStatus: document.getElementById("saveStatus"),
  importFileInput: document.getElementById("importFileInput"),
};

function safeContentId(value, fallback) {
  const cleaned = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || fallback;
}

function setStatus(message) {
  elements.saveStatus.textContent = message;
}

function setTab(tabName) {
  ui.activeTab = tabName;
  elements.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  elements.panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === tabName));
}

function syncLeadPartyMember(draft) {
  if (!draft.party.length) {
    draft.party.push({
      name: draft.character.name,
      hp: draft.character.hp,
      stress: draft.character.stress,
      role: draft.character.role,
    });
    return;
  }

  draft.party[0].name = draft.character.name;
  draft.party[0].hp = draft.character.hp;
  draft.party[0].stress = draft.character.stress;
  draft.party[0].role = draft.character.role;
}

function parseEquipmentLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, slot, notes] = line.split("|").map((part) => part.trim());
      return {
        name: name || "Unnamed item",
        slot: slot || "Gear",
        notes: notes || "",
      };
    });
}

function parseInventoryLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, notes] = line.split("|").map((part) => part.trim());
      return {
        name: name || "Unnamed item",
        notes: notes || "",
      };
    });
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCreaturesCsv(value) {
  const lines = String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const defaultHeaders = [
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

  const firstLineValues = parseCsvLine(lines[0]).map((item) => item.toLowerCase());
  const hasHeader = firstLineValues.includes("name") && firstLineValues.some((item) => defaultHeaders.includes(item));
  const headers = hasHeader ? firstLineValues : defaultHeaders;
  const startIndex = hasHeader ? 1 : 0;

  const rows = [];
  for (let i = startIndex; i < lines.length; i += 1) {
    const columns = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = columns[index] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function parseSingleNoteCsv(value) {
  const lines = String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return "";
  }

  const firstRow = parseCsvLine(lines[0]).map((item) => String(item || "").toLowerCase());
  const hasHeader = firstRow.includes("note");
  const dataIndex = hasHeader ? 1 : 0;
  const columns = parseCsvLine(lines[dataIndex] || "");
  const noteIndex = hasHeader ? firstRow.indexOf("note") : 1;
  const encoded = columns[Math.max(0, noteIndex)] || "";
  return String(encoded).replace(/\\n/g, "\n");
}

const campaignActions = {
  selectScene(sceneId) {
    ui.selectedSceneId = sceneId;
    ui.sceneDraft = null;
    render();
  },
  updateCampaignField(field, value) {
    store.update((draft) => {
      draft.campaign[field] = field === "title" ? value : Number(value);
    });
  },
  newSceneDraft() {
    ui.sceneDraft = {
      id: "",
      title: "",
      status: "planned",
      progress: 0,
      summary: "",
    };
    ui.selectedSceneId = null;
    render();
  },
  saveScene(payload) {
    store.update((draft) => {
      const nextScene = {
        id: safeSceneId(payload.id || payload.title, `scene-${draft.campaign.scenes.length + 1}`),
        title: payload.title || "Untitled Scene",
        status: payload.status || "planned",
        progress: Number(payload.progress || 0),
        summary: payload.summary || "No summary provided.",
      };

      if (payload.sourceId && draft.campaign.scenes.some((scene) => scene.id === payload.sourceId)) {
        const index = draft.campaign.scenes.findIndex((scene) => scene.id === payload.sourceId);
        draft.campaign.scenes[index] = nextScene;
      } else {
        draft.campaign.scenes.push(nextScene);
      }

      if (nextScene.status === "active") {
        draft.campaign.activeSceneId = nextScene.id;
      }
      draft.log.push(`Scene file updated: ${nextScene.title}.`);
    });
    ui.selectedSceneId = safeSceneId(payload.id || payload.title, "scene");
    ui.sceneDraft = null;
  },
  deleteScene(sceneId) {
    store.update((draft) => {
      draft.campaign.scenes = draft.campaign.scenes.filter((scene) => scene.id !== sceneId);
      if (!draft.campaign.scenes.length) {
        draft.campaign.scenes = createDefaultState().campaign.scenes;
      }
      if (!draft.campaign.scenes.some((scene) => scene.id === draft.campaign.activeSceneId)) {
        draft.campaign.activeSceneId = draft.campaign.scenes[0].id;
      }
      draft.log.push(`Scene removed: ${sceneId}.`);
    });
    ui.selectedSceneId = store.getState().campaign.activeSceneId;
    ui.sceneDraft = null;
  },
};

const loreActions = {
  setLoreFilter(type) {
    ui.loreFilter = type;
    render();
  },
  selectLore(index) {
    ui.selectedLoreIndex = index;
    ui.loreDraft = null;
    render();
  },
  newLoreDraft() {
    ui.loreDraft = { title: "", type: "Entity", summary: "" };
    render();
  },
  saveLore(payload) {
    store.update((draft) => {
      const nextLore = {
        title: payload.title || "Untitled Lore",
        type: payload.type || "Entity",
        summary: payload.summary || "No summary provided.",
      };

      if (ui.loreDraft || payload.index === null || payload.index === undefined || Number.isNaN(payload.index)) {
        draft.lore.push(nextLore);
        ui.selectedLoreIndex = draft.lore.length - 1;
      } else {
        draft.lore[payload.index] = nextLore;
        ui.selectedLoreIndex = payload.index;
      }
      draft.log.push(`Lore updated: ${nextLore.title}.`);
    });
    ui.loreDraft = null;
  },
  deleteLore(index) {
    store.update((draft) => {
      draft.lore.splice(index, 1);
      if (!draft.lore.length) {
        draft.lore = createDefaultState().lore;
      }
      draft.log.push("Lore entry removed.");
    });
    ui.selectedLoreIndex = 0;
    ui.loreDraft = null;
  },
};

const gmActions = {
  selectPlayer(id) {
    ui.selectedPlayerId = id;
    ui.playerDraft = null;
    render();
  },
  newPlayerDraft() {
    ui.playerDraft = {
      id: "",
      name: "",
      role: "Investigator",
      initiative: 10,
      hp: 10,
      maxHp: 10,
      stress: 0,
      st: 10,
      dx: 10,
      iq: 10,
      ht: 10,
      will: 10,
      per: 10,
      notes: "",
    };
    render();
  },
  savePlayer(payload) {
    store.update((draft) => {
      const next = {
        id: safeContentId(payload.id || payload.name, `player-${draft.gm.players.length + 1}`),
        name: payload.name || "Unnamed Player",
        role: payload.role || "Investigator",
        initiative: Number(payload.initiative || 0),
        hp: Number(payload.hp || 0),
        maxHp: Number(payload.maxHp || payload.hp || 0),
        stress: Number(payload.stress || 0),
        st: Number(payload.st || 10),
        dx: Number(payload.dx || 10),
        iq: Number(payload.iq || 10),
        ht: Number(payload.ht || 10),
        will: Number(payload.will || 10),
        per: Number(payload.per || 10),
        notes: payload.notes || "",
      };
      const index = payload.sourceId ? draft.gm.players.findIndex((item) => item.id === payload.sourceId) : -1;
      if (index >= 0) {
        draft.gm.players[index] = next;
      } else {
        draft.gm.players.push(next);
      }
      draft.log.push(`Player tracker updated: ${next.name}.`);
    });
    ui.selectedPlayerId = safeContentId(payload.id || payload.name, "player");
    ui.playerDraft = null;
  },
  deletePlayer(id) {
    store.update((draft) => {
      draft.gm.players = draft.gm.players.filter((item) => item.id !== id);
      if (!draft.gm.players.length) {
        draft.gm.players = createDefaultState().gm.players;
      }
      draft.log.push(`Player removed from tracker: ${id}.`);
    });
    ui.selectedPlayerId = store.getState().gm.players[0]?.id || null;
    ui.playerDraft = null;
  },
  adjustPlayerHp(payload) {
    store.update((draft) => {
      const index = draft.gm.players.findIndex((item) => item.id === payload.id);
      if (index < 0) {
        return;
      }
      const current = draft.gm.players[index];
      const nextHp = Math.max(0, Math.min(Number(current.maxHp || current.hp || 0), Number(current.hp || 0) + Number(payload.delta || 0)));
      draft.gm.players[index].hp = nextHp;
      draft.log.push(`Player HP adjusted: ${current.name} is now at ${nextHp}.`);
    });
  },
  addCreatureToInitiative(payload) {
    store.update((draft) => {
      if (!Array.isArray(draft.gm.initiativeCreatures)) {
        draft.gm.initiativeCreatures = [];
      }
      const creature = draft.gm.creatures.find((item) => item.id === payload.creatureId);
      if (!creature) {
        return;
      }
      const next = {
        id: `creature-init-${creature.id}`,
        creatureId: creature.id,
        name: creature.name,
        category: creature.category,
        initiative: Number(payload.initiative || creature.dx || 10),
        hp: Number(creature.hp || 0),
        maxHp: Number(creature.hp || 0),
        stress: 0,
      };
      const index = (draft.gm.initiativeCreatures || []).findIndex((item) => item.creatureId === creature.id);
      if (index >= 0) {
        draft.gm.initiativeCreatures[index] = next;
      } else {
        draft.gm.initiativeCreatures.push(next);
      }
      draft.log.push(`Creature added to initiative order: ${next.name}.`);
    });
  },
  removeCreatureFromInitiative(id) {
    store.update((draft) => {
      if (!Array.isArray(draft.gm.initiativeCreatures)) {
        draft.gm.initiativeCreatures = [];
      }
      const beforeCount = draft.gm.initiativeCreatures.length;
      draft.gm.initiativeCreatures = draft.gm.initiativeCreatures.filter((item) => item.id !== id);
      if (beforeCount !== draft.gm.initiativeCreatures.length) {
        draft.log.push(`Creature removed from initiative order: ${id}.`);
      }
    });
  },
  updateCreatureInitiative(payload) {
    store.update((draft) => {
      if (!Array.isArray(draft.gm.initiativeCreatures)) {
        draft.gm.initiativeCreatures = [];
      }
      const index = draft.gm.initiativeCreatures.findIndex((item) => item.id === payload.id);
      if (index < 0) {
        return;
      }
      const current = draft.gm.initiativeCreatures[index];
      draft.gm.initiativeCreatures[index] = {
        ...current,
        initiative: Number(payload.initiative ?? current.initiative ?? 0),
        hp: Number(payload.hp ?? current.hp ?? 0),
      };
      draft.log.push(`Creature initiative entry updated: ${current.name}.`);
    });
  },
  adjustCreatureInitiativeHp(payload) {
    store.update((draft) => {
      if (!Array.isArray(draft.gm.initiativeCreatures)) {
        draft.gm.initiativeCreatures = [];
      }
      const index = draft.gm.initiativeCreatures.findIndex((item) => item.id === payload.id);
      if (index < 0) {
        return;
      }
      const current = draft.gm.initiativeCreatures[index];
      const nextHp = Math.max(0, Math.min(Number(current.maxHp || current.hp || 0), Number(current.hp || 0) + Number(payload.delta || 0)));
      draft.gm.initiativeCreatures[index].hp = nextHp;
      draft.log.push(`Creature HP adjusted: ${current.name} is now at ${nextHp}.`);
    });
  },
  importCreaturesCsv(csvText) {
    store.update((draft) => {
      if (!Array.isArray(draft.gm.initiativeCreatures)) {
        draft.gm.initiativeCreatures = [];
      }

      const toNumber = (value, fallback) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      const splitTags = (value) =>
        String(value || "")
          .split(/[|;,]/)
          .map((item) => item.trim())
          .filter(Boolean);

      const rows = parseCreaturesCsv(csvText);
      let created = 0;
      let updated = 0;

      rows.forEach((row) => {
        const name = String(row.name || "").trim();
        if (!name) {
          return;
        }
        const candidateId = safeContentId(row.id || name, `creature-${draft.gm.creatures.length + 1}`);
        const index = draft.gm.creatures.findIndex((item) => item.id === candidateId);
        const existing = index >= 0 ? draft.gm.creatures[index] : null;
        const next = {
          id: candidateId,
          name,
          category: row.category || existing?.category || "Unknown",
          difficulty: row.difficulty || existing?.difficulty || "Normal",
          tags: splitTags(row.tags || existing?.tags?.join("|")),
          st: toNumber(row.st, existing?.st ?? 10),
          dx: toNumber(row.dx, existing?.dx ?? 10),
          iq: toNumber(row.iq, existing?.iq ?? 10),
          ht: toNumber(row.ht, existing?.ht ?? 10),
          will: toNumber(row.will, existing?.will ?? 10),
          per: toNumber(row.per, existing?.per ?? 10),
          hp: toNumber(row.hp, existing?.hp ?? 10),
          fp: toNumber(row.fp, existing?.fp ?? 10),
          speed: toNumber(row.speed, existing?.speed ?? 5),
          move: toNumber(row.move, existing?.move ?? 5),
          dr: toNumber(row.dr, existing?.dr ?? 0),
          attack: row.attack || existing?.attack || "",
          damage: row.damage || existing?.damage || "",
          traits: row.traits || existing?.traits || "",
          notes: row.notes || existing?.notes || "",
        };

        if (index >= 0) {
          draft.gm.creatures[index] = next;
          updated += 1;
        } else {
          draft.gm.creatures.push(next);
          created += 1;
        }

        const initIndex = draft.gm.initiativeCreatures.findIndex((item) => item.creatureId === next.id);
        if (initIndex >= 0) {
          draft.gm.initiativeCreatures[initIndex] = {
            ...draft.gm.initiativeCreatures[initIndex],
            id: `creature-init-${next.id}`,
            creatureId: next.id,
            name: next.name,
            category: next.category,
            hp: Number(next.hp || 0),
            maxHp: Number(next.hp || 0),
          };
        }
      });

      draft.log.push(`Creature CSV import complete: ${created} created, ${updated} updated.`);
    });
  },
  exportCreaturesCsv() {
    setStatus(exportCreaturesCsvFile(store.getState().gm.creatures));
  },
  exportPlayersCsv() {
    setStatus(exportPlayersCsvFile(store.getState().gm.players));
  },
  exportInitiativeCsv() {
    const state = store.getState();
    setStatus(exportInitiativeOrderCsvFile(state.gm.players, state.gm.initiativeCreatures));
  },
  setScenarioSearch(value) {
    ui.scenarioSearch = value;
    render();
  },
  setScenarioDifficultyFilter(value) {
    ui.scenarioDifficultyFilter = value;
    render();
  },
  selectScenario(id) {
    ui.selectedScenarioId = id;
    ui.scenarioDraft = null;
    render();
  },
  newScenarioDraft() {
    ui.scenarioDraft = { id: "", title: "", objective: "", act: "Act I", threat: "Low", notes: "" };
    render();
  },
  saveScenario(payload) {
    store.update((draft) => {
      const next = {
        id: safeContentId(payload.id || payload.title, `scenario-${draft.gm.scenarios.length + 1}`),
        title: payload.title || "Untitled Scenario",
        objective: payload.objective || "",
        act: payload.act || "Act I",
        difficulty: payload.difficulty || "Normal",
        threat: payload.threat || "Low",
        tags: String(payload.tags || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        notes: payload.notes || "",
      };
      const index = payload.sourceId ? draft.gm.scenarios.findIndex((item) => item.id === payload.sourceId) : -1;
      if (index >= 0) {
        draft.gm.scenarios[index] = next;
      } else {
        draft.gm.scenarios.push(next);
      }
      draft.log.push(`Scenario updated: ${next.title}.`);
    });
    ui.selectedScenarioId = safeContentId(payload.id || payload.title, "scenario");
    ui.scenarioDraft = null;
  },
  deleteScenario(id) {
    store.update((draft) => {
      draft.gm.scenarios = draft.gm.scenarios.filter((item) => item.id !== id);
      if (!draft.gm.scenarios.length) {
        draft.gm.scenarios = createDefaultState().gm.scenarios;
      }
      draft.log.push(`Scenario removed: ${id}.`);
    });
    ui.selectedScenarioId = store.getState().gm.scenarios[0]?.id || null;
    ui.scenarioDraft = null;
  },
  setCreatureSearch(value) {
    ui.creatureSearch = value;
    render();
  },
  setCreatureDifficultyFilter(value) {
    ui.creatureDifficultyFilter = value;
    render();
  },
  selectEncounter(id) {
    ui.selectedEncounterId = id;
    ui.encounterDraft = null;
    render();
  },
  newEncounterDraft() {
    ui.encounterDraft = { id: "", title: "", scenarioId: store.getState().gm.scenarios[0]?.id || "", range: "", threat: "Low", difficulty: "Normal", creatureIds: [], composition: "", tactics: "", rewards: "" };
    render();
  },
  saveEncounter(payload) {
    store.update((draft) => {
      const next = {
        id: safeContentId(payload.id || payload.title, `encounter-${draft.gm.encounters.length + 1}`),
        title: payload.title || "Untitled Encounter",
        scenarioId: payload.scenarioId || draft.gm.scenarios[0]?.id || "",
        range: payload.range || "",
        threat: payload.threat || "Low",
        difficulty: payload.difficulty || "Normal",
        creatureIds: Array.isArray(payload.creatureIds) ? payload.creatureIds : [],
        composition: payload.composition || "",
        tactics: payload.tactics || "",
        rewards: payload.rewards || "",
      };
      const index = payload.sourceId ? draft.gm.encounters.findIndex((item) => item.id === payload.sourceId) : -1;
      if (index >= 0) {
        draft.gm.encounters[index] = next;
      } else {
        draft.gm.encounters.push(next);
      }
      draft.log.push(`Encounter updated: ${next.title}.`);
    });
    ui.selectedEncounterId = safeContentId(payload.id || payload.title, "encounter");
    ui.encounterDraft = null;
  },
  deleteEncounter(id) {
    store.update((draft) => {
      draft.gm.encounters = draft.gm.encounters.filter((item) => item.id !== id);
      if (!draft.gm.encounters.length) {
        draft.gm.encounters = createDefaultState().gm.encounters;
      }
      draft.log.push(`Encounter removed: ${id}.`);
    });
    ui.selectedEncounterId = store.getState().gm.encounters[0]?.id || null;
    ui.encounterDraft = null;
  },
  selectCreature(id) {
    ui.selectedCreatureId = id;
    ui.creatureDraft = null;
    render();
  },
  newCreatureDraft() {
    ui.creatureDraft = { id: "", name: "", category: "", difficulty: "Normal", tags: [], st: 10, dx: 10, iq: 10, ht: 10, will: 10, per: 10, hp: 10, fp: 10, speed: 5, move: 5, dr: 0, attack: "", damage: "", traits: "", notes: "" };
    render();
  },
  saveCreature(payload) {
    store.update((draft) => {
      if (!Array.isArray(draft.gm.initiativeCreatures)) {
        draft.gm.initiativeCreatures = [];
      }
      const next = {
        id: safeContentId(payload.id || payload.name, `creature-${draft.gm.creatures.length + 1}`),
        name: payload.name || "Untitled Creature",
        category: payload.category || "Unknown",
        difficulty: payload.difficulty || "Normal",
        tags: String(payload.tags || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        st: Number(payload.st || 10),
        dx: Number(payload.dx || 10),
        iq: Number(payload.iq || 10),
        ht: Number(payload.ht || 10),
        will: Number(payload.will || 10),
        per: Number(payload.per || 10),
        hp: Number(payload.hp || 10),
        fp: Number(payload.fp || 10),
        speed: Number(payload.speed || 5),
        move: Number(payload.move || 5),
        dr: Number(payload.dr || 0),
        attack: payload.attack || "",
        damage: payload.damage || "",
        traits: payload.traits || "",
        notes: payload.notes || "",
      };
      const index = payload.sourceId ? draft.gm.creatures.findIndex((item) => item.id === payload.sourceId) : -1;
      if (index >= 0) {
        draft.gm.creatures[index] = next;
      } else {
        draft.gm.creatures.push(next);
      }
      const initIndex = (draft.gm.initiativeCreatures || []).findIndex((item) => item.creatureId === next.id || item.creatureId === payload.sourceId);
      if (initIndex >= 0) {
        draft.gm.initiativeCreatures[initIndex] = {
          ...draft.gm.initiativeCreatures[initIndex],
          id: `creature-init-${next.id}`,
          creatureId: next.id,
          name: next.name,
          category: next.category,
          hp: Number(next.hp || 0),
          maxHp: Number(next.hp || 0),
        };
      }
      draft.log.push(`Creature updated: ${next.name}.`);
    });
    ui.selectedCreatureId = safeContentId(payload.id || payload.name, "creature");
    ui.creatureDraft = null;
  },
  deleteCreature(id) {
    store.update((draft) => {
      if (!Array.isArray(draft.gm.initiativeCreatures)) {
        draft.gm.initiativeCreatures = [];
      }
      draft.gm.creatures = draft.gm.creatures.filter((item) => item.id !== id);
      draft.gm.initiativeCreatures = draft.gm.initiativeCreatures.filter((item) => item.creatureId !== id);
      if (!draft.gm.creatures.length) {
        draft.gm.creatures = createDefaultState().gm.creatures;
      }
      draft.log.push(`Creature removed: ${id}.`);
    });
    ui.selectedCreatureId = store.getState().gm.creatures[0]?.id || null;
    ui.creatureDraft = null;
  },
};

function bindResolutionConsole() {
  const skillSelect = document.getElementById("skillCheckSelect");
  const skillModifierInput = document.getElementById("skillModifierInput");
  const frightModifierInput = document.getElementById("frightModifierInput");
  const rollSkillBtn = document.getElementById("rollSkillBtn");
  const rollFrightBtn = document.getElementById("rollFrightBtn");

  if (!skillSelect || !rollSkillBtn || !rollFrightBtn) {
    return;
  }

  rollSkillBtn.addEventListener("click", () => {
    store.update((draft) => {
      const skillName = skillSelect.value;
      const base = draft.character.skills[skillName] || 10;
      resolveCheck(draft, `${skillName} check`, base, Number(skillModifierInput.value || 0));
    });
  });

  rollFrightBtn.addEventListener("click", () => {
    store.update((draft) => {
      const base = draft.character.attributes.Will || draft.character.attributes.IQ || 10;
      const pressure = -Math.floor((draft.campaign.threat + draft.campaign.omen) / 4);
      const extraMod = Number(frightModifierInput.value || 0);
      const result = resolveCheck(draft, "Fright check", base, pressure + extraMod);
      if (!result.success) {
        draft.character.stress = Math.min(12, draft.character.stress + 1);
        syncLeadPartyMember(draft);
      }
    });
  });
}

function render() {
  const state = store.getState();

  if (document.activeElement !== elements.gmNote) {
    elements.gmNote.value = state.gm.notes || "";
  }

  renderEncounterPanels(state, elements);
  bindResolutionConsole();
  renderCharacterPanel(state, elements, {
    updateCharacterField(field, value) {
      store.update((draft) => {
        draft.character[field] = field === "name" || field === "role" ? value : Number(value);
        syncLeadPartyMember(draft);
      });
    },
    updateAttributeField(field, value) {
      store.update((draft) => {
        draft.character.attributes[field] = Number(value);
      });
    },
    updateSkillField(field, value) {
      store.update((draft) => {
        draft.character.skills[field] = Number(value);
      });
    },
    updateTraits(value) {
      store.update((draft) => {
        draft.character.traits = value.split("\n").map((item) => item.trim()).filter(Boolean);
      });
    },
    updateEquipment(value) {
      store.update((draft) => {
        draft.character.equipment = parseEquipmentLines(value);
      });
    },
    updateInventory(value) {
      store.update((draft) => {
        draft.character.inventory = parseInventoryLines(value);
      });
    },
    updateCharacterNotes(value) {
      store.update((draft) => {
        draft.character.notes = value;
      });
    },
    exportCharacterNotesCsv() {
      setStatus(
        exportSingleNoteCsvFile({
          section: "character",
          note: store.getState().character.notes || "",
          filename: "blood-country-character-notes.csv",
        })
      );
    },
    async importCharacterNotesCsv(file) {
      try {
        const text = await file.text();
        const nextNote = parseSingleNoteCsv(text);
        store.update((draft) => {
          draft.character.notes = nextNote;
        });
        setStatus(`Imported character notes from ${file.name}.`);
      } catch {
        setStatus("Failed to import character notes CSV.");
      }
    },
  });
  renderCampaignPanel(state, elements, ui, campaignActions);
  renderLorePanel(state, elements, ui, loreActions);
  renderGMPanel(state, elements, ui, gmActions);
  setTab(ui.activeTab);
}

store.subscribe(() => render());

document.querySelectorAll("[data-nav]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.nav;
    if (target === "play") {
      document.getElementById("play").scrollIntoView({ behavior: "smooth" });
      setTab("dashboard");
      return;
    }
    setTab(target);
    document.getElementById("play").scrollIntoView({ behavior: "smooth" });
  });
});

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => setTab(tab.dataset.tab));
});

document.getElementById("advanceSceneBtn").addEventListener("click", () => {
  store.update((draft) => advanceScene(draft));
});

document.getElementById("randomiseStressBtn").addEventListener("click", () => {
  store.update((draft) => randomiseCharacterStress(draft));
});

elements.threatInput.addEventListener("input", () => {
  store.update((draft) => {
    draft.campaign.threat = Number(elements.threatInput.value);
  });
});

elements.doomInput.addEventListener("input", () => {
  store.update((draft) => {
    draft.campaign.doom = Number(elements.doomInput.value);
  });
});

elements.omenInput.addEventListener("input", () => {
  store.update((draft) => {
    draft.campaign.omen = Number(elements.omenInput.value);
  });
});

elements.gmNote.addEventListener("input", () => {
  store.update((draft) => {
    draft.gm.notes = elements.gmNote.value;
  });
});

document.getElementById("appendNoteBtn").addEventListener("click", () => {
  store.update((draft) => {
    const nextNote = elements.gmNote.value.trim();
    draft.gm.notes = nextNote;
    appendLog(draft, nextNote);
  });
  setStatus("GM note saved and appended to log.");
});

document.getElementById("exportGmNotesCsvBtn")?.addEventListener("click", () => {
  const state = store.getState();
  setStatus(
    exportSingleNoteCsvFile({
      section: "gm",
      note: state.gm.notes || "",
      filename: "blood-country-gm-notes.csv",
    })
  );
});

document.getElementById("importGmNotesCsvBtn")?.addEventListener("click", () => {
  elements.importGmNotesCsvInput?.click();
});

elements.importGmNotesCsvInput?.addEventListener("change", async () => {
  const [file] = elements.importGmNotesCsvInput.files || [];
  if (!file) {
    return;
  }
  try {
    const text = await file.text();
    const nextNote = parseSingleNoteCsv(text);
    store.update((draft) => {
      draft.gm.notes = nextNote;
    });
    elements.gmNote.value = nextNote;
    setStatus(`Imported GM notes from ${file.name}.`);
  } catch {
    setStatus("Failed to import GM notes CSV.");
  } finally {
    elements.importGmNotesCsvInput.value = "";
  }
});

document.getElementById("saveBrowserBtn").addEventListener("click", () => {
  setStatus(saveLocalState(store.getState()));
});

document.getElementById("loadBrowserBtn").addEventListener("click", () => {
  store.setState(loadLocalState(createDefaultState()));
  ui.sceneDraft = null;
  ui.loreDraft = null;
  ui.playerDraft = null;
  ui.scenarioDraft = null;
  ui.encounterDraft = null;
  ui.creatureDraft = null;
  setStatus("Loaded state from local browser storage.");
});

document.getElementById("exportJsonBtn").addEventListener("click", () => {
  setStatus(exportStateFile(store.getState()));
});

document.getElementById("importJsonBtn").addEventListener("click", () => {
  elements.importFileInput.click();
});

elements.importFileInput.addEventListener("change", async () => {
  const [file] = elements.importFileInput.files;
  if (!file) {
    return;
  }

  try {
    const imported = await importStateFile(file);
    store.setState(imported);
    ui.sceneDraft = null;
    ui.loreDraft = null;
    ui.playerDraft = null;
    ui.scenarioDraft = null;
    ui.encounterDraft = null;
    ui.creatureDraft = null;
    setStatus(`Imported state from ${file.name}.`);
  } catch (error) {
    setStatus(error.message || "Failed to import JSON state.");
  } finally {
    elements.importFileInput.value = "";
  }
});

document.getElementById("resetStateBtn").addEventListener("click", () => {
  store.setState(createDefaultState());
  ui.selectedSceneId = null;
  ui.selectedLoreIndex = 0;
  ui.loreFilter = "All";
  ui.scenarioSearch = "";
  ui.creatureSearch = "";
  ui.scenarioDifficultyFilter = "All";
  ui.creatureDifficultyFilter = "All";
  ui.sceneDraft = null;
  ui.loreDraft = null;
  ui.playerDraft = null;
  ui.scenarioDraft = null;
  ui.encounterDraft = null;
  ui.creatureDraft = null;
  setStatus("Reset to sample data.");
});

render();

const initialState = store.getState();
elements.gmNote.value = initialState.gm.notes || "";
