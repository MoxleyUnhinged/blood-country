"""Dice and success-roll tab."""
from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QGroupBox, QSpinBox,
                               QPushButton, QLabel, QPlainTextEdit, QFormLayout)

from .. import engine


class RollerTab(QWidget):
    def __init__(self):
        super().__init__()
        layout = QVBoxLayout(self)

        # Success roll
        box = QGroupBox("Success roll (3d6, roll under)")
        form = QFormLayout(box)
        self.skill = QSpinBox(); self.skill.setRange(1, 30); self.skill.setValue(12)
        self.mod = QSpinBox(); self.mod.setRange(-20, 20)
        btn = QPushButton("Roll 3d6")
        btn.clicked.connect(self.do_check)
        form.addRow("Effective skill / attribute", self.skill)
        form.addRow("Modifier", self.mod)
        form.addRow(btn)
        layout.addWidget(box)

        # Quick contest
        box2 = QGroupBox("Quick contest")
        row = QHBoxLayout(box2)
        self.ca = QSpinBox(); self.ca.setRange(1, 30); self.ca.setValue(12)
        self.cb = QSpinBox(); self.cb.setRange(1, 30); self.cb.setValue(12)
        btn2 = QPushButton("Contest")
        btn2.clicked.connect(self.do_contest)
        row.addWidget(QLabel("A")); row.addWidget(self.ca)
        row.addWidget(QLabel("B")); row.addWidget(self.cb)
        row.addWidget(btn2)
        layout.addWidget(box2)

        # Damage dice
        box3 = QGroupBox("Damage / generic dice (NdS + adds)")
        row3 = QHBoxLayout(box3)
        self.n = QSpinBox(); self.n.setRange(1, 20); self.n.setValue(2)
        self.sides = QSpinBox(); self.sides.setRange(2, 100); self.sides.setValue(6)
        self.adds = QSpinBox(); self.adds.setRange(-20, 20)
        btn3 = QPushButton("Roll")
        btn3.clicked.connect(self.do_dice)
        for label, w in (("Dice", self.n), ("Sides", self.sides), ("Adds", self.adds)):
            row3.addWidget(QLabel(label)); row3.addWidget(w)
        row3.addWidget(btn3)
        layout.addWidget(box3)

        self.output = QPlainTextEdit(); self.output.setReadOnly(True)
        layout.addWidget(self.output)

    def say(self, text: str) -> None:
        self.output.appendPlainText(text)

    def do_check(self):
        r = engine.check(self.skill.value(), self.mod.value())
        self.say(f"Rolled {r.roll} vs {r.target}: {r.outcome_name} (margin {r.margin:+d})")

    def do_contest(self):
        winner, a, b = engine.quick_contest(self.ca.value(), self.cb.value())
        who = {1: "A wins", -1: "B wins", 0: "Tie"}[winner]
        self.say(f"A: {a.roll} vs {a.target} ({a.outcome_name}) | "
                 f"B: {b.roll} vs {b.target} ({b.outcome_name}) -> {who}")

    def do_dice(self):
        n, s, a = self.n.value(), self.sides.value(), self.adds.value()
        total = engine.roll_dice(n, s) + a
        self.say(f"{n}d{s}{a:+d} = {total}")
