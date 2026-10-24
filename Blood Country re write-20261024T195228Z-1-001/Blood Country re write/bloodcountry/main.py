"""Entry point: python main.py"""
import sys

from PySide6.QtWidgets import QApplication

from bloodcountry import engine
from bloodcountry.gui.main_window import MainWindow


def main() -> int:
    engine.seed(__import__("time").time_ns() & 0xFFFFFFFFFFFFFFFF)
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
