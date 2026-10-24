"""Encounter tracker state: combatants, damage, stress tracking (no GUI code)."""
from __future__ import annotations

from dataclasses import dataclass, field

from . import engine, data


@dataclass
class Combatant:
    name: str
    max_hp: int
    max_fp: int
    ht: int
    will: int
    hp: int = 0
    fp: int = 0
    fright_failures: int = 0
    permanent_will_loss: int = 0
    log: list[str] = field(default_factory=list)

    def __post_init__(self):
        self.hp = self.hp or self.max_hp
        self.fp = self.fp or self.max_fp

    @property
    def effective_will(self) -> int:
        return self.will - self.permanent_will_loss

    def take_damage(self, amount: int) -> None:
        self.hp -= amount
        self.log.append(f"Took {amount} damage ({self.hp}/{self.max_hp} HP)")

    def lose_fp(self, amount: int) -> None:
        self.fp = max(self.fp - amount, 0)
        self.log.append(f"Lost {amount} FP ({self.fp}/{self.max_fp} FP)")

    def heal(self, amount: int) -> None:
        self.hp = min(self.hp + amount, self.max_hp)
        self.log.append(f"Healed {amount} ({self.hp}/{self.max_hp} HP)")

    def status(self) -> str:
        if self.hp <= -self.max_hp:
            return "Dead"
        if self.hp <= 0:
            return "Collapsing"
        if self.hp < self.max_hp // 3:
            return "Badly hurt"
        return "OK"

    def fright(self, modifier: int) -> engine.FrightResult:
        """Roll a Fright Check and apply the appendix's cumulative stress rules."""
        result = engine.fright_check(self.effective_will, modifier)
        if result.failed:
            self.fright_failures += 1
            msg = (f"Fright Check FAILED ({result.roll} vs {result.target}): "
                   f"paralysed {result.paralysis_minutes} min, then -1 to all actions this scene")
            if self.fright_failures == 3:
                msg += " | 3 failures: gains Scared (-1 Will in dark/enclosed spaces)"
            elif self.fright_failures == 5:
                msg += " | 5 failures: GM rolls on the Psychological Stress table"
        else:
            msg = f"Fright Check passed ({result.roll} vs {result.target})"
        self.log.append(msg)
        return result

    def run_venom(self, venom_key: str, bandage: bool) -> list[str]:
        venom = data.venoms()[venom_key]
        mods = [s["mod"] for s in venom["stages"]]
        fails, results = engine.venom_run(self.ht, mods, bandage)
        lines = []
        for stage, (roll, outcome) in zip(venom["stages"], results):
            ok = outcome >= engine.SUCCESS
            tag = "resisted" if ok else "FAILED"
            suffix = "" if ok else f" -> {stage['effect']}"
            lines.append(f"+{stage['minutes']} min HT{stage['mod']:+d}: rolled {roll} [{tag}]{suffix}")
        lines.append(f"{fails} of {len(results)} stages failed" +
                     ("" if bandage else " (no pressure bandage)"))
        self.log.extend(lines)
        return lines


def from_creature(c: dict) -> Combatant:
    return Combatant(name=c["name"], max_hp=c["hp"], max_fp=max(c["fp"], 1),
                     ht=c["ht"], will=max(c["will"], 1))


def from_character(ch) -> Combatant:
    sec = ch.secondary()
    return Combatant(name=ch.name, max_hp=sec.hp, max_fp=sec.fp, ht=ch.cn, will=sec.will)
