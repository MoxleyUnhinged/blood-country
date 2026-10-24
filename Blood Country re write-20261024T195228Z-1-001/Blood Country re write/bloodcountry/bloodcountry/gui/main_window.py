"""Main window wiring the four tabs together."""
from PySide6.QtWidgets import QMainWindow, QTabWidget

from .builder_tab import BuilderTab
from .compendium_tab import CompendiumTab
from .roller_tab import RollerTab
from .tracker_tab import TrackerTab


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Blood Country - GURPS 4e Toolkit")
        self.resize(1100, 720)

        self.tabs = QTabWidget(); self.setCentralWidget(self.tabs)
        self.tracker = TrackerTab()
        self.builder = BuilderTab(on_send_to_tracker=self._char_to_tracker)
        self.compendium = CompendiumTab(on_send_to_tracker=self._creature_to_tracker)
        self.roller = RollerTab()

        self.tabs.addTab(self.builder, "Character Builder")
        self.tabs.addTab(self.compendium, "Compendium")
        self.tabs.addTab(self.tracker, "Encounter Tracker")
        self.tabs.addTab(self.roller, "Dice")

    def _char_to_tracker(self, ch):
        self.tracker.add_character(ch)
        self.tabs.setCurrentWidget(self.tracker)

    def _creature_to_tracker(self, creature):
        self.tracker.add_creature(creature)
        self.statusBar().showMessage(f"Added {creature['name']} to the tracker", 3000)
