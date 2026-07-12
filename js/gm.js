function selectedItem(items, selectedId, draft, fallbackFactory) {
  return draft || items.find((item) => item.id === selectedId) || fallbackFactory();
}

function matchesSearch(item, search, fields) {
  if (!search) {
    return true;
  }
  const haystack = fields.map((field) => String(item[field] || "").toLowerCase()).join(" ");
  return haystack.includes(search.toLowerCase());
}

function matchesDifficulty(item, filter) {
  if (!filter || filter === "All") {
    return true;
  }
  return String(item.difficulty || "").toLowerCase() === filter.toLowerCase();
}

function tagText(tags) {
  return Array.isArray(tags) ? tags.join(", ") : "";
}

export function renderGMPanel(state, elements, ui, actions) {
  const scenarioSearch = ui.scenarioSearch || "";
  const creatureSearch = ui.creatureSearch || "";
  const scenarioDifficulty = ui.scenarioDifficultyFilter || "All";
  const creatureDifficulty = ui.creatureDifficultyFilter || "All";
  const filteredScenarios = state.gm.scenarios.filter(
    (item) => matchesSearch(item, scenarioSearch, ["title", "objective", "notes"]) && matchesDifficulty(item, scenarioDifficulty)
  );
  const filteredCreatures = state.gm.creatures.filter(
    (item) => matchesSearch(item, creatureSearch, ["name", "category", "traits", "notes"]) && matchesDifficulty(item, creatureDifficulty)
  );
  const scenario = selectedItem(
    state.gm.scenarios,
    ui.selectedScenarioId,
    ui.scenarioDraft,
    () => ({ id: "", title: "", objective: "", act: "Act I", difficulty: "Normal", threat: "Low", tags: [], notes: "" })
  );
  const encounter = selectedItem(
    state.gm.encounters,
    ui.selectedEncounterId,
    ui.encounterDraft,
    () => ({ id: "", title: "", scenarioId: state.gm.scenarios[0]?.id || "", range: "", threat: "Low", difficulty: "Normal", creatureIds: [], composition: "", tactics: "", rewards: "" })
  );
  const creature = selectedItem(
    state.gm.creatures,
    ui.selectedCreatureId,
    ui.creatureDraft,
    () => ({ id: "", name: "", category: "", difficulty: "Normal", tags: [], st: 10, dx: 10, iq: 10, ht: 10, will: 10, per: 10, hp: 10, fp: 10, speed: 5, move: 5, dr: 0, attack: "", damage: "", traits: "", notes: "" })
  );
  const linkedCreatures = state.gm.creatures.filter((item) => (encounter.creatureIds || []).includes(item.id));
  const selectedPlayer = selectedItem(
    state.gm.players,
    ui.selectedPlayerId,
    ui.playerDraft,
    () => ({ id: "", name: "", role: "Investigator", initiative: 10, hp: 10, maxHp: 10, stress: 0, st: 10, dx: 10, iq: 10, ht: 10, will: 10, per: 10, notes: "" })
  );
  const creatureInitiativeRoster = Array.isArray(state.gm.initiativeCreatures) ? state.gm.initiativeCreatures : [];
  const initiativeOrder = [
    ...state.gm.players.map((item) => ({
      ...item,
      trackerId: `player:${item.id}`,
      trackerType: "player",
      trackerMeta: item.role,
    })),
    ...creatureInitiativeRoster.map((item) => ({
      ...item,
      trackerId: item.id,
      trackerType: "creature",
      trackerMeta: `Creature${item.category ? ` - ${item.category}` : ""}`,
      stress: item.stress ?? 0,
      maxHp: Number(item.maxHp || item.hp || 0),
    })),
  ].sort((left, right) => Number(right.initiative || 0) - Number(left.initiative || 0));
  const defaultInitiativeCreatureId = state.gm.creatures[0]?.id || "";

  elements.playerTrackerEditor.innerHTML = `
    <div class="roster-grid">
      <div class="editor-stack">
        <div class="mini-list">
          ${initiativeOrder
            .map(
              (item) => `
                <div class="entity-card ${!ui.playerDraft && item.id === selectedPlayer.id ? "active-card" : ""}">
                  <strong>${item.name}</strong>
                  <span class="initiative-pill">Init ${item.initiative}</span>
                  <span class="muted-copy">${item.trackerMeta} • HP ${item.hp}/${item.maxHp} • Stress ${item.stress}</span>
                  ${
                    item.trackerType === "creature"
                      ? `<div class="editor-grid form-card">
                          <label>Initiative<input type="number" data-creature-init-initiative="${item.id}" value="${Number(item.initiative || 0)}" /></label>
                          <label>HP<input type="number" data-creature-init-hp="${item.id}" value="${Number(item.hp || 0)}" /></label>
                        </div>
                        <div class="actions-inline">
                          <button class="secondary" data-creature-init-hp-delta="${item.id}" data-delta="-1">HP -</button>
                          <button class="secondary" data-creature-init-hp-delta="${item.id}" data-delta="1">HP +</button>
                          <button class="primary" data-save-creature-init="${item.id}">Save</button>
                          <button class="secondary" data-remove-creature-init="${item.id}">Remove</button>
                        </div>`
                      : `<div class="actions-inline">
                           <button class="secondary" data-player-hp-delta="${item.id}" data-delta="-1">HP -</button>
                           <button class="secondary" data-player-hp-delta="${item.id}" data-delta="1">HP +</button>
                         </div>`
                  }
                </div>
              `
            )
            .join("")}
        </div>
        <div class="editor-grid form-card">
          <label>Add Creature
            <select id="gmInitiativeCreatureSelect" ${defaultInitiativeCreatureId ? "" : "disabled"}>
              ${state.gm.creatures
                .map((item) => `<option value="${item.id}" ${item.id === defaultInitiativeCreatureId ? "selected" : ""}>${item.name}</option>`)
                .join("")}
            </select>
          </label>
          <label>Initiative<input type="number" id="gmInitiativeCreatureInput" value="10" /></label>
        </div>
        <div class="actions-inline">
          <button class="secondary" id="addCreatureToInitiativeBtn" ${defaultInitiativeCreatureId ? "" : "disabled"}>Add Creature to Initiative</button>
          <button class="secondary" id="exportPlayersCsvBtn">Export Player CSV</button>
          <button class="secondary" id="exportInitiativeCsvBtn">Export Initiative CSV</button>
        </div>
      </div>
      <div class="editor-stack">
        <label>Tracked Player
          <select id="gmPlayerSelect">
            <option value="__new__" ${ui.playerDraft ? "selected" : ""}>New Player Draft</option>
            ${state.gm.players.map((item) => `<option value="${item.id}" ${!ui.playerDraft && item.id === selectedPlayer.id ? "selected" : ""}>${item.name}</option>`).join("")}
          </select>
        </label>
        <div class="editor-grid form-card">
          <label>ID<input type="text" id="playerIdInput" value="${selectedPlayer.id}" /></label>
          <label>Name<input type="text" id="playerNameInput" value="${selectedPlayer.name}" /></label>
          <label>Role<input type="text" id="playerRoleInput" value="${selectedPlayer.role}" /></label>
          <label>Initiative<input type="number" id="playerInitiativeInput" value="${selectedPlayer.initiative}" /></label>
          <label>HP<input type="number" id="playerHpInput" value="${selectedPlayer.hp}" /></label>
          <label>Max HP<input type="number" id="playerMaxHpInput" value="${selectedPlayer.maxHp}" /></label>
          <label>Stress<input type="number" id="playerStressInput" value="${selectedPlayer.stress}" /></label>
        </div>
        <div class="stat-block-grid form-card">
          <label>ST<input type="number" id="playerStInput" value="${selectedPlayer.st}" /></label>
          <label>DX<input type="number" id="playerDxInput" value="${selectedPlayer.dx}" /></label>
          <label>IQ<input type="number" id="playerIqInput" value="${selectedPlayer.iq}" /></label>
          <label>HT<input type="number" id="playerHtInput" value="${selectedPlayer.ht}" /></label>
          <label>Will<input type="number" id="playerWillInput" value="${selectedPlayer.will}" /></label>
          <label>Per<input type="number" id="playerPerInput" value="${selectedPlayer.per}" /></label>
        </div>
        <label>Notes<textarea id="playerNotesInput" rows="4">${selectedPlayer.notes}</textarea></label>
        <div class="actions-inline">
          <button class="secondary" id="newPlayerBtn">New Draft</button>
          <button class="primary" id="savePlayerBtn">Save Player</button>
          <button class="secondary" id="deletePlayerBtn">Delete Player</button>
        </div>
      </div>
    </div>
  `;

  elements.scenarioEditor.innerHTML = `
    <div class="editor-grid form-card">
      <label>Search Scenarios<input type="text" id="scenarioSearchInput" value="${scenarioSearch}" /></label>
      <label>Difficulty Filter
        <select id="scenarioDifficultyFilterInput">
          ${["All", "Easy", "Normal", "Hard", "Severe"].map((level) => `<option value="${level}" ${level === scenarioDifficulty ? "selected" : ""}>${level}</option>`).join("")}
        </select>
      </label>
    </div>
    <label>Scenario
      <select id="gmScenarioSelect">
        <option value="__new__" ${ui.scenarioDraft ? "selected" : ""}>New Scenario Draft</option>
        ${state.gm.scenarios.map((item) => `<option value="${item.id}" ${!ui.scenarioDraft && item.id === scenario.id ? "selected" : ""}>${item.title}</option>`).join("")}
      </select>
    </label>
    <div class="mini-list">
      ${filteredScenarios.map((item) => `<div class="entity-card"><strong>${item.title}</strong><span class="muted-copy">${item.act} • ${item.threat} • ${item.difficulty || "Normal"}</span><span class="muted-copy">${tagText(item.tags)}</span></div>`).join("")}
    </div>
    <div class="editor-grid form-card">
      <label>ID<input type="text" id="scenarioIdInput" value="${scenario.id}" /></label>
      <label>Title<input type="text" id="scenarioTitleInput" value="${scenario.title}" /></label>
      <label>Act<input type="text" id="scenarioActInput" value="${scenario.act}" /></label>
      <label>Difficulty<input type="text" id="scenarioDifficultyInput" value="${scenario.difficulty || "Normal"}" /></label>
      <label>Threat<input type="text" id="scenarioThreatInput" value="${scenario.threat}" /></label>
    </div>
    <label>Tags<textarea id="scenarioTagsInput" rows="2">${tagText(scenario.tags)}</textarea></label>
    <label>Objective<textarea id="scenarioObjectiveInput" rows="3">${scenario.objective}</textarea></label>
    <label>Notes<textarea id="scenarioNotesInput" rows="4">${scenario.notes}</textarea></label>
    <div class="actions-inline">
      <button class="secondary" id="newScenarioBtn">New Draft</button>
      <button class="primary" id="saveScenarioBtn">Save Scenario</button>
      <button class="secondary" id="deleteScenarioBtn">Delete Scenario</button>
    </div>
  `;

  elements.encounterEditor.innerHTML = `
    <label>Encounter
      <select id="gmEncounterSelect">
        <option value="__new__" ${ui.encounterDraft ? "selected" : ""}>New Encounter Draft</option>
        ${state.gm.encounters.map((item) => `<option value="${item.id}" ${!ui.encounterDraft && item.id === encounter.id ? "selected" : ""}>${item.title}</option>`).join("")}
      </select>
    </label>
    <div class="mini-list">
      ${state.gm.encounters.map((item) => `<div class="entity-card"><strong>${item.title}</strong><span class="muted-copy">${item.threat} • ${item.range}</span></div>`).join("")}
    </div>
    <div class="editor-grid form-card">
      <label>ID<input type="text" id="encounterIdInput" value="${encounter.id}" /></label>
      <label>Title<input type="text" id="encounterTitleInput" value="${encounter.title}" /></label>
      <label>Scenario
        <select id="encounterScenarioInput">
          ${state.gm.scenarios.map((item) => `<option value="${item.id}" ${item.id === encounter.scenarioId ? "selected" : ""}>${item.title}</option>`).join("")}
        </select>
      </label>
      <label>Threat<input type="text" id="encounterThreatInput" value="${encounter.threat}" /></label>
      <label>Difficulty<input type="text" id="encounterDifficultyInput" value="${encounter.difficulty || "Normal"}" /></label>
    </div>
    <label>Linked Creatures
      <select id="encounterCreatureLinksInput" multiple size="5">
        ${state.gm.creatures
          .map((item) => `<option value="${item.id}" ${(encounter.creatureIds || []).includes(item.id) ? "selected" : ""}>${item.name}</option>`)
          .join("")}
      </select>
    </label>
    <label>Range / Location<textarea id="encounterRangeInput" rows="2">${encounter.range}</textarea></label>
    <label>Composition<textarea id="encounterCompositionInput" rows="3">${encounter.composition}</textarea></label>
    <label>Tactics<textarea id="encounterTacticsInput" rows="3">${encounter.tactics}</textarea></label>
    <label>Rewards / Clues<textarea id="encounterRewardsInput" rows="3">${encounter.rewards}</textarea></label>
    <div class="actions-inline">
      <button class="secondary" id="newEncounterBtn">New Draft</button>
      <button class="primary" id="saveEncounterBtn">Save Encounter</button>
      <button class="secondary" id="deleteEncounterBtn">Delete Encounter</button>
    </div>
    <div class="section-divider"></div>
    <div class="entity-card">
      <span class="label">Run Encounter</span>
      <strong>${encounter.title || "Encounter Preview"}</strong>
      <span class="muted-copy">${encounter.threat} • ${encounter.difficulty || "Normal"} • ${encounter.range || "No location set"}</span>
      <div class="muted-copy">${encounter.tactics || "No tactics set."}</div>
      <div class="mini-list">
        ${linkedCreatures.length
          ? linkedCreatures
              .map(
                (item) => `<div class="entity-card"><strong>${item.name}</strong><span class="muted-copy">HP ${item.hp} • DR ${item.dr} • ${item.attack} • ${item.damage}</span><span class="muted-copy">${item.traits}</span></div>`
              )
              .join("")
          : '<div class="muted-copy">No linked creatures selected for this encounter.</div>'}
      </div>
    </div>
  `;

  elements.creatureEditor.innerHTML = `
    <div class="editor-grid form-card">
      <label>Search Creatures<input type="text" id="creatureSearchInput" value="${creatureSearch}" /></label>
      <label>Difficulty Filter
        <select id="creatureDifficultyFilterInput">
          ${["All", "Easy", "Normal", "Hard", "Severe"].map((level) => `<option value="${level}" ${level === creatureDifficulty ? "selected" : ""}>${level}</option>`).join("")}
        </select>
      </label>
    </div>
    <label>Creature / Monster
      <select id="gmCreatureSelect">
        <option value="__new__" ${ui.creatureDraft ? "selected" : ""}>New Creature Draft</option>
        ${state.gm.creatures.map((item) => `<option value="${item.id}" ${!ui.creatureDraft && item.id === creature.id ? "selected" : ""}>${item.name}</option>`).join("")}
      </select>
    </label>
    <div class="mini-list">
      ${filteredCreatures.map((item) => `<div class="entity-card"><strong>${item.name}</strong><span class="muted-copy">${item.category} • ${item.difficulty || "Normal"} • HP ${item.hp} • DR ${item.dr}</span><span class="muted-copy">${tagText(item.tags)}</span></div>`).join("")}
    </div>
    <div class="editor-grid form-card">
      <label>ID<input type="text" id="creatureIdInput" value="${creature.id}" /></label>
      <label>Name<input type="text" id="creatureNameInput" value="${creature.name}" /></label>
      <label>Category<input type="text" id="creatureCategoryInput" value="${creature.category}" /></label>
      <label>Difficulty<input type="text" id="creatureDifficultyInput" value="${creature.difficulty || "Normal"}" /></label>
      <label>Attack<input type="text" id="creatureAttackInput" value="${creature.attack}" /></label>
      <label>Damage<input type="text" id="creatureDamageInput" value="${creature.damage}" /></label>
      <label>DR<input type="number" id="creatureDrInput" value="${creature.dr}" /></label>
    </div>
    <div class="stat-block-grid form-card">
      <label>ST<input type="number" id="creatureStInput" value="${creature.st}" /></label>
      <label>DX<input type="number" id="creatureDxInput" value="${creature.dx}" /></label>
      <label>IQ<input type="number" id="creatureIqInput" value="${creature.iq}" /></label>
      <label>HT<input type="number" id="creatureHtInput" value="${creature.ht}" /></label>
      <label>Will<input type="number" id="creatureWillInput" value="${creature.will}" /></label>
      <label>Per<input type="number" id="creaturePerInput" value="${creature.per}" /></label>
      <label>HP<input type="number" id="creatureHpInput" value="${creature.hp}" /></label>
      <label>FP<input type="number" id="creatureFpInput" value="${creature.fp}" /></label>
      <label>Speed<input type="number" step="0.25" id="creatureSpeedInput" value="${creature.speed}" /></label>
      <label>Move<input type="number" id="creatureMoveInput" value="${creature.move}" /></label>
    </div>
    <label>Tags<textarea id="creatureTagsInput" rows="2">${tagText(creature.tags)}</textarea></label>
    <label>Traits<textarea id="creatureTraitsInput" rows="3">${creature.traits}</textarea></label>
    <label>Notes<textarea id="creatureNotesInput" rows="4">${creature.notes}</textarea></label>
    <div class="actions-inline">
      <button class="secondary" id="newCreatureBtn">New Draft</button>
      <button class="primary" id="saveCreatureBtn">Save Creature</button>
      <button class="secondary" id="deleteCreatureBtn">Delete Creature</button>
    </div>
    <div class="section-divider"></div>
    <label>Bulk Creature CSV
      <textarea id="creatureCsvInput" rows="7" placeholder="id,name,category,difficulty,st,dx,iq,ht,will,per,hp,fp,speed,move,dr,attack,damage,tags,traits,notes&#10;bog-howler,Bog Howler,Swamp beast,Normal,11,12,8,11,10,12,14,10,5.5,6,2,Claw,1d+2 cut,beast|swamp,Fright howl,Ambushes near reeds"></textarea>
    </label>
    <div class="actions-inline">
      <button class="secondary" id="importCreatureCsvBtn">Import CSV Rows</button>
      <button class="secondary" id="exportCreatureCsvBtn">Export Creature CSV</button>
    </div>
  `;

  elements.playerTrackerEditor.querySelector("#gmPlayerSelect").addEventListener("change", (event) => {
    if (event.target.value === "__new__") {
      actions.newPlayerDraft();
      return;
    }
    actions.selectPlayer(event.target.value);
  });
  elements.playerTrackerEditor.querySelector("#newPlayerBtn").addEventListener("click", () => actions.newPlayerDraft());
  elements.playerTrackerEditor.querySelector("#addCreatureToInitiativeBtn").addEventListener("click", () => {
    const creatureId = elements.playerTrackerEditor.querySelector("#gmInitiativeCreatureSelect")?.value;
    const initiative = elements.playerTrackerEditor.querySelector("#gmInitiativeCreatureInput")?.value;
    if (!creatureId) {
      return;
    }
    actions.addCreatureToInitiative({ creatureId, initiative });
  });
  elements.playerTrackerEditor.querySelector("#exportPlayersCsvBtn").addEventListener("click", () => {
    actions.exportPlayersCsv();
  });
  elements.playerTrackerEditor.querySelector("#exportInitiativeCsvBtn").addEventListener("click", () => {
    actions.exportInitiativeCsv();
  });
  elements.playerTrackerEditor.querySelectorAll("[data-remove-creature-init]").forEach((button) => {
    button.addEventListener("click", () => actions.removeCreatureFromInitiative(button.dataset.removeCreatureInit));
  });
  elements.playerTrackerEditor.querySelectorAll("[data-player-hp-delta]").forEach((button) => {
    button.addEventListener("click", () => {
      actions.adjustPlayerHp({
        id: button.dataset.playerHpDelta,
        delta: Number(button.dataset.delta || 0),
      });
    });
  });
  elements.playerTrackerEditor.querySelectorAll("[data-creature-init-hp-delta]").forEach((button) => {
    button.addEventListener("click", () => {
      actions.adjustCreatureInitiativeHp({
        id: button.dataset.creatureInitHpDelta,
        delta: Number(button.dataset.delta || 0),
      });
    });
  });
  elements.playerTrackerEditor.querySelectorAll("[data-save-creature-init]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.saveCreatureInit;
      const initiativeInput = elements.playerTrackerEditor.querySelector(`[data-creature-init-initiative="${id}"]`);
      const hpInput = elements.playerTrackerEditor.querySelector(`[data-creature-init-hp="${id}"]`);
      actions.updateCreatureInitiative({
        id,
        initiative: initiativeInput?.value,
        hp: hpInput?.value,
      });
    });
  });
  elements.playerTrackerEditor.querySelector("#savePlayerBtn").addEventListener("click", () => {
    actions.savePlayer({
      sourceId: ui.playerDraft ? null : selectedPlayer.id,
      id: elements.playerTrackerEditor.querySelector("#playerIdInput").value,
      name: elements.playerTrackerEditor.querySelector("#playerNameInput").value,
      role: elements.playerTrackerEditor.querySelector("#playerRoleInput").value,
      initiative: elements.playerTrackerEditor.querySelector("#playerInitiativeInput").value,
      hp: elements.playerTrackerEditor.querySelector("#playerHpInput").value,
      maxHp: elements.playerTrackerEditor.querySelector("#playerMaxHpInput").value,
      stress: elements.playerTrackerEditor.querySelector("#playerStressInput").value,
      st: elements.playerTrackerEditor.querySelector("#playerStInput").value,
      dx: elements.playerTrackerEditor.querySelector("#playerDxInput").value,
      iq: elements.playerTrackerEditor.querySelector("#playerIqInput").value,
      ht: elements.playerTrackerEditor.querySelector("#playerHtInput").value,
      will: elements.playerTrackerEditor.querySelector("#playerWillInput").value,
      per: elements.playerTrackerEditor.querySelector("#playerPerInput").value,
      notes: elements.playerTrackerEditor.querySelector("#playerNotesInput").value,
    });
  });
  elements.playerTrackerEditor.querySelector("#deletePlayerBtn").addEventListener("click", () => actions.deletePlayer(selectedPlayer.id));

  elements.scenarioEditor.querySelector("#scenarioSearchInput").addEventListener("input", (event) => actions.setScenarioSearch(event.target.value));
  elements.scenarioEditor.querySelector("#scenarioDifficultyFilterInput").addEventListener("change", (event) => actions.setScenarioDifficultyFilter(event.target.value));
  elements.scenarioEditor.querySelector("#gmScenarioSelect").addEventListener("change", (event) => {
    if (event.target.value === "__new__") {
      actions.newScenarioDraft();
      return;
    }
    actions.selectScenario(event.target.value);
  });
  elements.scenarioEditor.querySelector("#newScenarioBtn").addEventListener("click", () => actions.newScenarioDraft());
  elements.scenarioEditor.querySelector("#saveScenarioBtn").addEventListener("click", () => {
    actions.saveScenario({
      sourceId: ui.scenarioDraft ? null : scenario.id,
      id: elements.scenarioEditor.querySelector("#scenarioIdInput").value,
      title: elements.scenarioEditor.querySelector("#scenarioTitleInput").value,
      objective: elements.scenarioEditor.querySelector("#scenarioObjectiveInput").value,
      act: elements.scenarioEditor.querySelector("#scenarioActInput").value,
      difficulty: elements.scenarioEditor.querySelector("#scenarioDifficultyInput").value,
      threat: elements.scenarioEditor.querySelector("#scenarioThreatInput").value,
      tags: elements.scenarioEditor.querySelector("#scenarioTagsInput").value,
      notes: elements.scenarioEditor.querySelector("#scenarioNotesInput").value,
    });
  });
  elements.scenarioEditor.querySelector("#deleteScenarioBtn").addEventListener("click", () => actions.deleteScenario(scenario.id));

  elements.encounterEditor.querySelector("#gmEncounterSelect").addEventListener("change", (event) => {
    if (event.target.value === "__new__") {
      actions.newEncounterDraft();
      return;
    }
    actions.selectEncounter(event.target.value);
  });
  elements.encounterEditor.querySelector("#newEncounterBtn").addEventListener("click", () => actions.newEncounterDraft());
  elements.encounterEditor.querySelector("#saveEncounterBtn").addEventListener("click", () => {
    actions.saveEncounter({
      sourceId: ui.encounterDraft ? null : encounter.id,
      id: elements.encounterEditor.querySelector("#encounterIdInput").value,
      title: elements.encounterEditor.querySelector("#encounterTitleInput").value,
      scenarioId: elements.encounterEditor.querySelector("#encounterScenarioInput").value,
      range: elements.encounterEditor.querySelector("#encounterRangeInput").value,
      threat: elements.encounterEditor.querySelector("#encounterThreatInput").value,
      difficulty: elements.encounterEditor.querySelector("#encounterDifficultyInput").value,
      creatureIds: Array.from(elements.encounterEditor.querySelector("#encounterCreatureLinksInput").selectedOptions).map((option) => option.value),
      composition: elements.encounterEditor.querySelector("#encounterCompositionInput").value,
      tactics: elements.encounterEditor.querySelector("#encounterTacticsInput").value,
      rewards: elements.encounterEditor.querySelector("#encounterRewardsInput").value,
    });
  });
  elements.encounterEditor.querySelector("#deleteEncounterBtn").addEventListener("click", () => actions.deleteEncounter(encounter.id));

  elements.creatureEditor.querySelector("#creatureSearchInput").addEventListener("input", (event) => actions.setCreatureSearch(event.target.value));
  elements.creatureEditor.querySelector("#creatureDifficultyFilterInput").addEventListener("change", (event) => actions.setCreatureDifficultyFilter(event.target.value));
  elements.creatureEditor.querySelector("#gmCreatureSelect").addEventListener("change", (event) => {
    if (event.target.value === "__new__") {
      actions.newCreatureDraft();
      return;
    }
    actions.selectCreature(event.target.value);
  });
  elements.creatureEditor.querySelector("#newCreatureBtn").addEventListener("click", () => actions.newCreatureDraft());
  elements.creatureEditor.querySelector("#saveCreatureBtn").addEventListener("click", () => {
    actions.saveCreature({
      sourceId: ui.creatureDraft ? null : creature.id,
      id: elements.creatureEditor.querySelector("#creatureIdInput").value,
      name: elements.creatureEditor.querySelector("#creatureNameInput").value,
      category: elements.creatureEditor.querySelector("#creatureCategoryInput").value,
      difficulty: elements.creatureEditor.querySelector("#creatureDifficultyInput").value,
      st: elements.creatureEditor.querySelector("#creatureStInput").value,
      dx: elements.creatureEditor.querySelector("#creatureDxInput").value,
      iq: elements.creatureEditor.querySelector("#creatureIqInput").value,
      ht: elements.creatureEditor.querySelector("#creatureHtInput").value,
      will: elements.creatureEditor.querySelector("#creatureWillInput").value,
      per: elements.creatureEditor.querySelector("#creaturePerInput").value,
      hp: elements.creatureEditor.querySelector("#creatureHpInput").value,
      fp: elements.creatureEditor.querySelector("#creatureFpInput").value,
      speed: elements.creatureEditor.querySelector("#creatureSpeedInput").value,
      move: elements.creatureEditor.querySelector("#creatureMoveInput").value,
      dr: elements.creatureEditor.querySelector("#creatureDrInput").value,
      attack: elements.creatureEditor.querySelector("#creatureAttackInput").value,
      damage: elements.creatureEditor.querySelector("#creatureDamageInput").value,
      tags: elements.creatureEditor.querySelector("#creatureTagsInput").value,
      traits: elements.creatureEditor.querySelector("#creatureTraitsInput").value,
      notes: elements.creatureEditor.querySelector("#creatureNotesInput").value,
    });
  });
  elements.creatureEditor.querySelector("#deleteCreatureBtn").addEventListener("click", () => actions.deleteCreature(creature.id));
  elements.creatureEditor.querySelector("#importCreatureCsvBtn").addEventListener("click", () => {
    actions.importCreaturesCsv(elements.creatureEditor.querySelector("#creatureCsvInput").value);
  });
  elements.creatureEditor.querySelector("#exportCreatureCsvBtn").addEventListener("click", () => {
    actions.exportCreaturesCsv();
  });
}