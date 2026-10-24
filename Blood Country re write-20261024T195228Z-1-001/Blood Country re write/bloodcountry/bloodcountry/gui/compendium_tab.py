"""Creature compendium tab: browse, filter and send to the tracker."""
from PySide6.QtWidgets import (QWidget, QHBoxLayout, QVBoxLayout, QListWidget, QTextBrowser,
                               QComboBox, QLineEdit, QPushButton)

from .. import data


class CompendiumTab(QWidget):
    def __init__(self, on_send_to_tracker=None):
        super().__init__()
        self.on_send = on_send_to_tracker
        self.creatures = data.creatures()

        root = QHBoxLayout(self)
        left = QVBoxLayout(); root.addLayout(left, 1)
        self.search = QLineEdit(); self.search.setPlaceholderText("Search...")
        self.tier = QComboBox(); self.tier.addItems(["All tiers", "Common", "Uncommon", "Rare", "Exclusive"])
        self.list = QListWidget()
        self.send_btn = QPushButton("Add to tracker")
        left.addWidget(self.search); left.addWidget(self.tier)
        left.addWidget(self.list); left.addWidget(self.send_btn)

        self.view = QTextBrowser(); root.addWidget(self.view, 2)

        self.search.textChanged.connect(self.populate)
        self.tier.currentIndexChanged.connect(self.populate)
        self.list.currentRowChanged.connect(self.show_creature)
        self.send_btn.clicked.connect(self.send)
        self.populate()

    def populate(self):
        text = self.search.text().lower()
        tier = self.tier.currentText()
        self.visible = [c for c in self.creatures
                        if text in c["name"].lower()
                        and (tier == "All tiers" or c["tier"] == tier)]
        self.list.clear()
        for c in self.visible:
            self.list.addItem(f"{c['name']}  [{c['tier']}]")
        if self.visible:
            self.list.setCurrentRow(0)
        else:
            self.view.setHtml("<i>No matches.</i>")

    def show_creature(self, row):
        if not (0 <= row < len(self.visible)):
            return
        c = self.visible[row]
        attacks = "".join(
            f"<li>{a['name']}: {a['dice']}d{a['adds']:+d} {a['type']}</li>" for a in c["attacks"]
        ) or "<li><i>none (not a combat encounter)</i></li>"
        traits = "".join(f"<li>{t}</li>" for t in c["traits"])
        venom = ""
        if c.get("venom"):
            v = data.venoms()[c["venom"]]
            stages = "".join(f"<li>+{s['minutes']} min, HT{s['mod']:+d}: {s['effect']}</li>"
                             for s in v["stages"])
            venom = f"<h4>Venom ({v['name']}, antivenin: {v['antivenin']})</h4><ol>{stages}</ol>"
        self.view.setHtml(f"""
            <h2>{c['name']}</h2>
            <p><b>{c['tier']}</b> {c['category']} &mdash; {c['region']}</p>
            <p>ST {c['st']} DX {c['dx']} IQ {c['iq']} HT {c['ht']}<br>
               HP {c['hp']} Will {c['will']} Per {c['per']} FP {c['fp']}<br>
               Speed {c['speed']} Move {c['move']} SM {c['sm']:+d} DR {c['dr']}</p>
            <h4>Traits</h4><ul>{traits}</ul>
            <h4>Attacks</h4><ul>{attacks}</ul>
            {venom}
            <h4>GM notes</h4><p>{c['notes']}</p>""")

    def send(self):
        row = self.list.currentRow()
        if self.on_send and 0 <= row < len(self.visible):
            self.on_send(self.visible[row])
