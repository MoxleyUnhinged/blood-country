"""Character model: point-buy accounting backed by the C engine."""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

from . import engine


# The source document says HP can be bought up from the 100 baseline but gives no
# price. This house-rule constant (+2 HP per character point) is easy to change.
HP_PER_POINT = 2


@dataclass
class Trait:
    name: str
    cost: int            # positive for advantages, negative for disadvantages


@dataclass
class Skill:
    name: str
    attribute: str       # "ST", "DX", "IQ", "CN", "PER", "WILL"
    difficulty: str      # Easy / Average / Hard / Very Hard
    relative: int = 0    # level relative to the controlling attribute


@dataclass
class Character:
    name: str = "New Character"
    concept: str = ""
    budget: int = 100
    disadvantage_cap: int = 50
    st: int = 10
    dx: int = 10
    iq: int = 10
    cn: int = 10
    hp_bonus: int = 0
    advantages: list[Trait] = field(default_factory=list)
    disadvantages: list[Trait] = field(default_factory=list)
    skills: list[Skill] = field(default_factory=list)

    # ---- derived stats -----------------------------------------------------
    def secondary(self) -> engine.SecondaryStats:
        return engine.secondary(self.st, self.dx, self.iq, self.cn, self.hp_bonus)

    def attribute_value(self, attr: str) -> int:
        sec = self.secondary()
        return {"ST": self.st, "DX": self.dx, "IQ": self.iq, "CN": self.cn,
                "HT": self.cn, "PER": sec.per, "WILL": sec.will}[attr.upper()]

    def skill_level(self, skill: Skill) -> int:
        return self.attribute_value(skill.attribute) + skill.relative

    # ---- point accounting --------------------------------------------------
    def attribute_points(self) -> int:
        return (engine.attribute_cost("ST", self.st) + engine.attribute_cost("DX", self.dx)
                + engine.attribute_cost("IQ", self.iq) + engine.attribute_cost("CN", self.cn)
                + self.hp_bonus // HP_PER_POINT)

    def skill_points(self) -> int:
        total = 0
        for s in self.skills:
            cost = engine.skill_cost(s.relative, s.difficulty)
            total += max(cost, 0)
        return total

    def advantage_points(self) -> int:
        return sum(t.cost for t in self.advantages)

    def disadvantage_points(self) -> int:
        return sum(t.cost for t in self.disadvantages)   # negative number

    def total_points(self) -> int:
        return (self.attribute_points() + self.advantage_points()
                + self.disadvantage_points() + self.skill_points())

    def validate(self) -> list[str]:
        problems = []
        if self.total_points() > self.budget:
            problems.append(f"Over budget: {self.total_points()} / {self.budget} points.")
        if -self.disadvantage_points() > self.disadvantage_cap:
            problems.append(f"Disadvantages exceed the cap of -{self.disadvantage_cap}.")
        for attr in ("st", "dx", "iq", "cn"):
            if getattr(self, attr) < 8:
                problems.append(f"{attr.upper()} below 8 usually needs GM approval.")
        for s in self.skills:
            if engine.skill_cost(s.relative, s.difficulty) < 0:
                problems.append(f"{s.name}: relative level {s.relative:+d} is not purchasable "
                                f"for a {s.difficulty} skill.")
        return problems

    # ---- persistence ---------------------------------------------------------
    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Character":
        data = dict(data)
        data["advantages"] = [Trait(**t) for t in data.get("advantages", [])]
        data["disadvantages"] = [Trait(**t) for t in data.get("disadvantages", [])]
        data["skills"] = [Skill(**s) for s in data.get("skills", [])]
        return cls(**data)

    def save(self, path: str | Path) -> None:
        Path(path).write_text(json.dumps(self.to_dict(), indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: str | Path) -> "Character":
        return cls.from_dict(json.loads(Path(path).read_text(encoding="utf-8")))
