from itertools import product
from collections import Counter

dist = Counter(sum(r) for r in product(range(1, 7), repeat=3))

def succeeds(roll, skill):
    if roll <= 4:  return True       # 3-4 always succeed
    if roll >= 18: return False      # 18 always fails
    return roll <= skill

def p_success(skill):
    return sum(c for r, c in dist.items() if succeeds(r, skill)) / 216

print(f"Skill 12: {p_success(12):.1%}")   # ~74%

