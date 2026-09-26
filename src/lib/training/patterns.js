/**
 * What kind of movement an exercise is, and how hard: read from its name,
 * muscles and equipment, so every one of the library's exercises can be
 * placed in a program without hand-tagging 3,400 of them.
 *
 * Patterns (what a program's slots ask for):
 *   squat, hinge, lunge, push_h, push_v, pull_h, pull_v   the big movements
 *   chest_iso, shoulder_iso, rear_iso, biceps, triceps,
 *   quad_iso, ham_iso, glute_iso, calf, core, carry        accessories
 *   cardio, plyo, mobility                                  conditioning and the rest
 *   other                                                   not placed in programs
 *
 * Level: 1 beginner, 2 intermediate, 3 advanced.
 * Load: "joints" it leans on hard, so an injury can rule it out.
 */

const has = (s, re) => re.test(s);

// Order matters: the first rule that matches wins.
const RULES = [
  ["mobility", /\b(stretch|stretching|pose|yoga|asana|mobility|foam roll|massage|cat cow|child'?s|cobra|drill)\b/],
  ["carry", /\b(farmer|carry|carries|suitcase walk|yoke)\b/],
  ["lunge", /\b(lunge|lunges|split squat|bulgarian|step[- ]?up|step[- ]?ups|pistol|cossack|curtsy)\b/],
  ["cardio", /\b(run|running|jog|sprint|walk|walking|treadmill|bike|cycling|elliptical|rowing machine|row machine|ski erg|ergometer|stair|jump rope|skipping|jumping jack|burpee|mountain climber|high knee|butt kick|shadow box|punch|sled)\b/],
  ["plyo", /\b(jump|jumps|hop|hops|bound|bounds|box jump|depth|plyo|plyometric|skater|tuck jump)\b/],
  ["calf", /\b(calf|calve|heel raise|toe raise)\b/],
  ["core", /\b(plank|crunch|sit[- ]?up|leg raise|knee raise|hollow|dead bug|bird dog|russian twist|v[- ]?up|ab wheel|rollout|roll[- ]?out|wood ?chop|pallof|flutter|scissor|toes to bar|dragon flag|oblique|side bend|l[- ]?sit|windshield)\b/],
  ["hinge", /\b(deadlift|rdl|good ?morning|back curl|hip thrust|glute bridge|bridge|swing|back extension|hyperextension|pull[- ]?through|rack pull|clean|snatch|nordic)\b/],
  ["squat", /\b(squat|squats|leg press|hack|goblet|sissy|wall sit|thruster)\b/],
  ["quad_iso", /\b(leg extension|knee extension)\b/],
  ["ham_iso", /\b(leg curl|hamstring curl|glute[- ]ham)\b/],
  ["glute_iso", /\b(abduction|adduction|(glute|donkey|leg|hip|quadruped|butt) kickback|donkey kick|fire hydrant|clamshell|hip abductor|hip adductor)\b/],
  ["pull_v", /\b(pull[- ]?up|pull[- ]?ups|chin[- ]?up|chin[- ]?ups|pulldown|pull[- ]?down|muscle[- ]?up)\b/],
  ["pull_h", /\b(row|rows|rowing|inverted row|seal row|pendlay)\b/],
  ["rear_iso", /\b(rear delt|reverse fly|reverse flye|face pull|rear lateral|band pull[- ]?apart)\b/],
  ["shoulder_iso", /\b(lateral raise|side lateral|front raise|upright row|y[- ]?raise|shrug)\b/],
  ["push_v", /\b(overhead press|shoulder press|military press|arnold|push press|pike push|handstand|landmine press|z press|overhead)\b/],
  ["chest_iso", /\b(fly|flye|flyes|flys|crossover|cross[- ]?over|pec deck|pullover)\b/],
  ["triceps", /\b(triceps?|pushdown|push[- ]?down|skull ?crusher|kickback|close[- ]grip bench|dip|dips|french press)\b/],
  ["biceps", /\b(curl|curls|biceps?)\b/],
  ["push_h", /\b(bench press|chest press|push[- ]?up|push[- ]?ups|press up|floor press|svend)\b/],
];

/** Movement patterns that are the backbone of a session. */
export const COMPOUND = new Set(["squat", "hinge", "lunge", "push_h", "push_v", "pull_h", "pull_v"]);

const ADVANCED = /\b(one[- ]arm|single[- ]arm|one[- ]leg|single[- ]leg|pistol|muscle[- ]?up|handstand|planche|front lever|back lever|snatch|clean and jerk|jerk|deficit|dragon flag|nordic|archer|typewriter|weighted pull|weighted chin|weighted dip|clapping|plyo push|l[- ]?sit|human flag|behind the neck)\b/;
const BEGINNER = /\b(machine|lever|assisted|kneeling|knee push|wall push|incline push|band|seated|lying|smith|goblet|glute bridge|dead bug|bird dog|step[- ]?up|bodyweight squat|air squat|wall sit)\b/;

/** The joints an exercise loads hard, for injuries. */
function loadOf(name, pattern) {
  const out = [];
  if (/\b(jump|hop|bound|plyo|lunge|pistol|sissy|deep squat|split squat|bulgarian|burpee)\b/.test(name) || pattern === "plyo") out.push("knee");
  if (pattern === "push_v" || /\b(dip|dips|behind the neck|upright row|handstand|snatch|jerk|overhead)\b/.test(name)) out.push("shoulder");
  if ((pattern === "hinge" && !/\b(bridge|hip thrust|machine|back extension)\b/.test(name)) || /\b(bent[- ]over|good ?morning|deadlift|clean|snatch)\b/.test(name)) out.push("lower_back");
  if (/\b(push[- ]?up|handstand|planche|front squat|clean|snatch|wrist)\b/.test(name)) out.push("wrist");
  return out;
}

const cache = new WeakMap();

/**
 * Pattern, compound, level and joint load of one exercise record
 * (nameEn, muscles, equipmentSlugs, type). Pure; cached per record.
 */
export function classify(ex) {
  if (!ex) return null;
  const hit = cache.get(ex);
  if (hit) return hit;
  // Lower case, hyphens as spaces, plurals singular: "Lateral Raises" reads as "lateral raise".
  const name = String(ex.nameEn || ex.slug || "").toLowerCase().replace(/-/g, " ")
    .replace(/\b([a-z]{2,}[^s\s])s\b/g, "$1");
  let pattern = null;
  if (ex.type === "stretching") pattern = "mobility";
  else if (ex.type === "cardio" && !/\b(squat|lunge|step up|push up|burpee|jump|row|plank|crunch|kick|flutter|scissor)\b/.test(name)) pattern = "cardio";
  for (const [p, re] of RULES) {
    if (pattern) break;
    if (has(name, re)) pattern = p;
  }
  // Nothing in the name says what it is: a program never guesses with it.
  if (!pattern) pattern = "other";
  const level = has(name, ADVANCED) ? 3 : has(name, BEGINNER) ? 1 : 2;
  const out = { pattern, compound: COMPOUND.has(pattern), level, load: loadOf(name, pattern) };
  cache.set(ex, out);
  return out;
}

/** Equipment a place offers. `home` is bodyweight only; `home_gear` adds dumbbells, a bench and bands (no bar, no kettlebell). */
export const LOCATION_EQUIPMENT = {
  gym: null, // everything
  home_gear: ["bodyweight", "dumbbell", "resistance-band", "bench", "stability-ball", "towel", "bottle", "wheel-roller", "foam-roller", "stick-pvc", "other"],
  home: ["bodyweight", "towel", "bottle", "other", "stick-pvc"],
};

// Machines the library lists without equipment, and moves that need a bar or dip station.
const MACHINE_CARDIO = /\b(treadmill|bike|cycling|rowing|elliptical|sled|ski erg|ergometer|stair|machine)\b/i;
const NEEDS_BAR = /\b(pull[- ]?ups?|chin[- ]?ups?|hanging|muscle[- ]?ups?|dips?|toes to bar|bar hang)\b/i;
const NO_BAR_DIP = /\b(bench|floor|chair) dips?\b/i;

/** Whether a place has what an exercise needs. */
export function fitsEquipment(ex, location) {
  const allowed = LOCATION_EQUIPMENT[location];
  if (!allowed) return true;
  const name = ex.nameEn || ex.slug || "";
  if (MACHINE_CARDIO.test(name)) return false;
  // A pull-up counts as bodyweight in the library, but it needs a bar (and a dip, bars) that a home may not have.
  if (!allowed.includes("pull-up-bar") && NEEDS_BAR.test(name) && !NO_BAR_DIP.test(name)) return false;
  const need = ex.equipmentSlugs || [];
  return need.length === 0 ? true : need.every((e) => allowed.includes(e));
}
