"""Encounter tracker tab: HP/FP, damage, Fright Checks, venom timelines."""
from PySide6.QtWidgets import (QWidget, QHBoxLayout, QVBoxLayout, QTableWidget, QTableWidgetItem,
                               QPushButton, QSpinBox, QComboBox, QCheckBox, QPlainTextEdit,
                               QGroupBox, QFormLayout, QLabel, QHeaderView, QAbstractItemView)

from .. import data, engine, tracker


class TrackerTab(QWidget):
    COLS = ["Name", "HP", "FP", "Will", "Fright fails", "Status"]

    def __init__(self):
        super().__init__()
        self.combatants: list[tracker.Combatant] = []

        root = QHBoxLayout(self)
        left = QVBoxLayout(); root.addLayout(left, 3)
        self.table = QTableWidget(0, len(self.COLS))
        self.table.setHorizontalHeaderLabels(self.COLS)
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        left.addWidget(self.table)
        self.log = QPlainTextEdit(); self.log.setReadOnly(True)
        left.addWidget(self.log)

        right = QVBoxLayout(); root.addLayout(right, 2)

        dmg = QGroupBox("Damage / healing"); f = QFormLayout(dmg)
        self.amount = QSpinBox(); self.amount.setRange(0, 999); self.amount.setValue(5)
        row = QHBoxLayout()
        for text, fn in (("Damage", self.damage), ("Heal", self.heal), ("-FP", self.lose_fp)):
            b = QPushButton(text); b.clicked.connect(fn); row.addWidget(b)
        f.addRow("Amount", self.amount); f.addRow(row)
        dice = QHBoxLayout()
        self.dice_n = QSpinBox(); self.dice_n.setRange(0, 20); self.dice_n.setValue(1)
        self.dice_adds = QSpinBox(); self.dice_adds.setRange(-20, 20)
        roll = QPushButton("Roll damage dice and apply"); roll.clicked.connect(self.roll_damage)
        dice.addWidget(QLabel("Nd6")); dice.addWidget(self.dice_n)
        dice.addWidget(QLabel("+")); dice.addWidget(self.dice_adds)
        f.addRow(dice); f.addRow(roll)
        right.addWidget(dmg)

        fr = QGroupBox("Fright Check"); ff = QFormLayout(fr)
        self.fr_mod = QSpinBox(); self.fr_mod.setRange(-10, 5); self.fr_mod.setValue(-2)
        b = QPushButton("Roll Fright Check"); b.clicked.connect(self.fright)
        ff.addRow("Modifier", self.fr_mod); ff.addRow(b)
        right.addWidget(fr)

        vn = QGroupBox("Venom timeline"); vf = QFormLayout(vn)
        self.venom = QComboBox()
        for key, v in data.venoms().items():
            self.venom.addItem(v["name"], key)
        self.bandage = QCheckBox("Pressure bandage applied (+2)")
        vb = QPushButton("Run venom progression"); vb.clicked.connect(self.run_venom)
        vf.addRow("Venom", self.venom); vf.addRow(self.bandage); vf.addRow(vb)
        right.addWidget(vn)

        rm = QPushButton("Remove selected"); rm.clicked.connect(self.remove)
        right.addWidget(rm); right.addStretch()

    # ---- adding
    def add_combatant(self, c: tracker.Combatant):
        # De-duplicate names so the log is unambiguous
        base, n = c.name, 2
        while any(x.name == c.name for x in self.combatants):
            c.name = f"{base} {n}"; n += 1
        self.combatants.append(c)
        self.refresh()

    def add_creature(self, creature: dict):
        self.add_combatant(tracker.from_creature(creature))

    def add_character(self, ch):
        self.add_combatant(tracker.from_character(ch))

    # ---- helpers
    def selected(self):
        rows = self.table.selectionModel().selectedRows()
        if not rows:
            self.log.appendPlainText("(select a combatant first)")
            return None
        return self.combatants[rows[0].row()]

    def refresh(self):
        sel = self.table.currentRow()
        self.table.setRowCount(len(self.combatants))
        for r, c in enumerate(self.combatants):
            vals = [c.name, f"{c.hp}/{c.max_hp}", f"{c.fp}/{c.max_fp}", str(c.effective_will),
                    str(c.fright_failures), c.status()]
            for col, v in enumerate(vals):
                self.table.setItem(r, col, QTableWidgetItem(v))
        if 0 <= sel < len(self.combatants):
            self.table.selectRow(sel)

    def say(self, c, text):
        self.log.appendPlainText(f"[{c.name}] {text}")

    # ---- actions
    def damage(self):
        if c := self.selected():
            c.take_damage(self.amount.value()); self.say(c, c.log[-1]); self.refresh()

    def heal(self):
        if c := self.selected():
            c.heal(self.amount.value()); self.say(c, c.log[-1]); self.refresh()

    def lose_fp(self):
        if c := self.selected():
            c.lose_fp(self.amount.value()); self.say(c, c.log[-1]); self.refresh()

    def roll_damage(self):
        if c := self.selected():
            n, adds = self.dice_n.value(), self.dice_adds.value()
            dmg = engine.damage(n, adds)
            c.take_damage(dmg)
            self.say(c, f"{n}d6{adds:+d} = {dmg}. {c.log[-1]}")
            self.refresh()

    def fright(self):
        if c := self.selected():
            c.fright(self.fr_mod.value()); self.say(c, c.log[-1]); self.refresh()

    def run_venom(self):
        if c := self.selected():
            lines = c.run_venom(self.venom.currentData(), self.bandage.isChecked())
            self.say(c, f"{self.venom.currentText()} venom (HT {c.ht}):")
            for line in lines:
                self.log.appendPlainText("    " + line)

    def remove(self):
        if c := self.selected():
            self.combatants.remove(c); self.refresh()
