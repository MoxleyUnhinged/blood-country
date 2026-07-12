import { getActiveScene } from "./campaign.js";

function roll3d6() {
  const dice = Array.from({ length: 3 }, () => 1 + Math.floor(Math.random() * 6));
  return { dice, total: dice.reduce((sum, die) => sum + die, 0) };
}

function criticalState(target, roll) {
  if (roll <= 4 || (roll === 5 && target >= 15) || (roll === 6 && target >= 16)) {
    return "Critical success";
  }
  if (roll >= 18 || (roll === 17 && target <= 15)) {
    return "Critical failure";
  }
  return null;
}

export function resolveCheck(draft, label, target, modifier = 0) {
  const effectiveTarget = Math.max(3, Math.min(18, Number(target) + Number(modifier)));
  const result = roll3d6();
  const critical = criticalState(effectiveTarget, result.total);
  const margin = Math.abs(effectiveTarget - result.total);
  const success = result.total <= effectiveTarget;
  const outcome = critical || `${success ? "Success" : "Failure"} by ${margin}`;

  draft.recentRolls.unshift({
    label,
    target: effectiveTarget,
    roll: result.total,
    outcome,
    dice: result.dice.join("/"),
  });
  draft.recentRolls = draft.recentRolls.slice(0, 8);
  draft.log.push(`${label}: rolled ${result.total} against ${effectiveTarget} (${outcome}).`);
  return { success, outcome };
}

export function renderEncounterPanels(state, elements) {
  elements.dashboardTitle.textContent = state.campaign.title;
  elements.trackerGrid.innerHTML = "";

  const trackers = [
    ["Threat", state.campaign.threat],
    ["Doom", state.campaign.doom],
    ["Omen", state.campaign.omen],
    ["Clues", state.campaign.clues],
  ];

  trackers.forEach(([label, value]) => {
    const card = document.createElement("article");
    card.className = "tracker-card";
    card.innerHTML = `<span class="label">${label}</span><div class="tracker-value">${value}</div>`;
    elements.trackerGrid.appendChild(card);
  });

  elements.partyList.innerHTML = "";
  state.party.forEach((member) => {
    const card = document.createElement("article");
    card.className = "party-card";
    card.innerHTML = `
      <strong>${member.name}</strong>
      <div class="meta-row">
        <span>${member.role}</span>
        <span>HP ${member.hp}</span>
        <span class="${member.stress >= 7 ? "bad" : "good"}">Stress ${member.stress}</span>
      </div>
    `;
    elements.partyList.appendChild(card);
  });

  elements.logList.innerHTML = "";
  state.log.slice().reverse().forEach((entry) => {
    const item = document.createElement("div");
    item.className = "log-entry";
    item.textContent = entry;
    elements.logList.appendChild(item);
  });

  const scene = getActiveScene(state);
  elements.sessionBadges.innerHTML = "";
  [`Scene ${scene.title}`, `Progress ${state.campaign.progress}%`, `Party ${state.party.length} investigators`].forEach((text) => {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = text;
    elements.sessionBadges.appendChild(badge);
  });

  elements.scenePulse.textContent = scene.summary;
  elements.threatInput.value = String(state.campaign.threat);
  elements.doomInput.value = String(state.campaign.doom);
  elements.omenInput.value = String(state.campaign.omen);

  elements.resolutionConsole.innerHTML = `
    <div class="editor-grid form-card">
      <label>Skill
        <select id="skillCheckSelect">
          ${Object.entries(state.character.skills)
            .map(([name, value]) => `<option value="${name}">${name} (${value})</option>`)
            .join("")}
        </select>
      </label>
      <label>Modifier
        <input type="number" id="skillModifierInput" value="0" min="-10" max="10" />
      </label>
      <label>Fright Modifier
        <input type="number" id="frightModifierInput" value="0" min="-10" max="10" />
      </label>
    </div>
    <div class="actions-inline">
      <button class="primary" id="rollSkillBtn">Roll Skill Check</button>
      <button class="secondary" id="rollFrightBtn">Roll Fright Check</button>
    </div>
    <div class="inventory-list">
      ${state.recentRolls
        .map(
          (entry) => `
            <article class="roll-card">
              <span class="label">${entry.label}</span>
              <div class="roll-result"><strong>${entry.roll}</strong> vs ${entry.target}</div>
              <div class="muted-copy">${entry.outcome}${entry.dice ? ` • dice ${entry.dice}` : ""}</div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

export function appendLog(draft, note) {
  if (!note) {
    return;
  }
  draft.log.push(`GM: ${note}`);
}
