export function safeSceneId(value, fallback = "scene") {
  const cleaned = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || fallback;
}

export function getActiveScene(state) {
  return state.campaign.scenes.find((scene) => scene.id === state.campaign.activeSceneId) || state.campaign.scenes[0];
}

export function advanceScene(draft) {
  const currentIndex = draft.campaign.scenes.findIndex((scene) => scene.id === draft.campaign.activeSceneId);
  const nextIndex = (currentIndex + 1) % draft.campaign.scenes.length;
  draft.campaign.scenes = draft.campaign.scenes.map((scene, index) => {
    if (index === currentIndex && scene.status === "active") {
      return { ...scene, status: "cleared", progress: 100 };
    }
    if (index === nextIndex) {
      return { ...scene, status: "active", progress: Math.max(scene.progress, 15) };
    }
    return scene;
  });
  draft.campaign.activeSceneId = draft.campaign.scenes[nextIndex].id;
  draft.campaign.progress = Math.min(100, draft.campaign.progress + 12);
  draft.log.push(`The focus shifts to ${draft.campaign.scenes[nextIndex].title}.`);
}

export function renderCampaignPanel(state, elements, ui, actions) {
  elements.campaignPercent.textContent = `${state.campaign.progress}%`;
  elements.campaignBar.style.width = `${state.campaign.progress}%`;
  elements.sceneBoard.innerHTML = "";

  state.campaign.scenes.forEach((scene) => {
    const card = document.createElement("article");
    const active = scene.id === state.campaign.activeSceneId;
    card.className = `scene-card ${scene.status} ${active ? "active" : ""}`;
    card.innerHTML = `
      <span class="scene-status">${scene.status}</span>
      <h3>${scene.title}</h3>
      <p class="scene-copy">${scene.summary}</p>
      <div class="meta-row">
        <span>Progress ${scene.progress}%</span>
        ${active ? "<span>Active Scene</span>" : ""}
      </div>
    `;
    card.addEventListener("click", () => actions.selectScene(scene.id));
    elements.sceneBoard.appendChild(card);
  });

  const selectedScene =
    ui.sceneDraft || state.campaign.scenes.find((scene) => scene.id === ui.selectedSceneId) || getActiveScene(state);
  elements.campaignEditor.innerHTML = `
    <div class="editor-grid compact form-card">
      <label>Title<input type="text" data-campaign-field="title" value="${state.campaign.title}" /></label>
      <label>Progress<input type="number" min="0" max="100" data-campaign-field="progress" value="${state.campaign.progress}" /></label>
      <label>Clues<input type="number" min="0" max="99" data-campaign-field="clues" value="${state.campaign.clues}" /></label>
      <label>Threat<input type="number" min="0" max="20" data-campaign-field="threat" value="${state.campaign.threat}" /></label>
      <label>Doom<input type="number" min="0" max="20" data-campaign-field="doom" value="${state.campaign.doom}" /></label>
      <label>Omen<input type="number" min="0" max="12" data-campaign-field="omen" value="${state.campaign.omen}" /></label>
    </div>
    <p class="hint-copy">Click any scene card to load it into the scene editor.</p>
  `;

  elements.sceneEditor.innerHTML = `
    <div class="editor-stack">
      <label>Selected Scene
        <select id="sceneSelect">
          <option value="__new__" ${ui.sceneDraft ? "selected" : ""}>New Scene Draft</option>
          ${state.campaign.scenes
            .map((scene) => `<option value="${scene.id}" ${!ui.sceneDraft && scene.id === selectedScene.id ? "selected" : ""}>${scene.title}</option>`)
            .join("")}
        </select>
      </label>
      <div class="editor-grid form-card">
        <label>Scene ID<input type="text" id="sceneIdInput" value="${selectedScene.id}" /></label>
        <label>Scene Title<input type="text" id="sceneTitleInput" value="${selectedScene.title}" /></label>
        <label>Status
          <select id="sceneStatusInput">
            ${["planned", "active", "cleared", "failed"]
              .map((status) => `<option value="${status}" ${status === selectedScene.status ? "selected" : ""}>${status}</option>`)
              .join("")}
          </select>
        </label>
        <label>Progress<input type="number" min="0" max="100" id="sceneProgressInput" value="${selectedScene.progress}" /></label>
      </div>
      <label>Summary<textarea id="sceneSummaryInput" rows="5">${selectedScene.summary}</textarea></label>
      <div class="actions-inline">
        <button class="secondary" id="newSceneBtn">New Scene Draft</button>
        <button class="primary" id="saveSceneBtn">Save Scene</button>
        <button class="secondary" id="deleteSceneBtn">Delete Scene</button>
      </div>
    </div>
  `;

  elements.campaignEditor.querySelectorAll("[data-campaign-field]").forEach((input) => {
    input.addEventListener("input", () => {
      actions.updateCampaignField(input.dataset.campaignField, input.value);
    });
  });

  elements.sceneEditor.querySelector("#sceneSelect").addEventListener("change", (event) => {
    if (event.target.value === "__new__") {
      actions.newSceneDraft();
      return;
    }
    actions.selectScene(event.target.value);
  });

  elements.sceneEditor.querySelector("#newSceneBtn").addEventListener("click", () => actions.newSceneDraft());
  elements.sceneEditor.querySelector("#saveSceneBtn").addEventListener("click", () => {
    actions.saveScene({
      sourceId: selectedScene.id,
      id: elements.sceneEditor.querySelector("#sceneIdInput").value,
      title: elements.sceneEditor.querySelector("#sceneTitleInput").value,
      status: elements.sceneEditor.querySelector("#sceneStatusInput").value,
      progress: elements.sceneEditor.querySelector("#sceneProgressInput").value,
      summary: elements.sceneEditor.querySelector("#sceneSummaryInput").value,
    });
  });
  elements.sceneEditor.querySelector("#deleteSceneBtn").addEventListener("click", () => actions.deleteScene(selectedScene.id));
}
