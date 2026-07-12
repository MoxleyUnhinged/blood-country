export function randomiseCharacterStress(draft) {
  draft.character.stress = Math.min(12, Math.max(0, Math.floor(Math.random() * 13)));
  draft.party[0].stress = draft.character.stress;
  draft.log.push(`${draft.character.name} steadies herself as the pressure shifts to ${draft.character.stress}.`);
}

function listToLines(items, includeSlot = false) {
  return items
    .map((item) => {
      if (includeSlot) {
        return `${item.name} | ${item.slot} | ${item.notes}`;
      }
      return `${item.name} | ${item.notes}`;
    })
    .join("\n");
}

export function renderCharacterPanel(state, elements, actions) {
  elements.characterName.textContent = `${state.character.name} — ${state.character.role}`;
  elements.attributeGrid.innerHTML = "";
  Object.entries(state.character.attributes).forEach(([name, value]) => {
    const card = document.createElement("div");
    card.className = "attribute-card";
    card.innerHTML = `<span class="label">${name}</span><strong>${value}</strong>`;
    elements.attributeGrid.appendChild(card);
  });

  elements.skillList.innerHTML = "";
  Object.entries(state.character.skills).forEach(([name, value]) => {
    const row = document.createElement("div");
    row.className = "skill-row";
    row.innerHTML = `<span>${name}</span><span>${value}</span>`;
    elements.skillList.appendChild(row);
  });

  elements.traitList.innerHTML = "";
  state.character.traits.forEach((trait) => {
    const item = document.createElement("span");
    item.className = "tag";
    item.textContent = trait;
    elements.traitList.appendChild(item);
  });

  elements.equipmentList.innerHTML = `
    <article class="inventory-card">
      <span class="label">Equipped</span>
      <div class="inventory-list">
        ${state.character.equipment
          .map(
            (item) => `
              <div class="inventory-item">
                <strong>${item.name}</strong>
                <div class="muted-copy">${item.slot}</div>
                <div class="muted-copy">${item.notes}</div>
              </div>
            `
          )
          .join("")}
      </div>
    </article>
    <article class="inventory-card">
      <span class="label">Pack</span>
      <div class="inventory-list">
        ${state.character.inventory
          .map(
            (item) => `
              <div class="inventory-item">
                <strong>${item.name}</strong>
                <div class="muted-copy">${item.notes}</div>
              </div>
            `
          )
          .join("")}
      </div>
    </article>
  `;

  elements.characterEditor.innerHTML = `
    <div class="editor-grid form-card">
      <label>Name<input type="text" data-character-field="name" value="${state.character.name}" /></label>
      <label>Role<input type="text" data-character-field="role" value="${state.character.role}" /></label>
      <label>HP<input type="number" min="0" max="30" data-character-field="hp" value="${state.character.hp}" /></label>
      <label>Fatigue<input type="number" min="0" max="30" data-character-field="fatigue" value="${state.character.fatigue}" /></label>
      <label>Stress<input type="number" min="0" max="12" data-character-field="stress" value="${state.character.stress}" /></label>
    </div>
    <div class="editor-grid compact form-card">
      ${Object.entries(state.character.attributes)
        .map(([name, value]) => `<label>${name}<input type="number" min="1" max="20" data-attribute-field="${name}" value="${value}" /></label>`)
        .join("")}
    </div>
    <div class="editor-grid compact form-card">
      ${Object.entries(state.character.skills)
        .map(([name, value]) => `<label>${name}<input type="number" min="0" max="24" data-skill-field="${name}" value="${value}" /></label>`)
        .join("")}
    </div>
    <label>Traits and Hooks<textarea id="traitsInput" rows="6">${state.character.traits.join("\n")}</textarea></label>
    <label>Equipped Items<textarea id="equipmentInput" rows="5">${listToLines(state.character.equipment, true)}</textarea></label>
    <label>Inventory Pack<textarea id="inventoryInput" rows="5">${listToLines(state.character.inventory, false)}</textarea></label>
    <label>Character Notes<textarea id="characterNotesInput" rows="6" placeholder="Track motivations, clues, or personal beats.">${state.character.notes || ""}</textarea></label>
    <div class="actions-inline">
      <button class="secondary" id="importCharacterNotesCsvBtn">Import Notes CSV</button>
      <button class="secondary" id="exportCharacterNotesCsvBtn">Export Notes CSV</button>
    </div>
    <input id="characterNotesCsvInput" type="file" accept=".csv,text/csv" class="hidden-input" />
    <p class="hint-copy">Edit traits one per line. Core character fields sync to the lead party member automatically.</p>
  `;

  elements.characterEditor.querySelectorAll("[data-character-field]").forEach((input) => {
    input.addEventListener("input", () => actions.updateCharacterField(input.dataset.characterField, input.value));
  });
  elements.characterEditor.querySelectorAll("[data-attribute-field]").forEach((input) => {
    input.addEventListener("input", () => actions.updateAttributeField(input.dataset.attributeField, input.value));
  });
  elements.characterEditor.querySelectorAll("[data-skill-field]").forEach((input) => {
    input.addEventListener("input", () => actions.updateSkillField(input.dataset.skillField, input.value));
  });
  elements.characterEditor.querySelector("#traitsInput").addEventListener("input", (event) => {
    actions.updateTraits(event.target.value);
  });
  elements.characterEditor.querySelector("#equipmentInput").addEventListener("input", (event) => {
    actions.updateEquipment(event.target.value);
  });
  elements.characterEditor.querySelector("#inventoryInput").addEventListener("input", (event) => {
    actions.updateInventory(event.target.value);
  });
  elements.characterEditor.querySelector("#characterNotesInput").addEventListener("input", (event) => {
    actions.updateCharacterNotes(event.target.value);
  });
  elements.characterEditor.querySelector("#importCharacterNotesCsvBtn").addEventListener("click", () => {
    elements.characterEditor.querySelector("#characterNotesCsvInput").click();
  });
  elements.characterEditor.querySelector("#exportCharacterNotesCsvBtn").addEventListener("click", () => {
    actions.exportCharacterNotesCsv();
  });
  elements.characterEditor.querySelector("#characterNotesCsvInput").addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }
    await actions.importCharacterNotesCsv(file);
    event.target.value = "";
  });
}
