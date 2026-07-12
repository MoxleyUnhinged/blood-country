export function renderLorePanel(state, elements, ui, actions) {
  const filterTypes = ["All", ...new Set(state.lore.map((item) => item.type))];
  elements.loreFilters.innerHTML = "";
  filterTypes.forEach((type) => {
    const button = document.createElement("button");
    button.className = type === ui.loreFilter ? "primary" : "secondary";
    button.textContent = type;
    button.addEventListener("click", () => actions.setLoreFilter(type));
    elements.loreFilters.appendChild(button);
  });

  elements.loreGrid.innerHTML = "";
  state.lore
    .filter((item) => ui.loreFilter === "All" || item.type === ui.loreFilter)
    .forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "lore-card";
      card.innerHTML = `
        <span class="lore-type">${item.type}</span>
        <h3>${item.title}</h3>
        <p class="lore-copy">${item.summary}</p>
      `;
      card.addEventListener("click", () => actions.selectLore(index));
      elements.loreGrid.appendChild(card);
    });

  const selectedIndex = Number.isInteger(ui.selectedLoreIndex) ? ui.selectedLoreIndex : 0;
  const selectedLore = ui.loreDraft || state.lore[selectedIndex] || { title: "", type: "Entity", summary: "" };
  elements.loreEditor.innerHTML = `
    <div class="editor-stack">
      <label>Selected Entry
        <select id="loreSelect">
          <option value="__new__" ${ui.loreDraft ? "selected" : ""}>New Lore Draft</option>
          ${state.lore.map((item, index) => `<option value="${index}" ${!ui.loreDraft && index === selectedIndex ? "selected" : ""}>${item.title}</option>`).join("")}
        </select>
      </label>
      <div class="editor-grid form-card">
        <label>Title<input type="text" id="loreTitleInput" value="${selectedLore.title}" /></label>
        <label>Type<input type="text" id="loreTypeInput" value="${selectedLore.type}" /></label>
      </div>
      <label>Summary<textarea id="loreSummaryInput" rows="5">${selectedLore.summary}</textarea></label>
      <div class="actions-inline">
        <button class="secondary" id="newLoreBtn">New Entry Draft</button>
        <button class="primary" id="saveLoreBtn">Save Entry</button>
        <button class="secondary" id="deleteLoreBtn">Delete Entry</button>
      </div>
    </div>
  `;

  elements.loreEditor.querySelector("#loreSelect").addEventListener("change", (event) => {
    if (event.target.value === "__new__") {
      actions.newLoreDraft();
      return;
    }
    actions.selectLore(Number(event.target.value));
  });
  elements.loreEditor.querySelector("#newLoreBtn").addEventListener("click", () => actions.newLoreDraft());
  elements.loreEditor.querySelector("#saveLoreBtn").addEventListener("click", () => {
    actions.saveLore({
      index: Number.isInteger(ui.selectedLoreIndex) ? ui.selectedLoreIndex : null,
      title: elements.loreEditor.querySelector("#loreTitleInput").value,
      type: elements.loreEditor.querySelector("#loreTypeInput").value,
      summary: elements.loreEditor.querySelector("#loreSummaryInput").value,
    });
  });
  elements.loreEditor.querySelector("#deleteLoreBtn").addEventListener("click", () => actions.deleteLore(selectedIndex));
}
