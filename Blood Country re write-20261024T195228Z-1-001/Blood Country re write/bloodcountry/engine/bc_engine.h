/*
 * bc_engine.h - Blood Country rules engine (GURPS 4e subset)
 *
 * Plain C99, no dependencies. Built as a shared library and called from
 * Python through ctypes. All structs are simple POD types so they map
 * directly onto ctypes.Structure.
 */
#ifndef BC_ENGINE_H
#define BC_ENGINE_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#if defined(_WIN32)
#  define BC_API __declspec(dllexport)
#else
#  define BC_API __attribute__((visibility("default")))
#endif

/* ---- outcomes ---------------------------------------------------------- */
enum {
    BC_CRIT_FAILURE = 0,
    BC_FAILURE      = 1,
    BC_SUCCESS      = 2,
    BC_CRIT_SUCCESS = 3
};

/* ---- attribute ids (for cost calculation) ------------------------------ */
enum { BC_ST = 0, BC_DX = 1, BC_IQ = 2, BC_CN = 3 };

/* ---- skill difficulty ids ---------------------------------------------- */
enum { BC_EASY = 0, BC_AVERAGE = 1, BC_HARD = 2, BC_VERY_HARD = 3 };

/* ---- structs ------------------------------------------------------------ */
typedef struct {
    int roll;      /* the 3d6 result                                  */
    int target;    /* effective skill after modifiers                 */
    int margin;    /* target - roll (negative on failure)             */
    int outcome;   /* one of BC_* outcomes                            */
} bc_check_t;

typedef struct {
    int    st, dx, iq, cn;
    int    hp, will, per, fp;
    double basic_speed;
    int    basic_move;
    int    dodge;
} bc_secondary_t;

typedef struct {
    int roll;
    int target;
    int margin_of_failure;   /* 0 on success                          */
    int failed;              /* 1 if the Fright Check failed          */
    int paralysis_minutes;   /* Basic Set fallback: = margin of failure */
} bc_fright_t;

/* ---- random numbers ----------------------------------------------------- */
BC_API void     bc_seed(uint64_t seed);
BC_API int      bc_roll_dice(int count, int sides);   /* NdS            */
BC_API int      bc_roll_3d6(void);
BC_API int      bc_damage(int dice, int adds);        /* Nd6+adds, min 0 */

/* ---- success rolls ------------------------------------------------------ */
BC_API bc_check_t bc_check(int skill, int modifier);
/* Quick contest. Returns 1 if A wins, -1 if B wins, 0 on tie. */
BC_API int      bc_quick_contest(int skill_a, int skill_b,
                                 bc_check_t *out_a, bc_check_t *out_b);

/* ---- character construction -------------------------------------------- */
BC_API int      bc_attribute_cost(int attr_id, int level);
/* Points for a skill at `relative_level` vs its controlling attribute.
 * Returns -1 if that relative level is not purchasable. */
BC_API int      bc_skill_cost(int relative_level, int difficulty);
BC_API bc_secondary_t bc_secondary(int st, int dx, int iq, int cn, int hp_bonus);

/* ---- horror and hazards ------------------------------------------------- */
BC_API bc_fright_t bc_fright_check(int will, int modifier);

/* Runs a staged venom timeline (e.g. HT, HT-2, HT-3 ...).
 * stage_mods[i] is the modifier for stage i. `bandage_bonus` is added to every
 * roll (pressure immobilisation = +2). Results are written to the output
 * arrays (each of length n_stages). Returns the number of failed stages. */
BC_API int      bc_venom_run(int ht, int bandage_bonus,
                             const int *stage_mods, int n_stages,
                             int *out_rolls, int *out_outcomes);

#ifdef __cplusplus
}
#endif
#endif /* BC_ENGINE_H */
