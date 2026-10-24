"""Character builder tab: point-buy with live cost accounting."""
from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QGroupBox, QSpinBox,
                               QPushButton, QLabel, QLineEdit, QFormLayout, QComboBox,
                               QTableWidget, QTableWidgetItem, QFileDialog, QMessageBox,
                               QHeaderView)

from .. import data, engine
from ..character import Character, Skill, Trait

ATTRS = ["ST", "DX", "IQ", "CN", "PER", "WILL"]
DIFFS = ["Easy", "Average", "Hard", "Very Hard"]


class BuilderTab(QWidget):
    def __init__(self, on_send_to_tracker=None):
        super().__init__()
        self.char = Character()
        self.on_send_to_tracker = on_send_to_tracker
        self._loading = False

        root = QHBoxLayout(self)
        left = QVBoxLayout(); root.addLayout(left, 1)
        right = QVBoxLayout(); root.addLayout(right, 2)

        # ---- left: identity, attributes, summary
        top = QGroupBox("Character"); f = QFormLayout(top)
        self.name = QLineEdit()
        self.arch = QComboBox(); self.arch.addItem("(blank)")
        self.arch.addItems([a["name"] for a in data.archetypes()])
        self.arch.activated.connect(self.apply_archetype)
        self.budget = QSpinBox(); self.budget.setRange(50, 300); self.budget.setValue(100)
        f.addRow("Name", self.name); f.addRow("Archetype", self.arch); f.addRow("Point budget", self.budget)
        left.addWidget(top)

        attrs = QGroupBox("Attributes (10 = average)"); af = QFormLayout(attrs)
        self.spins = {}
        for key, label in (("st", "ST (10/level)"), ("dx", "DX (20/level)"),
                           ("iq", "IQ (20/level)"), ("cn", "CN (10/level)")):
            sp = QSpinBox(); sp.setRange(1, 20); sp.setValue(10)
            sp.valueChanged.connect(self.refresh)
            self.spins[key] = sp; af.addRow(label, sp)
        self.hp_bonus = QSpinBox(); self.hp_bonus.setRange(0, 100); self.hp_bonus.setSingleStep(2)
        self.hp_bonus.valueChanged.connect(self.refresh)
        af.addRow("Extra HP (above 100)", self.hp_bonus)
        left.addWidget(attrs)

        self.summary = QLabel(); self.summary.setWordWrap(True)
        self.summary.setStyleSheet("font-family: monospace;")
        left.addWidget(self.summary)
        self.problems = QLabel(); self.problems.setWordWrap(True)
        self.problems.setStyleSheet("color: #c0392b;")
        left.addWidget(self.problems)

        btns = QHBoxLayout()
        for text, fn in (("Save...", self.save), ("Load...", self.load),
                         ("Send to tracker", self.send)):
            b = QPushButton(text); b.clicked.connect(fn); btns.addWidget(b)
        left.addLayout(btns); left.addStretch()
        self.name.textChanged.connect(self.refresh)
        self.budget.valueChanged.connect(self.refresh)

        # ---- right: traits and skills tables
        self.adv_table = self._table(["Advantage", "Cost"], "Add advantage", self.add_adv)
        self.dis_table = self._table(["Disadvantage", "Cost (negative)"], "Add disadvantage", self.add_dis)
        self.skill_table = self._table(["Skill", "Based on", "Difficulty", "Relative level"],
                                       "Add skill", self.add_skill)
        for title, (tbl, btn) in (("Advantages", self.adv_table), ("Disadvantages", self.dis_table),
                                  ("Skills", self.skill_table)):
            g = QGroupBox(title); v = QVBoxLayout(g); v.addWidget(tbl); v.addWidget(btn)
            right.addWidget(g)
            tbl.itemChanged.connect(self.refresh)

        self.refresh()

    def _table(self, headers, button_text, handler):
        t = QTableWidget(0, len(headers)); t.setHorizontalHeaderLabels(headers)
        t.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        b = QPushButton(button_text); b.clicked.connect(handler)
        return t, b

    # ---- row helpers
    def add_adv(self):
        self._add_row(self.adv_table[0], ["New advantage", "5"])

    def add_dis(self):
        self._add_row(self.dis_table[0], ["New disadvantage", "-5"])

    def add_skill(self):
        self._add_row(self.skill_table[0], ["New skill", "IQ", "Average", "0"])

    def _add_row(self, table, values):
        table.blockSignals(True)
        r = table.rowCount(); table.insertRow(r)
        for c, v in enumerate(values):
            table.setItem(r, c, QTableWidgetItem(v))
        table.blockSignals(False)
        self.refresh()

    # ---- model <-> widgets
    def _read_int(self, item, default=0):
        try:
            return int(item.text()) if item else default
        except ValueError:
            return default

    def read_character(self) -> Character:
        c = Character(name=self.name.text() or "Unnamed", budget=self.budget.value(),
                      st=self.spins["st"].value(), dx=self.spins["dx"].value(),
                      iq=self.spins["iq"].value(), cn=self.spins["cn"].value(),
                      hp_bonus=self.hp_bonus.value())
        concept = self.char.concept
        c.concept = concept
        t = self.adv_table[0]
        for r in range(t.rowCount()):
            c.advantages.append(Trait(t.item(r, 0).text(), abs(self._read_int(t.item(r, 1)))))
        t = self.dis_table[0]
        for r in range(t.rowCount()):
            c.disadvantages.append(Trait(t.item(r, 0).text(), -abs(self._read_int(t.item(r, 1)))))
        t = self.skill_table[0]
        for r in range(t.rowCount()):
            attr = t.item(r, 1).text().upper()
            diff = t.item(r, 2).text().title()
            if attr not in ATTRS:
                attr = "IQ"
            if diff not in DIFFS:
                diff = "Average"
            c.skills.append(Skill(t.item(r, 0).text(), attr, diff, self._read_int(t.item(r, 3))))
        return c

    def write_character(self, c: Character):
        self._loading = True
        self.char = c
        self.name.setText(c.name); self.budget.setValue(c.budget)
        for k in ("st", "dx", "iq", "cn"):
            self.spins[k].setValue(getattr(c, k))
        self.hp_bonus.setValue(c.hp_bonus)
        for table, rows in ((self.adv_table[0], [[t.name, str(t.cost)] for t in c.advantages]),
                            (self.dis_table[0], [[t.name, str(t.cost)] for t in c.disadvantages]),
                            (self.skill_table[0], [[s.name, s.attribute, s.difficulty, str(s.relative)]
                                                   for s in c.skills])):
            table.blockSignals(True); table.setRowCount(0)
            for vals in rows:
                r = table.rowCount(); table.insertRow(r)
                for col, v in enumerate(vals):
                    table.setItem(r, col, QTableWidgetItem(v))
            table.blockSignals(False)
        self._loading = False
        self.refresh()

    def apply_archetype(self, index):
        if index == 0:
            self.write_character(Character())
        else:
            arch = data.archetypes()[index - 1]
            self.write_character(data.character_from_archetype(arch, self.budget.value()))

    def refresh(self, *_):
        if self._loading:
            return
        c = self.read_character()
        sec = c.secondary()
        lines = [
            f"HP {sec.hp}  Will {sec.will}  Per {sec.per}  FP {sec.fp}",
            f"Speed {sec.basic_speed:.2f}  Move {sec.basic_move}  Dodge {sec.dodge}",
            "",
            f"Attributes    {c.attribute_points():>4}",
            f"Advantages    {c.advantage_points():>4}",
            f"Disadvantages {c.disadvantage_points():>4}",
            f"Skills        {c.skill_points():>4}",
            f"TOTAL         {c.total_points():>4} / {c.budget}",
            "",
        ]
        for s in c.skills:
            lines.append(f"{s.name}: {c.skill_level(s)} ({s.attribute}{s.relative:+d})")
        self.summary.setText("\n".join(lines))
        self.problems.setText("\n".join(c.validate()))

    # ---- actions
    def save(self):
        path, _ = QFileDialog.getSaveFileName(self, "Save character", "", "Character (*.json)")
        if path:
            self.read_character().save(path)

    def load(self):
        path, _ = QFileDialog.getOpenFileName(self, "Load character", "", "Character (*.json)")
        if path:
            try:
                self.write_character(Character.load(path))
            except Exception as exc:  # corrupt file, wrong schema...
                QMessageBox.warning(self, "Could not load", str(exc))

    def send(self):
        if self.on_send_to_tracker:
            self.on_send_to_tracker(self.read_character())
