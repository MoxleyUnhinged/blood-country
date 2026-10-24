"""Python-side tests for the ctypes bindings and models. Run: python -m pytest tests"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bloodcountry import data, engine, tracker
from bloodcountry.character import Character, Skill, Trait


def test_seed_is_reproducible():
    engine.seed(42); a = [engine.roll_3d6() for _ in range(20)]
    engine.seed(42); b = [engine.roll_3d6() for _ in range(20)]
    assert a == b


def test_check_always_rules():
    engine.seed(1)
    for _ in range(2000):
        r = engine.check(100)
        assert r.success == (r.roll < 17)


def test_frankie_dell_secondary_stats():
    s = engine.secondary(10, 12, 11, 12)
    assert (s.hp, s.will, s.per, s.fp) == (100, 11, 11, 12)
    assert (s.basic_speed, s.basic_move, s.dodge) == (6.0, 6, 9)


def test_skill_costs():
    assert [engine.skill_cost(r, "Average") for r in (-1, 0, 1, 2, 3)] == [1, 2, 4, 8, 12]
    assert engine.skill_cost(0, "Hard") == 4
    assert engine.skill_cost(-3, "Average") == -1


def test_character_points_and_roundtrip(tmp_path):
    c = Character(dx=12, iq=11, cn=12,
                  advantages=[Trait("Fit", 5)], disadvantages=[Trait("Bad Temper", -10)],
                  skills=[Skill("Mechanic", "IQ", "Average", 1)])
    # attrs 80 + adv 5 - dis 10 + skill 4
    assert c.total_points() == 79
    f = tmp_path / "c.json"; c.save(f)
    assert Character.load(f).total_points() == 79


def test_all_archetypes_load():
    for a in data.archetypes():
        assert data.character_from_archetype(a).secondary().hp == 100


def test_venom_and_tracker():
    engine.seed(7)
    c = tracker.from_creature(data.creatures()[1])
    lines = c.run_venom("eastern_brown", bandage=True)
    assert len(lines) == len(data.venoms()["eastern_brown"]["stages"]) + 1
    c.take_damage(5)
    assert c.hp == c.max_hp - 5


def test_fright_cumulative_stress():
    c = tracker.Combatant("Test", 100, 10, 10, 1)   # Will 1: nearly always fails
    for _ in range(5):
        c.fright(-5)
    assert c.fright_failures >= 3
