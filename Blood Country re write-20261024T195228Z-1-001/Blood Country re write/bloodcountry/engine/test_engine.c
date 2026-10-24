/* test_engine.c - sanity tests for the C engine. Build: make test */
#include <stdio.h>
#include <stdlib.h>
#include "bc_engine.h"

static int failures = 0;
#define CHECK(cond) do { if (!(cond)) { \
    printf("FAIL line %d: %s\n", __LINE__, #cond); failures++; } } while (0)

int main(void)
{
    bc_seed(12345);

    /* 3d6 range and rough mean (expected 10.5) */
    long sum = 0; int lo = 99, hi = 0;
    for (int i = 0; i < 100000; i++) {
        int r = bc_roll_3d6(); sum += r;
        if (r < lo) lo = r;
        if (r > hi) hi = r;
    }
    double mean = sum / 100000.0;
    CHECK(lo == 3 && hi == 18);
    CHECK(mean > 10.4 && mean < 10.6);

    /* Fixed-outcome rules, exercised through many rolls on a huge/zero skill */
    for (int i = 0; i < 5000; i++) {
        bc_check_t c = bc_check(100, 0);   /* only 17/18 may fail */
        if (c.roll >= 17) CHECK(c.outcome <= BC_FAILURE);
        else CHECK(c.outcome >= BC_SUCCESS);
        bc_check_t z = bc_check(0, 0);     /* only 3/4 may succeed */
        if (z.roll <= 4) CHECK(z.outcome >= BC_SUCCESS);
        else CHECK(z.outcome <= BC_FAILURE);
    }

    /* Costs: Frankie Dell (ST10 DX12 IQ11 CN12) = 80 attribute points? no:
       DX +2 = 40, IQ +1 = 20, CN +2 = 20 => 80 */
    CHECK(bc_attribute_cost(BC_ST, 10) == 0);
    CHECK(bc_attribute_cost(BC_DX, 12) + bc_attribute_cost(BC_IQ, 11) +
          bc_attribute_cost(BC_CN, 12) == 80);
    CHECK(bc_attribute_cost(BC_DX, 8) == -40);

    CHECK(bc_skill_cost(0, BC_AVERAGE) == 2);
    CHECK(bc_skill_cost(1, BC_AVERAGE) == 4);
    CHECK(bc_skill_cost(2, BC_AVERAGE) == 8);
    CHECK(bc_skill_cost(0, BC_EASY) == 1);
    CHECK(bc_skill_cost(0, BC_HARD) == 4);
    CHECK(bc_skill_cost(-2, BC_AVERAGE) == -1);

    /* Secondary stats match the Frankie Dell and Dr Marsh examples */
    bc_secondary_t f = bc_secondary(10, 12, 11, 12, 0);
    CHECK(f.hp == 100 && f.will == 11 && f.per == 11 && f.fp == 12);
    CHECK(f.basic_speed == 6.0 && f.basic_move == 6 && f.dodge == 9);
    bc_secondary_t m = bc_secondary(10, 13, 13, 11, 0);
    CHECK(m.basic_speed == 6.0 && m.dodge == 9);

    /* Venom run writes one result per stage */
    int mods[4] = { 0, -2, -3, -4 }, rolls[4], outs[4];
    int fails = bc_venom_run(12, 2, mods, 4, rolls, outs);
    CHECK(fails >= 0 && fails <= 4);
    for (int i = 0; i < 4; i++) CHECK(rolls[i] >= 3 && rolls[i] <= 18);

    /* Fright check consistency */
    for (int i = 0; i < 2000; i++) {
        bc_fright_t fr = bc_fright_check(10, -2);
        if (fr.failed) CHECK(fr.paralysis_minutes >= 1);
        else CHECK(fr.paralysis_minutes == 0);
    }

    if (failures == 0) printf("All C engine tests passed.\n");
    return failures ? EXIT_FAILURE : EXIT_SUCCESS;
}
