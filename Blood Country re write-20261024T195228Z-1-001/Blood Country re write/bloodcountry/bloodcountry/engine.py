"""ctypes bindings for the C rules engine (build/libbc_engine.*)."""
from __future__ import annotations

import ctypes as C
import platform
import sys
from dataclasses import dataclass
from pathlib import Path

# Outcome codes (mirror bc_engine.h)
CRIT_FAILURE, FAILURE, SUCCESS, CRIT_SUCCESS = 0, 1, 2, 3
OUTCOME_NAMES = {0: "Critical Failure", 1: "Failure", 2: "Success", 3: "Critical Success"}

ATTR_IDS = {"ST": 0, "DX": 1, "IQ": 2, "CN": 3}
DIFFICULTY_IDS = {"Easy": 0, "Average": 1, "Hard": 2, "Very Hard": 3}


class _Check(C.Structure):
    _fields_ = [("roll", C.c_int), ("target", C.c_int),
                ("margin", C.c_int), ("outcome", C.c_int)]


class _Secondary(C.Structure):
    _fields_ = [("st", C.c_int), ("dx", C.c_int), ("iq", C.c_int), ("cn", C.c_int),
                ("hp", C.c_int), ("will", C.c_int), ("per", C.c_int), ("fp", C.c_int),
                ("basic_speed", C.c_double), ("basic_move", C.c_int), ("dodge", C.c_int)]


class _Fright(C.Structure):
    _fields_ = [("roll", C.c_int), ("target", C.c_int),
                ("margin_of_failure", C.c_int), ("failed", C.c_int),
                ("paralysis_minutes", C.c_int)]


@dataclass(frozen=True)
class CheckResult:
    roll: int
    target: int
    margin: int
    outcome: int

    @property
    def success(self) -> bool:
        return self.outcome >= SUCCESS

    @property
    def outcome_name(self) -> str:
        return OUTCOME_NAMES[self.outcome]


@dataclass(frozen=True)
class SecondaryStats:
    hp: int
    will: int
    per: int
    fp: int
    basic_speed: float
    basic_move: int
    dodge: int


@dataclass(frozen=True)
class FrightResult:
    roll: int
    target: int
    failed: bool
    margin_of_failure: int
    paralysis_minutes: int


def _lib_name() -> str:
    system = platform.system()
    if system == "Windows":
        return "bc_engine.dll"
    if system == "Darwin":
        return "libbc_engine.dylib"
    return "libbc_engine.so"


def _load() -> C.CDLL:
    root = Path(__file__).resolve().parent.parent
    path = root / "build" / _lib_name()
    if not path.exists():
        sys.exit(f"C engine not built ({path}). Run `make` in {root} first.")
    lib = C.CDLL(str(path))

    lib.bc_seed.argtypes = [C.c_uint64]
    lib.bc_seed.restype = None
    lib.bc_roll_dice.argtypes = [C.c_int, C.c_int]
    lib.bc_roll_dice.restype = C.c_int
    lib.bc_roll_3d6.argtypes = []
    lib.bc_roll_3d6.restype = C.c_int
    lib.bc_damage.argtypes = [C.c_int, C.c_int]
    lib.bc_damage.restype = C.c_int
    lib.bc_check.argtypes = [C.c_int, C.c_int]
    lib.bc_check.restype = _Check
    lib.bc_quick_contest.argtypes = [C.c_int, C.c_int, C.POINTER(_Check), C.POINTER(_Check)]
    lib.bc_quick_contest.restype = C.c_int
    lib.bc_attribute_cost.argtypes = [C.c_int, C.c_int]
    lib.bc_attribute_cost.restype = C.c_int
    lib.bc_skill_cost.argtypes = [C.c_int, C.c_int]
    lib.bc_skill_cost.restype = C.c_int
    lib.bc_secondary.argtypes = [C.c_int] * 5
    lib.bc_secondary.restype = _Secondary
    lib.bc_fright_check.argtypes = [C.c_int, C.c_int]
    lib.bc_fright_check.restype = _Fright
    lib.bc_venom_run.argtypes = [C.c_int, C.c_int, C.POINTER(C.c_int), C.c_int,
                                 C.POINTER(C.c_int), C.POINTER(C.c_int)]
    lib.bc_venom_run.restype = C.c_int
    return lib


_lib = _load()


# ---- friendly wrappers -------------------------------------------------------
def seed(value: int) -> None:
    _lib.bc_seed(value)


def roll_dice(count: int, sides: int) -> int:
    return _lib.bc_roll_dice(count, sides)


def roll_3d6() -> int:
    return _lib.bc_roll_3d6()


def damage(dice: int, adds: int = 0) -> int:
    return _lib.bc_damage(dice, adds)


def check(skill: int, modifier: int = 0) -> CheckResult:
    c = _lib.bc_check(skill, modifier)
    return CheckResult(c.roll, c.target, c.margin, c.outcome)


def quick_contest(skill_a: int, skill_b: int) -> tuple[int, CheckResult, CheckResult]:
    a, b = _Check(), _Check()
    winner = _lib.bc_quick_contest(skill_a, skill_b, C.byref(a), C.byref(b))
    return (winner,
            CheckResult(a.roll, a.target, a.margin, a.outcome),
            CheckResult(b.roll, b.target, b.margin, b.outcome))


def attribute_cost(attr: str, level: int) -> int:
    return _lib.bc_attribute_cost(ATTR_IDS[attr], level)


def skill_cost(relative_level: int, difficulty: str) -> int:
    """Points needed for the given relative level; -1 if not purchasable."""
    return _lib.bc_skill_cost(relative_level, DIFFICULTY_IDS[difficulty])


def secondary(st: int, dx: int, iq: int, cn: int, hp_bonus: int = 0) -> SecondaryStats:
    s = _lib.bc_secondary(st, dx, iq, cn, hp_bonus)
    return SecondaryStats(s.hp, s.will, s.per, s.fp, s.basic_speed, s.basic_move, s.dodge)


def fright_check(will: int, modifier: int = 0) -> FrightResult:
    f = _lib.bc_fright_check(will, modifier)
    return FrightResult(f.roll, f.target, bool(f.failed),
                        f.margin_of_failure, f.paralysis_minutes)


def venom_run(ht: int, stage_mods: list[int], bandage: bool = False
              ) -> tuple[int, list[tuple[int, int]]]:
    """Returns (failure_count, [(roll, outcome) per stage])."""
    n = len(stage_mods)
    if n == 0:
        return 0, []
    mods = (C.c_int * n)(*stage_mods)
    rolls = (C.c_int * n)()
    outs = (C.c_int * n)()
    fails = _lib.bc_venom_run(ht, 2 if bandage else 0, mods, n, rolls, outs)
    return fails, list(zip(rolls, outs))
