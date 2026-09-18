/**
 * Exercise database. Ids ex1–ex6 are kept from the original plan so the
 * ExerciseGraphic figures still match; everything else matches by name.
 *
 * `mode` decides what the second number in a set means:
 *   reps → repetitions, time → seconds, distance → metres.
 */

export const MUSCLES = [
  { id: "legs", en: "Legs", fa: "پا" },
  { id: "back", en: "Back", fa: "پشت و زیربغل" },
  { id: "chest", en: "Chest", fa: "سینه" },
  { id: "shoulders", en: "Shoulders", fa: "سرشانه" },
  { id: "arms", en: "Arms", fa: "بازو" },
  { id: "core", en: "Core", fa: "مرکز بدن" },
  { id: "cardio", en: "Cardio", fa: "هوازی" },
];

const x = (id, muscle, nameEn, nameFa, equipment, mode = "reps") => ({ id, muscle, nameEn, nameFa, equipment, mode });

export const EXERCISES = [
  /* originals — ids preserved for the graphics */
  x("ex1", "legs", "Jump Squat", "اسکات پرشی", "Bodyweight"),
  x("ex2", "back", "Barbell Deadlift", "ددلیفت با هالتر", "Barbell"),
  x("ex3", "cardio", "Power Sled Push", "هل دادن سورتمه قدرتی", "Sled", "distance"),
  x("ex4", "legs", "Barbell Squat", "اسکات پشت با هالتر", "Barbell"),
  x("ex5", "legs", "Smith Leg Press", "پرس پا اسمیت", "Machine"),
  x("ex6", "legs", "Dumbbell Romanian Deadlift", "ددلیفت رومانیایی با دمبل", "Dumbbells"),

  /* legs */
  x("front_squat", "legs", "Front Squat", "اسکات از جلو", "Barbell"),
  x("goblet_squat", "legs", "Goblet Squat", "اسکات گابلت", "Kettlebell"),
  x("bulgarian_split", "legs", "Bulgarian Split Squat", "اسکات اسپلیت بلغاری", "Dumbbells"),
  x("lunge", "legs", "Walking Lunges", "لانژ راه‌رفتنی", "Dumbbells"),
  x("rdl_bar", "legs", "Romanian Deadlift", "ددلیفت رومانیایی", "Barbell"),
  x("sumo_dl", "legs", "Sumo Deadlift", "ددلیفت سومو", "Barbell"),
  x("hip_thrust", "legs", "Hip Thrust", "هیپ تراست", "Barbell"),
  x("leg_curl", "legs", "Leg Curl", "پشت پا دستگاه", "Machine"),
  x("leg_ext", "legs", "Leg Extension", "جلو پا دستگاه", "Machine"),
  x("calf_raise", "legs", "Standing Calf Raise", "ساق پا ایستاده", "Machine"),
  x("box_jump", "legs", "Box Jumps", "پرش روی باکس", "Box"),
  x("cone_hops", "legs", "Lateral Cone Hops", "پرش جانبی روی موانع", "Cones"),
  x("kb_swing", "legs", "Kettlebell Swings", "سوئینگ کتل‌بل", "Kettlebell"),

  /* back */
  x("pullup", "back", "Pull-Ups", "بارفیکس", "Pull-up Bar"),
  x("lat_pulldown", "back", "Lat Pulldown", "زیربغل سیم‌کش", "Cable"),
  x("barbell_row", "back", "Barbell Row", "زیربغل هالتر خم", "Barbell"),
  x("db_row", "back", "Dumbbell Row", "زیربغل دمبل تک", "Dumbbells"),
  x("seated_row", "back", "Seated Cable Row", "زیربغل قایقی", "Cable"),
  x("face_pull", "back", "Face Pull", "فیس پول", "Cable"),
  x("good_morning", "back", "Good Morning", "گود مورنینگ", "Barbell"),

  /* chest */
  x("bench_press", "chest", "Barbell Bench Press", "پرس سینه با هالتر", "Barbell"),
  x("incline_db", "chest", "Incline Dumbbell Press", "پرس بالا سینه دمبل", "Dumbbells"),
  x("db_fly", "chest", "Dumbbell Fly", "قفسه سینه دمبل", "Dumbbells"),
  x("pushup", "chest", "Push-Ups", "شنا سوئدی", "Bodyweight"),
  x("dips", "chest", "Dips", "پارالل", "Dip Bars"),

  /* shoulders */
  x("ohp", "shoulders", "Overhead Shoulder Press", "پرس سرشانه هالتر", "Barbell"),
  x("db_shoulder", "shoulders", "Dumbbell Shoulder Press", "پرس سرشانه دمبل", "Dumbbells"),
  x("lateral_raise", "shoulders", "Lateral Raises", "نشر جانب دمبل", "Dumbbells"),
  x("rear_delt", "shoulders", "Rear Delt Fly", "نشر خم", "Dumbbells"),

  /* arms */
  x("bb_curl", "arms", "Barbell Bicep Curls", "جلو بازو هالتر", "Barbell"),
  x("hammer_curl", "arms", "Hammer Curls", "جلو بازو چکشی", "Dumbbells"),
  x("rope_pushdown", "arms", "Tricep Rope Pushdowns", "پشت بازو طنابی سیم‌کش", "Cable"),
  x("skull_crusher", "arms", "Skull Crushers", "پشت بازو خوابیده هالتر", "Barbell"),

  /* core */
  x("plank", "core", "Plank", "پلانک", "Bodyweight", "time"),
  x("plank_taps", "core", "Plank Shoulder Taps", "پلانک و لمس شانه", "Bodyweight"),
  x("hanging_raise", "core", "Hanging Leg Raises", "بالا کشیدن پا در حالت آویزان", "Pull-up Bar"),
  x("cable_crunch", "core", "Cable Crunch", "کرانچ سیم‌کش", "Cable"),
  x("mb_slam", "core", "Medicine Ball Slams", "کوبیدن مدیسین بال", "Medicine Ball"),
  x("farmer_carry", "core", "Farmer's Carry", "حمل کشاورز", "Dumbbells", "distance"),

  /* cardio */
  x("ladder", "cardio", "Ladder Agility Drills", "تمرین نردبان چابکی", "Agility Ladder", "time"),
  x("burpee", "cardio", "Burpees", "برپی", "Bodyweight"),
  x("rowing", "cardio", "Rowing Machine Intervals", "اینتروال دستگاه روئینگ", "Rower", "distance"),
  x("treadmill", "cardio", "Treadmill Run", "دویدن روی تردمیل", "Treadmill", "time"),
  x("bike", "cardio", "Stationary Bike", "دوچرخه ثابت", "Bike", "time"),
  x("jump_rope", "cardio", "Jump Rope", "طناب زدن", "Rope", "time"),
];

export const findExercise = (id) => EXERCISES.find((e) => e.id === id) || null;

export const exerciseName = (exOrId, isRtl) => {
  const e = typeof exOrId === "string" ? findExercise(exOrId) : exOrId;
  if (!e) return typeof exOrId === "string" ? exOrId : "";
  return isRtl ? e.nameFa || e.nameEn : e.nameEn;
};

export function searchExercises(query, muscle = null) {
  const q = query.trim().toLowerCase();
  return EXERCISES.filter((e) => {
    if (muscle && e.muscle !== muscle) return false;
    if (!q) return true;
    return e.nameEn.toLowerCase().includes(q) || e.nameFa.includes(q) || e.equipment.toLowerCase().includes(q);
  });
}

/** Label for the second number of a set, by exercise mode. */
export const unitOf = (exercise, t) => {
  if (!exercise) return t.reps;
  if (exercise.mode === "time") return t.seconds;
  if (exercise.mode === "distance") return t.meters;
  return t.reps;
};
