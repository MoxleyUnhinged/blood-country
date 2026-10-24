/* bc_engine.c - implementation of the Blood Country rules engine. */
#include "bc_engine.h"

/* ---- PRNG: xoshiro256** seeded through splitmix64 ----------------------- */
static uint64_t s[4] = { 0x9E3779B97F4A7C15ULL, 0xBF58476D1CE4E5B9ULL,
                         0x94D049BB133111EBULL, 0x2545F4914F6CDD1DULL };

static uint64_t splitmix64(uint64_t *x)
{
    uint64_t z = (*x += 0x9E3779B97F4A7C15ULL);
    z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
    z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
    return z ^ (z >> 31);
}

static uint64_t rotl(uint64_t x, int k) { return (x << k) | (x >> (64 - k)); }

static uint64_t next_u64(void)
{
    uint64_t result = rotl(s[1] * 5, 7) * 9;
    uint64_t t = s[1] << 17;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl(s[3], 45);
    return result;
}

void bc_seed(uint64_t seed)
{
    for (int i = 0; i < 4; i++) s[i] = splitmix64(&seed);
}

/* Unbiased integer in [0, bound) using rejection sampling. */
static uint32_t rand_below(uint32_t bound)
{
    uint32_t threshold = (uint32_t)(-bound) % bound;
    for (;;) {
        uint32_t r = (uint32_t)(next_u64() >> 32);
        if (r >= threshold) return r % bound;
    }
}

int bc_roll_dice(int count, int sides)
{
    int total = 0;
    if (count <= 0 || sides <= 0) return 0;
    for (int i = 0; i < count; i++) total += (int)rand_below((uint32_t)sides) + 1;
    return total;
}

int bc_roll_3d6(void) { return bc_roll_dice(3, 6); }

int bc_damage(int dice, int adds)
{
    int d = bc_roll_dice(dice, 6) + adds;
    return d < 0 ? 0 : d;
}

/* ---- success rolls ------------------------------------------------------ */
static bc_check_t resolve(int roll, int target)
{
    bc_check_t c;
    c.roll = roll;
    c.target = target;
    c.margin = target - roll;

    int success;
    if (roll <= 4)       success = 1;          /* 3-4 always succeed  */
    else if (roll >= 17) success = 0;          /* 17-18 always fail   */
    else                 success = roll <= target;

    if (success) {
        int crit = (roll <= 4) || (roll == 5 && target >= 15) ||
                   (roll == 6 && target >= 16) || (c.margin >= 10);
        c.outcome = crit ? BC_CRIT_SUCCESS : BC_SUCCESS;
    } else {
        int crit = (roll == 18) || (roll == 17 && target <= 15) ||
                   (roll - target >= 10);
        c.outcome = crit ? BC_CRIT_FAILURE : BC_FAILURE;
    }
    return c;
}

bc_check_t bc_check(int skill, int modifier)
{
    return resolve(bc_roll_3d6(), skill + modifier);
}

int bc_quick_contest(int skill_a, int skill_b, bc_check_t *out_a, bc_check_t *out_b)
{
    bc_check_t a = bc_check(skill_a, 0);
    bc_check_t b = bc_check(skill_b, 0);
    if (out_a) *out_a = a;
    if (out_b) *out_b = b;

    int a_ok = a.outcome >= BC_SUCCESS, b_ok = b.outcome >= BC_SUCCESS;
    if (a_ok && !b_ok) return 1;
    if (b_ok && !a_ok) return -1;
    if (!a_ok && !b_ok) return 0;
    if (a.margin > b.margin) return 1;
    if (b.margin > a.margin) return -1;
    return 0;
}

/* ---- character construction -------------------------------------------- */
int bc_attribute_cost(int attr_id, int level)
{
    static const int per_level[4] = { 10, 20, 20, 10 };  /* ST DX IQ CN */
    if (attr_id < 0 || attr_id > 3) return 0;
    return (level - 10) * per_level[attr_id];
}

int bc_skill_cost(int relative_level, int difficulty)
{
    /* Shift each difficulty onto the Average cost table. */
    static const int shift[4] = { 1, 0, -1, -2 };   /* E A H VH */
    if (difficulty < 0 || difficulty > 3) return -1;
    int n = relative_level - shift[difficulty];
    if (n < -1) return -1;
    if (n == -1) return 1;
    if (n == 0) return 2;
    return 4 * n;                                    /* 4, 8, 12, 16 ... */
}

bc_secondary_t bc_secondary(int st, int dx, int iq, int cn, int hp_bonus)
{
    bc_secondary_t r;
    r.st = st; r.dx = dx; r.iq = iq; r.cn = cn;
    r.hp = 100 + hp_bonus;            /* Blood Country: 100 HP is average */
    r.will = iq;
    r.per = iq;
    r.fp = cn;
    r.basic_speed = (dx + cn) / 4.0;
    r.basic_move = (int)r.basic_speed;
    r.dodge = r.basic_move + 3;
    return r;
}

/* ---- horror and hazards ------------------------------------------------- */
bc_fright_t bc_fright_check(int will, int modifier)
{
    bc_fright_t f;
    bc_check_t c = bc_check(will, modifier);
    f.roll = c.roll;
    f.target = c.target;
    f.failed = c.outcome <= BC_FAILURE;
    f.margin_of_failure = f.failed ? (c.roll - c.target) : 0;
    if (f.failed && f.margin_of_failure < 1) f.margin_of_failure = 1; /* auto-fail 17/18 */
    f.paralysis_minutes = f.margin_of_failure;
    return f;
}

int bc_venom_run(int ht, int bandage_bonus, const int *stage_mods, int n_stages,
                 int *out_rolls, int *out_outcomes)
{
    int failures = 0;
    if (!stage_mods || n_stages <= 0) return 0;
    for (int i = 0; i < n_stages; i++) {
        bc_check_t c = bc_check(ht, stage_mods[i] + bandage_bonus);
        if (out_rolls) out_rolls[i] = c.roll;
        if (out_outcomes) out_outcomes[i] = c.outcome;
        if (c.outcome <= BC_FAILURE) failures++;
    }
    return failures;
}
