"""Loads the JSON data files extracted from the campaign document."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from .character import Character, Skill, Trait

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@lru_cache(maxsize=None)
def _read(name: str):
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def creatures() -> list[dict]:
    return _read("creatures.json")


def venoms() -> dict:
    return _read("venoms.json")


def archetypes() -> list[dict]:
    return _read("archetypes.json")


def character_from_archetype(arch: dict, budget: int = 100) -> Character:
    """Build a Character from an archetype template."""
    return Character(
        name=f"New {arch['name']}", concept=arch["concept"], budget=budget,
        st=arch["st"], dx=arch["dx"], iq=arch["iq"], cn=arch["cn"],
        advantages=[Trait(n, c) for n, c in arch["advantages"]],
        disadvantages=[Trait(n, c) for n, c in arch["disadvantages"]],
        skills=[Skill(n, a, d, r) for n, a, d, r in arch["skills"]],
    )
