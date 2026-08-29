import React, { useState } from "react";
import { 
  Dumbbell, Play, ChevronRight, 
  RefreshCw, Info, Coffee, Search, 
  ChevronLeft
} from "lucide-react";
import ExerciseDetailModal from "../../components/modals/ExerciseDetailModal";
import SwapExerciseModal from "../../components/modals/SwapExerciseModal";
import ActiveWorkoutModal from "../../components/modals/ActiveWorkoutModal";
import ExerciseGraphic from "../../components/ExerciseGraphic";

export default function WorkoutPage({ isRtl }) {
  const [activeSegment, setActiveSegment] = useState("plan"); // "plan" | "training" | "exercises"
  const [selectedDay, setSelectedDay] = useState(null); // null = weekly schedule view, object = day routine view
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState(null);
  const [selectedExerciseForSwap, setSelectedExerciseForSwap] = useState(null);
  const [isLiveWorkoutOpen, setIsLiveWorkoutOpen] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Workout Days Schedule Data
  const [scheduleDays, setScheduleDays] = useState([
    {
      id: "day1",
      dayNumber: 1,
      type: "workout",
      titleEn: "Explosiveness",
      titleFa: "تمرین انفجاری و توان بدنی",
      subtitleEn: "Training Session",
      subtitleFa: "جلسه تمرینی پرفشار",
      badgeEn: "Explosiveness",
      badgeFa: "انفجاری",
      badgeColor: "amber",
      duration: "45 min",
      calories: "420 kcal",
      exercises: [
        {
          id: "ex1",
          nameEn: "Jump Squat",
          nameFa: "اسکات پرشی",
          sets: 5,
          reps: "5 Reps",
          area: "Quads & Glutes",
          primaryMuscle: "Quadriceps",
          secondaryMuscle: "Glutes & Calves",
          difficulty: "Intermediate",
          equipment: "Bodyweight",
        },
        {
          id: "ex2",
          nameEn: "Barbell Deadlift",
          nameFa: "ددلیفت با هالتر",
          sets: 3,
          reps: "3-5 Reps",
          area: "Hamstrings & Back",
          primaryMuscle: "Hamstrings & Lower Back",
          secondaryMuscle: "Glutes & Trapezius",
          difficulty: "Advanced",
          equipment: "Barbell",
        },
        {
          id: "ex3",
          nameEn: "Power Sled Push",
          nameFa: "هل دادن سورتمه قدرتی",
          sets: 4,
          reps: "30 Reps",
          area: "Full Body Power",
          primaryMuscle: "Quadriceps & Calves",
          secondaryMuscle: "Core & Shoulders",
          difficulty: "High Intensity",
          equipment: "Power Sled",
        },
        {
          id: "ex4",
          nameEn: "Barbell Squat",
          nameFa: "اسکات پشت با هالتر",
          sets: 4,
          reps: "6-8 Reps",
          area: "Quads & Hips",
          primaryMuscle: "Quadriceps",
          secondaryMuscle: "Glutes & Hamstrings",
          difficulty: "Intermediate",
          equipment: "Barbell",
        },
        {
          id: "ex5",
          nameEn: "Smith Leg Press",
          nameFa: "پرس پا اسمیت",
          sets: 3,
          reps: "10-12 Reps",
          area: "Legs & Glutes",
          primaryMuscle: "Quadriceps",
          secondaryMuscle: "Gluteus Maximus",
          difficulty: "Intermediate",
          equipment: "Smith Machine",
        },
        {
          id: "ex6",
          nameEn: "Dumbbell Romanian Deadlift",
          nameFa: "ددلیفت رومانیایی با دمبل",
          sets: 3,
          reps: "8-10 Reps",
          area: "Posterior Chain",
          primaryMuscle: "Hamstrings",
          secondaryMuscle: "Glutes & Erectors",
          difficulty: "Intermediate",
          equipment: "Dumbbells",
        },
      ]
    },
    {
      id: "day2",
      dayNumber: 2,
      type: "workout",
      titleEn: "Agility",
      titleFa: "چابکی و سرعت",
      subtitleEn: "Training Session",
      subtitleFa: "جلسه تمرینی چابکی",
      badgeEn: "Agility",
      badgeFa: "چابکی",
      badgeColor: "cyan",
      duration: "40 min",
      calories: "380 kcal",
      exercises: [
        { id: "d2_1", nameEn: "Ladder Agility Drills", nameFa: "تمرین نردبان چابکی", sets: 4, reps: "45 Sec", area: "Footwork & Speed" },
        { id: "d2_2", nameEn: "Lateral Cone Hops", nameFa: "پرش جانبی روی موانع", sets: 3, reps: "12 Reps", area: "Ankles & Calves" },
        { id: "d2_3", nameEn: "Medicine Ball Slams", nameFa: "کوبیدن مدیسین بال", sets: 4, reps: "15 Reps", area: "Core & Lats" },
        { id: "d2_4", nameEn: "Box Jumps", nameFa: "پرش روی باکس", sets: 4, reps: "8 Reps", area: "Explosive Legs" },
        { id: "d2_5", nameEn: "Plank Shoulder Taps", nameFa: "پلانک و لمس شانه", sets: 3, reps: "20 Reps", area: "Core & Shoulders" },
      ]
    },
    {
      id: "day3",
      dayNumber: 3,
      type: "rest",
      titleEn: "Rest",
      titleFa: "استراحت و ریکاوری",
      subtitleEn: "Recovery Time",
      subtitleFa: "زمان بازسازی عضلات",
      duration: "Full Day",
      calories: "Active Recovery",
    },
    {
      id: "day4",
      dayNumber: 4,
      type: "workout",
      titleEn: "Strength",
      titleFa: "قدرت و استقامت عضلانی",
      subtitleEn: "Training Session",
      subtitleFa: "جلسه تمرینی قدرتی",
      badgeEn: "Strength",
      badgeFa: "قدرت",
      badgeColor: "purple",
      duration: "50 min",
      calories: "450 kcal",
      exercises: [
        { id: "d4_1", nameEn: "Barbell Bench Press", nameFa: "پرس سینه با هالتر", sets: 4, reps: "6-8 Reps", area: "Chest & Triceps" },
        { id: "d4_2", nameEn: "Incline Dumbbell Press", nameFa: "پرس بالا سینه دمبل", sets: 3, reps: "8-10 Reps", area: "Upper Chest" },
        { id: "d4_3", nameEn: "Overhead Shoulder Press", nameFa: "پرس سرشانه هالتر", sets: 4, reps: "8 Reps", area: "Deltoids" },
        { id: "d4_4", nameEn: "Pull-Ups / Lat Pulldown", nameFa: "بارفیکس / زیربغل لت", sets: 4, reps: "8-10 Reps", area: "Lats & Back" },
        { id: "d4_5", nameEn: "Barbell Bicep Curls", nameFa: "جلو بازو با هالتر", sets: 3, reps: "10-12 Reps", area: "Biceps" },
        { id: "d4_6", nameEn: "Tricep Rope Pushdowns", nameFa: "پشت بازو طنابی سیمکش", sets: 3, reps: "12 Reps", area: "Triceps" },
      ]
    },
    {
      id: "day5",
      dayNumber: 5,
      type: "workout",
      titleEn: "Conditioning",
      titleFa: "کاندیشنینگ و هوازی",
      subtitleEn: "Training Session",
      subtitleFa: "جلسه تمرین استقامتی",
      badgeEn: "Conditioning",
      badgeFa: "استقامتی",
      badgeColor: "emerald",
      duration: "45 min",
      calories: "410 kcal",
      exercises: [
        { id: "d5_1", nameEn: "Kettlebell Swings", nameFa: "سوئینگ کتل‌بل", sets: 4, reps: "20 Reps", area: "Glutes & Hamstrings" },
        { id: "d5_2", nameEn: "Burpees to Box Step", nameFa: "برپی با پله باکس", sets: 3, reps: "12 Reps", area: "Full Body Cardio" },
        { id: "d5_3", nameEn: "Rowing Machine Intervals", nameFa: "اینتروال دستگاه روئینگ", sets: 5, reps: "500m", area: "Cardio & Back" },
        { id: "d5_4", nameEn: "Hanging Leg Raises", nameFa: "بالا کشیدن پا در حالت آویزان", sets: 3, reps: "15 Reps", area: "Lower Abs" },
      ]
    },
    {
      id: "day6",
      dayNumber: 6,
      type: "rest",
      titleEn: "Rest",
      titleFa: "استراحت و کشش",
      subtitleEn: "Recovery Time",
      subtitleFa: "ماساژ و فوم رولر",
      duration: "Full Day",
      calories: "Mobility",
    },
    {
      id: "day7",
      dayNumber: 7,
      type: "rest",
      titleEn: "Rest",
      titleFa: "استراحت کامل",
      subtitleEn: "Recovery Time",
      subtitleFa: "ریکاوری و خواب کافی",
      duration: "Full Day",
      calories: "Rest",
    },
  ]);

  // Workout Programs Catalog Data
  const programsList = [
    {
      id: "prog_athletic",
      titleEn: "Athletic Explosive Power v2",
      titleFa: "توان انفجاری و چابکی ورزشی",
      difficultyEn: "Intermediate",
      difficultyFa: "متوسط تا پیشرفته",
      daysPerWeek: 4,
      duration: "6 Weeks",
      active: true,
      tagEn: "CURRENT PLAN",
      tagFa: "برنامه فعال",
    },
    {
      id: "prog_ppl",
      titleEn: "Push Pull Legs Hypertrophy",
      titleFa: "سیستم حجم عضلانی پوش پول لگز",
      difficultyEn: "Advanced",
      difficultyFa: "پیشرفته",
      daysPerWeek: 6,
      duration: "8 Weeks",
      active: false,
    },
    {
      id: "prog_fullbody",
      titleEn: "Full Body Functional Strength",
      titleFa: "فول بادی فانکشنال و قدرت",
      difficultyEn: "All Levels",
      difficultyFa: "تمام سطوح",
      daysPerWeek: 3,
      duration: "4 Weeks",
      active: false,
    },
    {
      id: "prog_calisthenics",
      titleEn: "Bodyweight Master (Calisthenics)",
      titleFa: "کالیستنیکس و تمرینات وزن بدن",
      difficultyEn: "Intermediate",
      difficultyFa: "متوسط",
      daysPerWeek: 4,
      duration: "6 Weeks",
      active: false,
    }
  ];

  // All Exercises Library Database
  const exerciseLibrary = [
    { id: "lib1", nameEn: "Jump Squat", nameFa: "اسکات پرشی", muscle: "legs", sets: 5, reps: "5", equipment: "Bodyweight" },
    { id: "lib2", nameEn: "Barbell Deadlift", nameFa: "ددلیفت با هالتر", muscle: "back", sets: 3, reps: "5", equipment: "Barbell" },
    { id: "lib3", nameEn: "Barbell Bench Press", nameFa: "پرس سینه با هالتر", muscle: "chest", sets: 4, reps: "8-10", equipment: "Barbell" },
    { id: "lib4", nameEn: "Incline Dumbbell Press", nameFa: "پرس بالا سینه با دمبل", muscle: "chest", sets: 3, reps: "10-12", equipment: "Dumbbell" },
    { id: "lib5", nameEn: "Overhead Shoulder Press", nameFa: "پرس سرشانه هالتر", muscle: "shoulders", sets: 4, reps: "8", equipment: "Barbell" },
    { id: "lib6", nameEn: "Lateral Raises", nameFa: "نشر جانب دمبل", muscle: "shoulders", sets: 4, reps: "15", equipment: "Dumbbell" },
    { id: "lib7", nameEn: "Pull-Ups", nameFa: "بارفیکس دست باز", muscle: "back", sets: 4, reps: "8", equipment: "Pull-up Bar" },
    { id: "lib8", nameEn: "Barbell Bicep Curls", nameFa: "جلو بازو هالتر", muscle: "arms", sets: 3, reps: "10-12", equipment: "Barbell" },
    { id: "lib9", nameEn: "Tricep Pushdowns", nameFa: "پشت بازو سیمکش", muscle: "arms", sets: 3, reps: "12", equipment: "Cable" },
    { id: "lib10", nameEn: "Hanging Leg Raises", nameFa: "بالا کشیدن پا آویزان", muscle: "core", sets: 3, reps: "15", equipment: "Bodyweight" },
    { id: "lib11", nameEn: "Romanian Deadlift", nameFa: "ددلیفت رومانیایی", muscle: "legs", sets: 4, reps: "8-10", equipment: "Barbell" },
  ];

  // Handler for swapping an exercise in the active day
  const handleSwapExercise = (newExercise) => {
    if (!selectedDay || !selectedExerciseForSwap) return;
    
    setScheduleDays((prevDays) =>
      prevDays.map((d) => {
        if (d.id === selectedDay.id) {
          const updatedExercises = (d.exercises || []).map((ex) =>
            ex.id === selectedExerciseForSwap.id ? { ...ex, ...newExercise } : ex
          );
          const updatedDay = { ...d, exercises: updatedExercises };
          setSelectedDay(updatedDay);
          return updatedDay;
        }
        return d;
      })
    );
  };

  // Filtered exercise library
  const filteredLibrary = exerciseLibrary.filter((ex) => {
    const matchesFilter = libraryFilter === "all" || ex.muscle === libraryFilter;
    const matchesSearch = ex.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ex.nameFa.includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="w-full min-h-[100dvh] bg-black text-white px-4 pt-3 pb-28 space-y-4 font-sans select-none"
    >
      {/* ------------------------------------------------------------- */}
      {/* VIEW A: DAY ROUTINE DETAIL VIEW (iOS Frosted Glass Aesthetic) */}
      {/* ------------------------------------------------------------- */}
      {selectedDay ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* iOS Frosted Glass Top Bar Header */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="w-10 h-10 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/[0.12] transition-all active:scale-95 shadow-sm"
              >
                {isRtl ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                  {isRtl ? `روز ${selectedDay.dayNumber}` : `Day ${selectedDay.dayNumber}`}
                </h1>
                
                {/* iOS Frosted Badges */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-amber-300 bg-amber-500/15 backdrop-blur-lg border border-amber-500/30 px-3 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    {isRtl ? selectedDay.badgeFa : selectedDay.badgeEn}
                  </span>

                  <span className="text-xs font-bold text-[#d17cd0] bg-[#844783]/20 backdrop-blur-lg border border-[#844783]/40 px-3 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    🏋️ {selectedDay.exercises?.length || 6} {isRtl ? "حرکت" : "exercises"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Exercises List Cards (Matching User Reference Image) */}
          <div className="space-y-3 pt-1 pb-28">
            {(selectedDay.exercises || []).map((ex, idx) => (
              <div
                key={ex.id || idx}
                className="p-3.5 sm:p-4 rounded-[26px] bg-[#121316] border border-white/[0.08] hover:border-white/[0.18] transition-all duration-200 flex items-center justify-between group shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
              >
                {/* Left: Illustration & Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  
                  {/* Exercise Graphic Thumbnail Container */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] overflow-hidden shrink-0 shadow-inner border border-white/[0.06] flex items-center justify-center">
                    <ExerciseGraphic exerciseId={ex.id || `ex${idx+1}`} name={ex.nameEn} />
                  </div>

                  {/* Name & Single Line Sets/Reps */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate leading-snug">
                      {isRtl ? ex.nameFa || ex.nameEn : ex.nameEn}
                    </h3>

                    {/* Guaranteed Single Line Badge */}
                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-xl bg-[#1c1d22] border border-white/5 text-[11px] sm:text-xs font-black text-neutral-200 shadow-sm whitespace-nowrap">
                      <span>{ex.sets || 4} {isRtl ? "ست" : "Sets"}</span>
                      <span className="w-1 h-1 rounded-full bg-neutral-500 shrink-0 mx-0.5" />
                      <span>{(ex.reps || "8-10").toString().replace(/reps/gi, "").trim()} {isRtl ? "تکرار" : "Reps"}</span>
                    </div>
                  </div>

                </div>

                {/* Right: Action Buttons (Swap & Info Buttons) */}
                <div className="flex items-center gap-1.5 shrink-0 ltr:ml-1.5 rtl:mr-1.5">
                  {/* Swap Exercise Button */}
                  <button
                    type="button"
                    title={isRtl ? "تعویض حرکت" : "Swap Exercise"}
                    onClick={() => setSelectedExerciseForSwap(ex)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1c1d22] border border-white/5 hover:border-white/20 hover:bg-[#25272e] text-neutral-300 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  {/* Exercise Info / Guide Button */}
                  <button
                    type="button"
                    title={isRtl ? "راهنمای حرکت" : "Exercise Details"}
                    onClick={() => setSelectedExerciseForDetail(ex)}
                    className="w-10 h-10 rounded-full bg-[#1c1d22] border border-white/5 hover:border-white/20 hover:bg-[#25272e] text-neutral-300 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ))}
          </div>

          {/* Bottom Floating iOS Glowing CTA Button */}
          <div className="fixed bottom-16 left-0 right-0 z-40 p-4 pointer-events-none">
            <div className="w-full md:max-w-lg mx-auto pointer-events-auto">
              <button
                type="button"
                onClick={() => setIsLiveWorkoutOpen(true)}
                className="w-full h-14 rounded-full bg-gradient-to-r from-[#844783] via-[#9e529d] to-[#a356a2] hover:brightness-110 text-white font-black text-base flex items-center justify-center gap-2.5 shadow-[0_0_35px_rgba(132,71,131,0.65)] active:scale-[0.98] transition-all border border-white/25 backdrop-blur-xl"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>{isRtl ? "شروع تمرین زنده (Start Workout)" : "Start Workout"}</span>
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* VIEW B: MAIN WORKOUT OVERVIEW (iOS Glassmorphism Aesthetic)   */
        /* ------------------------------------------------------------- */
        <div className="space-y-4">
          
          {/* iOS Glass Segmented Control Tabs */}
          <div className="bg-neutral-900/60 backdrop-blur-2xl p-1 rounded-[20px] border border-white/[0.08] flex items-center justify-between w-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <button
              type="button"
              onClick={() => setActiveSegment("plan")}
              className={`flex-1 py-2.5 rounded-[16px] text-xs font-black transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeSegment === "plan"
                  ? "bg-white text-black shadow-[0_4px_16px_rgba(0,0,0,0.3)] scale-[1.01]"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>📅</span>
              <span>{isRtl ? "برنامه (Plan)" : "Plan"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSegment("training")}
              className={`flex-1 py-2.5 rounded-[16px] text-xs font-black transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeSegment === "training"
                  ? "bg-white text-black shadow-[0_4px_16px_rgba(0,0,0,0.3)] scale-[1.01]"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>💪</span>
              <span>{isRtl ? "سیستم‌ها (Training)" : "Training"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSegment("exercises")}
              className={`flex-1 py-2.5 rounded-[16px] text-xs font-black transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeSegment === "exercises"
                  ? "bg-white text-black shadow-[0_4px_16px_rgba(0,0,0,0.3)] scale-[1.01]"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>🏋️</span>
              <span>{isRtl ? "بانک حرکات (Exercises)" : "exercises"}</span>
            </button>
          </div>

          {/* TAB 1: PLAN SCHEDULE (Weekly Routine List) */}
          {activeSegment === "plan" && (
            <div className="space-y-3 animate-in fade-in duration-200">
              
              {/* iOS Hero Card: Current Workout Split */}
              <div className="p-5 rounded-[24px] bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex items-center justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#844783]/20 rounded-full blur-2xl pointer-events-none" />
                
                <div className="relative z-10">
                  <span className="text-[10px] font-black text-[#844783] uppercase tracking-wider block">
                    {isRtl ? "برنامه فعال شما" : "CURRENT WORKOUT SPLIT"}
                  </span>
                  <h2 className="text-lg font-black text-white mt-0.5 tracking-tight">Athletic Explosive Power</h2>
                  <span className="text-xs text-neutral-400 font-bold">4 {isRtl ? "روز تمرین در هفته" : "Days / Week"}</span>
                </div>

                <div className="text-right rtl:text-left relative z-10">
                  <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/15 backdrop-blur-md border border-emerald-500/30 px-3 py-1 rounded-full shadow-sm">
                    Week 1 • In Progress
                  </span>
                </div>
              </div>

              {/* Day Cards List in Clean iOS Glassmorphism */}
              <div className="space-y-2.5">
                {scheduleDays.map((day) => {
                  const isWorkout = day.type === "workout";

                  return (
                    <div
                      key={day.id}
                      onClick={() => {
                        if (isWorkout) setSelectedDay(day);
                      }}
                      className={`p-3.5 rounded-[22px] border transition-all duration-300 flex items-center justify-between group ${
                        isWorkout
                          ? "bg-white/[0.04] backdrop-blur-xl border-white/[0.08] hover:border-[#844783]/50 hover:bg-white/[0.07] cursor-pointer active:scale-[0.99] shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
                          : "bg-white/[0.02] backdrop-blur-md border-white/[0.04] opacity-60 cursor-default"
                      }`}
                    >
                      {/* Left: Day Badge & Titles */}
                      <div className="flex items-center gap-3.5">
                        
                        {/* Flawless iOS Sized Day Badge (48px x 48px, Zero Overflow) */}
                        <div
                          className={`w-12 h-12 rounded-[16px] flex flex-col items-center justify-center shrink-0 border transition-all duration-200 ${
                            isWorkout
                              ? "bg-gradient-to-b from-[#965595] to-[#733572] text-white border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_12px_rgba(132,71,131,0.35)] group-hover:scale-105"
                              : "bg-white/[0.04] text-neutral-500 border-white/[0.08]"
                          }`}
                        >
                          <span className="text-[9px] font-black uppercase tracking-wider text-white/80 leading-none">DAY</span>
                          <span className="text-base font-black text-white leading-none mt-1">{day.dayNumber}</span>
                        </div>

                        {/* Titles */}
                        <div>
                          <h3 className={`text-base font-black tracking-tight ${isWorkout ? "text-white group-hover:text-amber-300 transition-colors" : "text-neutral-400"}`}>
                            {isRtl ? day.titleFa : day.titleEn}
                          </h3>
                          
                          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium mt-0.5">
                            <span>{isWorkout ? "🔥" : "☕"}</span>
                            <span>{isRtl ? day.subtitleFa : day.subtitleEn}</span>
                            {isWorkout && (
                              <span className="text-neutral-500">• {day.duration}</span>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Right Action: iOS Pill Button */}
                      <div>
                        {isWorkout ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDay(day);
                            }}
                            className="px-5 py-2.5 rounded-full bg-white text-black font-black text-xs hover:bg-neutral-200 transition-all shadow-[0_2px_10px_rgba(255,255,255,0.2)] active:scale-95"
                          >
                            {isRtl ? "شروع" : "Start"}
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-neutral-500">
                            <Coffee className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 2: TRAINING PROGRAMS (Browse Other Systems) */}
          {activeSegment === "training" && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-neutral-400 uppercase tracking-wider">
                  {isRtl ? "سیستم‌ها و برنامه‌های ورزشی" : "Workout Programs Catalog"}
                </span>
                <span className="text-xs font-bold text-[#844783]">4 Available</span>
              </div>

              {programsList.map((prog) => (
                <div
                  key={prog.id}
                  className={`p-5 rounded-[22px] border transition-all ${
                    prog.active
                      ? "bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border-[#844783] shadow-[0_4px_24px_rgba(132,71,131,0.25)]"
                      : "bg-white/[0.04] backdrop-blur-xl border-white/[0.08] hover:border-white/[0.2]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/10 backdrop-blur-md">
                      {isRtl ? prog.difficultyFa : prog.difficultyEn}
                    </span>

                    {prog.active && (
                      <span className="text-[10px] font-black text-amber-300 bg-amber-500/15 backdrop-blur-md border border-amber-500/30 px-2.5 py-0.5 rounded-full shadow-sm">
                        {isRtl ? prog.tagFa : prog.tagEn}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-black text-white">{isRtl ? prog.titleFa : prog.titleEn}</h3>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 text-xs text-neutral-400">
                    <span>⚡ {prog.daysPerWeek} {isRtl ? "روز در هفته" : "Days / Wk"} • {prog.duration}</span>
                    <button
                      type="button"
                      className={`px-4 py-1.5 rounded-xl font-black text-xs transition-all ${
                        prog.active
                          ? "bg-[#844783] text-white shadow-md shadow-[#844783]/30"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      {prog.active ? (isRtl ? "انتخاب شده ✓" : "Active ✓") : (isRtl ? "انتخاب برنامه" : "Switch")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: EXERCISE LIBRARY */}
          {activeSegment === "exercises" && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              
              {/* iOS Frosted Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isRtl ? "جستجوی حرکت ورزشی..." : "Search exercises..."}
                  className="w-full h-11 bg-white/[0.05] backdrop-blur-xl border border-white/[0.09] rounded-[18px] pl-10 pr-4 text-xs font-bold text-white placeholder-neutral-500 focus:outline-none focus:border-[#844783] shadow-inner"
                />
              </div>

              {/* Muscle Filter Chips in iOS Style */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: "all", label: isRtl ? "همه" : "All" },
                  { id: "chest", label: isRtl ? "سینه" : "Chest" },
                  { id: "back", label: isRtl ? "زیربغل / پشت" : "Back" },
                  { id: "shoulders", label: isRtl ? "سرشانه" : "Shoulders" },
                  { id: "legs", label: isRtl ? "پاها" : "Legs" },
                  { id: "arms", label: isRtl ? "بازو" : "Arms" },
                  { id: "core", label: isRtl ? "شکم و فیله" : "Core" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setLibraryFilter(chip.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
                      libraryFilter === chip.id
                        ? "bg-[#844783] text-white shadow-md shadow-[#844783]/30"
                        : "bg-white/[0.04] text-neutral-400 border border-white/[0.08] hover:text-white"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Exercises List in Glass Style */}
              <div className="space-y-2">
                {filteredLibrary.map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => setSelectedExerciseForDetail(ex)}
                    className="p-3.5 rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] hover:border-[#844783]/50 flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[14px] bg-neutral-900/90 border border-white/[0.08] flex items-center justify-center text-white shrink-0 shadow-inner">
                        <Dumbbell className="w-5 h-5 text-neutral-300" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                          {isRtl ? ex.nameFa : ex.nameEn}
                        </h4>
                        <span className="text-[11px] text-neutral-400 font-bold">
                          {ex.equipment} • {ex.sets} Sets
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-8 h-8 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center justify-center text-neutral-400 group-hover:text-white shadow-sm"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS & OVERLAYS                                             */}
      {/* ------------------------------------------------------------- */}
      
      {/* 1. Exercise Detail Modal */}
      {selectedExerciseForDetail && (
        <ExerciseDetailModal
          exercise={selectedExerciseForDetail}
          onClose={() => setSelectedExerciseForDetail(null)}
          isRtl={isRtl}
          onStartWorkout={() => {
            setSelectedExerciseForDetail(null);
            setIsLiveWorkoutOpen(true);
          }}
        />
      )}

      {/* 2. Swap Exercise Modal */}
      {selectedExerciseForSwap && (
        <SwapExerciseModal
          currentExercise={selectedExerciseForSwap}
          onSwap={handleSwapExercise}
          onClose={() => setSelectedExerciseForSwap(null)}
          isRtl={isRtl}
        />
      )}

      {/* 3. Live Workout Modal */}
      {isLiveWorkoutOpen && (
        <ActiveWorkoutModal
          dayTitle={selectedDay ? (isRtl ? `روز ${selectedDay.dayNumber} - ${selectedDay.titleFa}` : `Day ${selectedDay.dayNumber} - ${selectedDay.titleEn}`) : null}
          exercises={selectedDay?.exercises}
          onClose={() => setIsLiveWorkoutOpen(false)}
          isRtl={isRtl}
        />
      )}

    </div>
  );
}
