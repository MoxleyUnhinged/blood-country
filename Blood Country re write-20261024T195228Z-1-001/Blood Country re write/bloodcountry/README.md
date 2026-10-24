# Blood Country Toolkit

A GURPS 4e toolkit for the *Blood Country* / *Dead Frequency* horror campaign.
Learning project combining **C**, **Python** and a **Qt GUI**.

```
 PySide6 GUI  ──►  Python layer (models, data, tracker)  ──ctypes──►  C rules engine
 bloodcountry/gui   bloodcountry/*.py + data/*.json                    engine/bc_engine.c
```

## Run it

```bash
pip install PySide6 pytest
make            # builds build/libbc_engine.so (.dylib / .dll on mac / windows)
make test       # C unit tests
python -m pytest tests   # Python tests
python main.py  # launch the GUI
```
Windows without `make`: `gcc -shared -o build/bc_engine.dll engine/bc_engine.c` (or MinGW/MSYS2).

## What each layer teaches

| Layer | File(s) | Concepts |
|---|---|---|
| C engine | `engine/bc_engine.c/.h` | xoshiro256** PRNG, rejection sampling (unbiased dice), structs returned by value, arrays in/out, shared libraries, `-fPIC` |
| Bindings | `bloodcountry/engine.py` | `ctypes.Structure`, `argtypes`/`restype`, pointers and arrays, wrapping a C API in Pythonic dataclasses |
| Models | `character.py`, `tracker.py` | dataclasses, JSON persistence, validation, domain logic |
| Data | `data/*.json`, `data.py` | externalising content extracted from the campaign document |
| GUI | `bloodcountry/gui/` | Qt widgets, signals/slots, tables, tab wiring via callbacks |

## Rules implemented in C
- 3d6 success rolls: 3-4 always succeed, 17-18 always fail; critical success on 3-4, 5 (skill 15+), 6 (skill 16+) or margin 10+; critical failure on 18, 17 (skill 15 or less) or failing by 10+
- Quick contests, damage dice, attribute and skill point costs
- Secondary stats (HP baseline 100, Will/Per from IQ, FP from CN, Speed = (DX+CN)/4, Dodge = Move+3)
- Fright Checks (Basic Set fallback: margin of failure = minutes paralysed)
- Staged venom timelines with the pressure-bandage +2

## Judgement calls you should review
The source document is internally inconsistent in places. Decisions made, all easy to change:
- **CN vs HT**: the document uses CN (Conservation) as the fourth stat but sometimes writes HT. This project uses `CN` throughout.
- **HP purchase price**: not stated in the document. `HP_PER_POINT = 2` in `character.py`.
- **Skill costs** use the standard GURPS 4e table (Easy/Average/Hard/Very Hard). The example sheets in the document use a looser point count, so archetype totals will not match exactly.
- **Archetypes** convert the document's skill *levels* into relative levels roughly; they are starting points, not verified builds.
- **Wild Boar IQ**: document says 13 in one place, 4 in another; 4 used.
- **Brumby hooves** are `thr+3` in the document; approximated as 2d+3.
- Fright Check tables from GURPS Horror are not reproduced; the Basic Set fallback and the document's cumulative-stress thresholds (3 failures: Scared, 5: Psychological Stress) are used.

## Ideas to extend it
1. Add the remaining creatures (copy the JSON shape) and the Tier 2-8 oddities.
2. Move venom stage lookups or the compendium filter into C.
3. Scenario browser: parse the six scenarios into a scene-by-scene GM screen.
4. Initiative order using Basic Speed from `bc_secondary`.
5. Export a character sheet to PDF.
