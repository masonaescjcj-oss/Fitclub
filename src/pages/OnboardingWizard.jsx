import React, { useState } from "react";
import { applyOnboardingToProfile } from "../lib/nutrition/profile";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Home, Building2, Activity, Utensils, Leaf, Drumstick, WheatOff, Scan, ChevronDown, Scale, Flame, GraduationCap, Zap as Lightning, Footprints, Sparkles, Star } from "lucide-react";
import Header from "../components/Header";

const frontMuscles = ["Shoulder", "Biceps", "Chest", "Neck", "Legs", "Abs"];
const backMuscles = ["Trapezius", "Deltoids", "Triceps", "Legs", "Calf muscles", "Hips"];

const muscleTranslations = {
  fa: {
    Shoulder: "سرشانه", Triceps: "پشت بازو", Biceps: "جلو بازو", Chest: "سینه", Neck: "گردن",
    Legs: "پاها", Abs: "شکم", "Calf muscles": "ساق پا", Trapezius: "کول", Deltoids: "سرشانه پشتی",
    Hips: "باسن", Front: "جلوی بدن", Back: "پشت بدن", Next: "بعدی", All: "همه",
  },
  en: {
    Shoulder: "Shoulder", Triceps: "Triceps", Biceps: "Biceps", Chest: "Chest", Neck: "Neck",
    Legs: "Legs", Abs: "Abs", "Calf muscles": "Calf muscles", Trapezius: "Trapezius", Deltoids: "Deltoids",
    Hips: "Hips", Front: "Front side", Back: "Back side", Next: "Next", All: "All",
  }
};

export default function OnboardingWizard({ onNavigate }) {
  const [stepIndex, setStepIndex] = useState(0);

  const language = localStorage.getItem("language") || "en";
  const isRtl = language === "fa";

  const [muscleSide, setMuscleSide] = useState("front");
  const [heightUnit, setHeightUnit] = useState("cm");
  const [weightUnit, setWeightUnit] = useState("kg");

  const allInitialMuscles = Array.from(new Set([...frontMuscles, ...backMuscles]));

  // Form State
  const [formData, setFormData] = useState({
    goal: "Keep Fit",
    frequency: "3_4",
    gender: "male",
    focusAreas: allInitialMuscles,
    level: "intermediate",
    location: "gym",
    equipment: "full_gym",
    age: 26,
    height: 174,
    weight: 76,
    difficulty: "moderate",
    dietType: "high_protein",
    workoutProgram: "full_body",
    mealProgram: "maintain",
  });

  const stepsData = [
    {
      key: "goal",
      titleEn: "What is your main goal?",
      titleFa: "هدف اصلی شما چیست؟",
      type: "single",
      options: [
        { id: "Weight Loss", labelEn: "Weight Loss", labelFa: "کاهش وزن" },
        { id: "Muscle Gain", labelEn: "Muscle Gain", labelFa: "افزایش عضله" },
        { id: "Keep Fit", labelEn: "Keep Fit", labelFa: "تثبیت وزن" },
        { id: "Max Strength", labelEn: "Max Strength", labelFa: "حداکثر قدرت" },
      ]
    },
    {
      key: "frequency",
      titleEn: "How many days per week can you train?",
      titleFa: "چند روز در هفته می‌توانید تمرین کنید؟",
      type: "single",
      options: [
        { id: "2_3", labelEn: "2 - 3 Days / Week", labelFa: "۲ تا ۳ روز در هفته" },
        { id: "3_4", labelEn: "3 - 4 Days / Week", labelFa: "۳ تا ۴ روز در هفته" },
        { id: "4_5", labelEn: "4 - 5 Days / Week", labelFa: "۴ تا ۵ روز در هفته" },
        { id: "5_6", labelEn: "5 - 6 Days / Week", labelFa: "۵ تا ۶ روز در هفته" },
      ]
    },
    {
      key: "gender",
      titleEn: "Select Your Gender",
      titleFa: "جنسیت خود را انتخاب کنید",
      type: "gender",
      options: [
        { id: "male", labelEn: "Male", labelFa: "مرد", icon: "👨‍💼" },
        { id: "female", labelEn: "Female", labelFa: "زن", icon: "👩‍💼" }
      ]
    },
    {
      key: "focusAreas",
      titleEn: "TARGET MUSCLE",
      titleFa: "عضلات هدف",
      subtitleEn: "Select target muscle group",
      subtitleFa: "گروه عضلانی هدف را انتخاب کنید",
      type: "muscle-target",
    },
    {
      key: "level",
      titleEn: "What is your fitness level?",
      titleFa: "سطح آمادگی جسمانی شما چیست؟",
      type: "single",
      options: [
        { id: "beginner", labelEn: "Beginner", labelFa: "مبتدی" },
        { id: "intermediate", labelEn: "Intermediate", labelFa: "متوسط" },
        { id: "advanced", labelEn: "Advanced", labelFa: "حرفه‌ای" },
      ]
    },
    {
      key: "location",
      titleEn: "Where do you prefer to train?",
      titleFa: "محل تمرین مورد علاقه شما کجاست؟",
      type: "single",
      options: [
        { id: "gym", labelEn: "Gym", labelFa: "باشگاه ورزشی", icon: <Building2 className="w-6 h-6" /> },
        { id: "home", labelEn: "Home", labelFa: "خانه", icon: <Home className="w-6 h-6" /> },
        { id: "outdoor", labelEn: "Outdoor Park", labelFa: "فضای باز / پارک", icon: <Activity className="w-6 h-6" /> },
      ]
    },
    {
      key: "height",
      titleEn: "WHAT'S YOUR HEIGHT ?",
      titleFa: "قد شما چقدر است؟",
      type: "height-picker",
    },
    {
      key: "weight",
      titleEn: "WHAT'S YOUR CURRENT WEIGHT ?",
      titleFa: "وزن فعلی شما چقدر است؟",
      type: "weight-picker",
    },
    {
      key: "equipment",
      titleEn: "What equipment do you have?",
      titleFa: "به چه تجهیزاتی دسترسی دارید؟",
      type: "single",
      options: [
        { id: "full_gym", labelEn: "Full Gym Machines", labelFa: "تجهیزات کامل باشگاهی", icon: <Dumbbell className="w-6 h-6" /> },
        { id: "dumbbells", labelEn: "Dumbbells & Barbells", labelFa: "دمبل و هالتر", icon: <Dumbbell className="w-6 h-6" /> },
        { id: "bodyweight", labelEn: "Bodyweight Only", labelFa: "فقط وزن بدن (کالیستنیکس)", icon: <Activity className="w-6 h-6" /> },
      ]
    },
    {
      key: "difficulty",
      titleEn: "Preferred Workout Intensity",
      titleFa: "شدت و سختی تمرینات مد نظر",
      type: "single",
      options: [
        { id: "light", labelEn: "Light", labelFa: "سبک" },
        { id: "moderate", labelEn: "Moderate", labelFa: "متوسط" },
        { id: "intense", labelEn: "Intense", labelFa: "شدید" },
        { id: "extreme", labelEn: "Extreme", labelFa: "فوق‌العاده شدید" },
      ]
    },
    {
      key: "dietType",
      titleEn: "Dietary Preference",
      titleFa: "رژیم غذایی مورد علاقه شما",
      type: "single",
      options: [
        { id: "standard", labelEn: "Standard Diet", labelFa: "معمولی و همه‌چیزخوار", icon: <Utensils className="w-6 h-6" /> },
        { id: "high_protein", labelEn: "High Protein", labelFa: "پر پروتئین (تناسب اندام)", icon: <Drumstick className="w-6 h-6" /> },
        { id: "vegetarian", labelEn: "Vegetarian", labelFa: "گیاه‌خواری", icon: <Leaf className="w-6 h-6" /> },
        { id: "keto", labelEn: "Keto / Low Carb", labelFa: "کتوژنیک / کم کربوهیدرات", icon: <WheatOff className="w-6 h-6" /> },
      ]
    },
    {
      key: "workoutProgram",
      titleEn: "Select Your Workout Program",
      titleFa: "برنامه تمرینی خود را انتخاب کنید",
      subtitleEn: "Based on your goals, location and equipment, these programs are recommended:",
      subtitleFa: "بر اساس اهداف، محل تمرین و تجهیزات شما، این برنامه‌ها پیشنهاد شده‌اند:",
      type: "workout-program-picker",
    },
    {
      key: "mealProgram",
      titleEn: "Select Your Meal Program",
      titleFa: "برنامه تغذیه خود را انتخاب کنید",
      subtitleEn: "Based on your goal and diet type, these programs are recommended:",
      subtitleFa: "بر اساس هدف و نوع رژیم غذایی شما، این برنامه‌ها پیشنهاد شده‌اند:",
      type: "meal-program-picker",
    }
  ];

  const currentStepData = stepsData[stepIndex];
  const totalSteps = stepsData.length;

  const handleNext = () => {
    if (stepIndex === totalSteps - 1) {
      // The answers drove nothing before; the diet tab's targets read them now.
      applyOnboardingToProfile(formData);
    }
    if (stepIndex < totalSteps - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      onNavigate("ai-plan-summary");
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    } else {
      onNavigate("intro-hero");
    }
  };

  const handleOptionSelect = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleMuscleToggle = (muscle) => {
    setFormData((prev) => {
      const currentList = prev.focusAreas || [];
      if (currentList.includes(muscle)) {
        return { ...prev, focusAreas: currentList.filter((m) => m !== muscle) };
      } else {
        return { ...prev, focusAreas: [...currentList, muscle] };
      }
    });
  };

  const activeMuscles = muscleSide === "front" ? frontMuscles : backMuscles;
  const allActiveSelected = activeMuscles.every((m) => (formData.focusAreas || []).includes(m));

  const toggleAllActive = () => {
    if (allActiveSelected) {
      setFormData((prev) => ({
        ...prev,
        focusAreas: (prev.focusAreas || []).filter((m) => !activeMuscles.includes(m))
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        focusAreas: Array.from(new Set([...(prev.focusAreas || []), ...activeMuscles]))
      }));
    }
  };

  // Calculate live BMI
  const heightMeters = (formData.height || 174) / 100;
  const bmiValue = ((formData.weight || 76) / (heightMeters * heightMeters)).toFixed(1);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="w-full md:max-w-lg mx-auto min-h-[100dvh] bg-black text-white flex flex-col justify-between overflow-x-hidden relative font-sans select-none"
    >
      
      {/* Top Header with Aligned Dot-Dash Progress Indicator */}
      <Header
        onBack={handleBack}
        isRtl={isRtl}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
      />

      {/* Ultra-Fast Snappy Animated Content Wrapper (0.12s) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, x: isRtl ? -8 : 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRtl ? 8 : -8 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="flex-grow flex flex-col justify-start px-4 pt-2 pb-8 relative z-10"
        >
          
          {/* Title Header */}
          <div className={`mb-6 ${isRtl ? "text-right" : "text-left"}`}>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase" dir="ltr">
              {isRtl ? currentStepData.titleFa : currentStepData.titleEn}
            </h1>
            {currentStepData.subtitleEn && (
              <p className="text-xs text-neutral-400 font-semibold mt-1 leading-relaxed" dir={isRtl ? "rtl" : "ltr"}>
                {isRtl ? currentStepData.subtitleFa : currentStepData.subtitleEn}
              </p>
            )}
          </div>

          {/* SINGLE SELECT CARDS */}
          {currentStepData.type === "single" && (
            <div className="space-y-4">
              {currentStepData.options.map((opt) => {
                const isSelected = formData[currentStepData.key] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      handleOptionSelect(currentStepData.key, opt.id);
                      setTimeout(handleNext, 90);
                    }}
                    className={`w-full h-16 px-6 rounded-2xl border text-lg font-black transition-all duration-200 flex items-center justify-between relative overflow-hidden group active:scale-[0.99] ${
                      isRtl ? "text-right flex-row-reverse" : "text-left flex-row"
                    } ${
                      isSelected
                        ? "bg-gradient-to-r from-[#844783] to-[#9b4f9a] border-2 border-white text-white shadow-[0_0_25px_rgba(132,71,131,0.45)] scale-[1.01]"
                        : "bg-[#141416] border-white/10 text-neutral-200 hover:border-[#844783]/50 hover:bg-[#1a141c] hover:shadow-[0_0_20px_rgba(132,71,131,0.15)]"
                    }`}
                  >
                    <div className="flex items-center gap-4 z-10" dir={isRtl ? "rtl" : "ltr"}>
                      {opt.icon && (
                        <div className={`p-2.5 rounded-xl transition-all duration-200 ${isSelected ? "text-white bg-white/20" : "text-[#844783] bg-white/5 group-hover:bg-[#844783]/20"}`}>
                          {opt.icon}
                        </div>
                      )}
                      <span className="tracking-tight" dir={isRtl ? "rtl" : "ltr"}>
                        {isRtl ? opt.labelFa : opt.labelEn}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#844783] shrink-0 z-10 shadow-lg">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                          <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* GENDER SELECT CARDS */}
          {currentStepData.type === "gender" && (
            <div className="grid grid-cols-2 gap-4">
              {currentStepData.options.map((opt) => {
                const isSelected = formData.gender === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      handleOptionSelect("gender", opt.id);
                      setTimeout(handleNext, 90);
                    }}
                    className={`p-7 rounded-3xl border flex flex-col items-center justify-center gap-4 transition-all duration-200 active:scale-[0.98] ${
                      isSelected
                        ? "bg-gradient-to-br from-[#844783] to-[#9b4f9a] border-2 border-white text-white shadow-[0_0_25px_rgba(132,71,131,0.45)] scale-[1.02]"
                        : "bg-[#141416] border-white/10 text-neutral-300 hover:border-[#844783]/50 hover:bg-[#1a141c]"
                    }`}
                  >
                    <span className="text-6xl">{opt.icon}</span>
                    <span className="text-lg font-black text-white" dir={isRtl ? "rtl" : "ltr"}>
                      {isRtl ? opt.labelFa : opt.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TARGET MUSCLE SELECTOR */}
          {currentStepData.type === "muscle-target" && (
            <div className="space-y-2.5 flex flex-col items-center w-full">
              
              <div className="flex bg-[#141416] p-1 rounded-full border border-white/10 w-full max-w-[260px] mb-1 mx-auto">
                <button
                  type="button"
                  onClick={() => setMuscleSide("front")}
                  className={`flex-1 py-1.5 rounded-full text-xs font-black transition-all duration-200 ${
                    muscleSide === "front"
                      ? "bg-[#844783] text-white shadow-lg shadow-[#844783]/40"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {muscleTranslations[language]?.Front}
                </button>
                <button
                  type="button"
                  onClick={() => setMuscleSide("back")}
                  className={`flex-1 py-1.5 rounded-full text-xs font-black transition-all duration-200 ${
                    muscleSide === "back"
                      ? "bg-[#844783] text-white shadow-lg shadow-[#844783]/40"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {muscleTranslations[language]?.Back}
                </button>
              </div>

              <div className="w-full max-w-[260px] mx-auto space-y-1.5">
                {activeMuscles.map((muscle) => {
                  const isSelected = (formData.focusAreas || []).includes(muscle);
                  const label = muscleTranslations[language]?.[muscle] || muscle;
                  return (
                    <button
                      key={muscle}
                      type="button"
                      onClick={() => handleMuscleToggle(muscle)}
                      className={`w-full h-10 px-3.5 rounded-xl border flex items-center justify-between transition-all duration-200 ${
                        isRtl ? "text-right flex-row-reverse" : "text-left flex-row"
                      } ${
                        isSelected
                          ? "bg-gradient-to-r from-[#844783] to-[#9b4f9a] border-white text-white shadow-md"
                          : "bg-[#141416] border-white/10 text-neutral-300 hover:border-[#844783]/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-white border-white text-[#844783]" : "border-neutral-500"
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                              <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-black tracking-tight">{label}</span>
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={toggleAllActive}
                  className={`w-full h-10 px-3.5 rounded-xl border flex items-center justify-between transition-all duration-200 ${
                    isRtl ? "text-right flex-row-reverse" : "text-left flex-row"
                  } ${
                    allActiveSelected
                      ? "bg-gradient-to-r from-[#844783] to-[#9b4f9a] border-white text-white shadow-md"
                      : "bg-[#141416] border-white/10 text-neutral-300 hover:border-[#844783]/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      allActiveSelected ? "bg-white border-white text-[#844783]" : "border-neutral-500"
                    }`}>
                      {allActiveSelected && (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                          <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-black tracking-tight">
                      {muscleTranslations[language]?.All}
                    </span>
                  </div>
                </button>
              </div>

              <div className="pt-2 w-full">
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full h-12 bg-[#844783] hover:bg-[#965595] text-white font-black rounded-full transition-all text-sm flex items-center justify-center shadow-lg shadow-[#844783]/20 active:scale-[0.98]"
                >
                  <span>{muscleTranslations[language]?.Next || "Next"}</span>
                </button>
              </div>

            </div>
          )}

          {/* HEIGHT PICKER */}
          {currentStepData.type === "height-picker" && (
            <div className="space-y-6 flex flex-col justify-between flex-grow">
              
              <div className="flex justify-center mt-2">
                <div className="flex bg-[#141416] p-1.5 rounded-full border border-white/10 w-48 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setHeightUnit("cm")}
                    className={`flex-1 py-2.5 rounded-full text-sm font-black transition-all duration-200 ${
                      heightUnit === "cm"
                        ? "bg-[#844783] text-white shadow-lg shadow-[#844783]/40"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    cm
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeightUnit("ft")}
                    className={`flex-1 py-2.5 rounded-full text-sm font-black transition-all duration-200 ${
                      heightUnit === "ft"
                        ? "bg-[#844783] text-white shadow-lg shadow-[#844783]/40"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    ft
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-around px-4 py-8 relative my-auto">
                <div className="flex items-baseline gap-1" dir="ltr">
                  <span className="text-6xl font-black text-[#844783] tracking-tighter">
                    {formData.height}
                  </span>
                  <span className="text-2xl font-black text-[#844783]">{heightUnit}</span>
                </div>

                <div className="relative flex items-center justify-center h-64 w-24 bg-[#141416]/80 rounded-3xl border border-white/10 p-2 overflow-hidden shadow-inner">
                  <div className="absolute right-0 w-8 h-1 bg-[#844783] rounded-l-full z-20 shadow-[0_0_12px_#844783]" />
                  <input
                    type="range"
                    min="130"
                    max="220"
                    value={formData.height}
                    onChange={(e) => setFormData((prev) => ({ ...prev, height: Number(e.target.value) }))}
                    className="accent-[#844783] h-56 w-12 cursor-pointer z-10 opacity-70"
                    style={{ writingMode: "bt-lr", appearance: "slider-vertical" }}
                  />
                </div>
              </div>

              <div className="pt-4 mt-auto">
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full h-14 bg-[#844783] hover:bg-[#965595] text-white font-black rounded-full transition-all text-sm flex items-center justify-center shadow-lg shadow-[#844783]/20 active:scale-[0.98]"
                >
                  <span>{isRtl ? "ادامه و محاسبه" : "Let's Calculate"}</span>
                </button>
              </div>

            </div>
          )}

          {/* WEIGHT PICKER */}
          {currentStepData.type === "weight-picker" && (
            <div className="space-y-6 flex flex-col justify-between flex-grow">
              
              <div className="flex justify-center mt-2">
                <div className="flex bg-[#141416] p-1.5 rounded-full border border-white/10 w-48 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setWeightUnit("kg")}
                    className={`flex-1 py-2.5 rounded-full text-sm font-black transition-all duration-200 ${
                      weightUnit === "kg"
                        ? "bg-[#844783] text-white shadow-lg shadow-[#844783]/40"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    kg
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeightUnit("lb")}
                    className={`flex-1 py-2.5 rounded-full text-sm font-black transition-all duration-200 ${
                      weightUnit === "lb"
                        ? "bg-[#844783] text-white shadow-lg shadow-[#844783]/40"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    lb
                  </button>
                </div>
              </div>

              <div className="text-center my-2" dir="ltr">
                <span className="text-6xl font-black text-[#844783] tracking-tighter">
                  {formData.weight}
                </span>
                <span className="text-2xl font-black text-[#844783] ml-1.5">{weightUnit}</span>
              </div>

              <div className="px-4 relative py-2">
                <div className="relative flex items-center justify-center">
                  <div className="absolute top-0 bottom-0 w-1 bg-[#844783] rounded-full z-20 shadow-[0_0_12px_#844783]" />
                  <input
                    type="range"
                    min="40"
                    max="150"
                    value={formData.weight}
                    onChange={(e) => setFormData((prev) => ({ ...prev, weight: Number(e.target.value) }))}
                    className="w-full accent-[#844783] h-4 bg-neutral-900 rounded-lg cursor-pointer border border-white/10"
                  />
                </div>

                <div className="flex justify-between text-xs font-bold text-gray-500 mt-2 px-1" dir="ltr">
                  <span>40 kg</span>
                  <span>65 kg</span>
                  <span>90 kg</span>
                  <span>120 kg</span>
                  <span>150 kg</span>
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-[#141416] border border-white/10 flex items-start gap-4 shadow-sm text-left rtl:text-right">
                <div className="w-12 h-12 rounded-2xl bg-[#844783]/20 border border-[#844783]/40 flex items-center justify-center text-[#844783] shrink-0">
                  <Scan className="w-6 h-6" />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-white">
                      {isRtl ? `شاخص BMI فعلی شما - ${bmiValue}` : `Your Current BMI - ${bmiValue}`}
                    </h3>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-neutral-400 font-medium leading-relaxed mt-1">
                    {isRtl
                      ? "تنها به چند جلسه تمرینی عالی برای رسیدن به تناسب اندام ایده‌آل نیاز دارید!"
                      : "You just need a few more sweaty exercises to see a fitter you!"}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-auto">
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full h-14 bg-[#844783] hover:bg-[#965595] text-white font-black rounded-full transition-all text-sm flex items-center justify-center shadow-lg shadow-[#844783]/20 active:scale-[0.98]"
                >
                  <span>{isRtl ? "ادامه" : "Next"}</span>
                </button>
              </div>

            </div>
          )}

          {/* WORKOUT PROGRAM PICKER */}
          {currentStepData.type === "workout-program-picker" && (
            <div className="space-y-4 flex flex-col justify-between flex-grow">
              
              <div className="space-y-3.5">
                {[
                  {
                    id: "full_body",
                    recommended: true,
                    icon: <Dumbbell className="w-6 h-6 text-emerald-400" />,
                    titleEn: "Full Body Plus - 4 Days",
                    titleFa: "فول بادی پلاس - ۴ روز در هفته",
                    descEn: "Full body strength with an extra conditioning day.",
                    descFa: "تمرینات استقامتی کامل بدن به همراه یک روز چابکی اضافه.",
                    badge1En: "Duration: 30 Days", badge1Fa: "مدت: ۳۰ روز",
                    badge2En: "Target Days/Week: 4 days", badge2Fa: "تمرین: ۴ روز در هفته"
                  },
                  {
                    id: "agility_power",
                    recommended: false,
                    icon: <Lightning className="w-6 h-6 text-amber-400" />,
                    titleEn: "Agility & Power - 4 Days",
                    titleFa: "چابکی و قدرت - ۴ روز در هفته",
                    descEn: "Enhance sports performance and reflex speed.",
                    descFa: "افزایش عملکرد ورزشی، توان انفجاری و سرعت رفلکس.",
                    badge1En: "Duration: 30 Days", badge1Fa: "مدت: ۳۰ روز",
                    badge2En: "Target Days/Week: 4 days", badge2Fa: "تمرین: ۴ روز در هفته"
                  },
                  {
                    id: "runner_conditioning",
                    recommended: false,
                    icon: <Footprints className="w-6 h-6 text-purple-400" />,
                    titleEn: "Runner Conditioning - 4 Days",
                    titleFa: "آمادگی و چابکی دونده - ۴ روز در هفته",
                    descEn: "Mix of long runs and HIIT for performance.",
                    descFa: "ترکیب دویدن‌های استقامتی و HIIT برای آمادگی بالا.",
                    badge1En: "Duration: 30 Days", badge1Fa: "مدت: ۳۰ روز",
                    badge2En: "Target Days/Week: 4 days", badge2Fa: "تمرین: ۴ روز در هفته"
                  }
                ].map((prog) => {
                  const isSelected = formData.workoutProgram === prog.id;
                  return (
                    <div
                      key={prog.id}
                      onClick={() => handleOptionSelect("workoutProgram", prog.id)}
                      className={`w-full p-5 rounded-3xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        isSelected
                          ? "bg-gradient-to-br from-[#844783]/90 via-[#703b6f] to-[#4a2449] border-2 border-white text-white shadow-[0_0_30px_rgba(132,71,131,0.5)] scale-[1.01]"
                          : "bg-[#141416] border-white/10 text-neutral-300 hover:border-[#844783]/50 hover:bg-[#1a141c]"
                      }`}
                    >
                      {prog.recommended && (
                        <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md flex items-center gap-1 z-20">
                          <Star className="w-3 h-3 fill-black text-black" />
                          <span>RECOMMENDED</span>
                        </div>
                      )}

                      <div className="flex items-start gap-4 mb-3">
                        <div className={`p-3 rounded-2xl shrink-0 ${isSelected ? "bg-white/20 text-white" : "bg-white/5"}`}>
                          {prog.icon}
                        </div>
                        <div className="flex-grow pr-16 rtl:pr-0 rtl:pl-16">
                          <h3 className="text-lg font-black text-white leading-snug">
                            {isRtl ? prog.titleFa : prog.titleEn}
                          </h3>
                          <p className="text-xs text-neutral-300 font-medium leading-relaxed mt-1">
                            {isRtl ? prog.descFa : prog.descEn}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#844783] shrink-0 shadow-lg">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                              <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-white/10 flex-wrap" dir="ltr">
                        <span className="bg-white/10 border border-white/15 text-[11px] font-bold px-3 py-1 rounded-xl text-neutral-200">
                          {isRtl ? prog.badge1Fa : prog.badge1En}
                        </span>
                        <span className="bg-white/10 border border-white/15 text-[11px] font-bold px-3 py-1 rounded-xl text-neutral-200">
                          {isRtl ? prog.badge2Fa : prog.badge2En}
                        </span>
                      </div>

                    </div>
                  );
                })}
              </div>

              <div className="pt-4 mt-auto">
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full h-14 bg-[#844783] hover:bg-[#965595] text-white font-black rounded-full transition-all text-sm flex items-center justify-center shadow-lg shadow-[#844783]/20 active:scale-[0.98]"
                >
                  <span>{isRtl ? "ادامه" : "Next"}</span>
                </button>
              </div>

            </div>
          )}

          {/* MEAL PROGRAM PICKER */}
          {currentStepData.type === "meal-program-picker" && (
            <div className="space-y-4 flex flex-col justify-between flex-grow">
              
              <div className="space-y-3.5">
                {[
                  {
                    id: "maintain",
                    recommended: true,
                    icon: <Scale className="w-6 h-6 text-amber-400" />,
                    titleEn: "Maintain weight",
                    titleFa: "تثبیت وزن و تعادل نهایی",
                    protein: "30%", carbs: "45%", fat: "25%",
                    extraKcal: null,
                  },
                  {
                    id: "muscle_gain",
                    recommended: false,
                    icon: <Flame className="w-6 h-6 text-purple-400" />,
                    titleEn: "Muscle gain with minimal fat",
                    titleFa: "افزایش عضله با حداقل درصد چربی",
                    protein: "30%", carbs: "45%", fat: "25%",
                    extraKcal: "+300 KCAL",
                  },
                  {
                    id: "affordable",
                    recommended: false,
                    icon: <GraduationCap className="w-6 h-6 text-cyan-400" />,
                    titleEn: "Affordable nutrition",
                    titleFa: "تغذیه اقتصادی و کاملاً در دسترس",
                    protein: "30%", carbs: "45%", fat: "25%",
                    extraKcal: "+200 KCAL",
                  }
                ].map((prog) => {
                  const isSelected = formData.mealProgram === prog.id;
                  return (
                    <div
                      key={prog.id}
                      onClick={() => handleOptionSelect("mealProgram", prog.id)}
                      className={`w-full p-5 rounded-3xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        isSelected
                          ? "bg-gradient-to-br from-[#844783]/90 via-[#703b6f] to-[#4a2449] border-2 border-white text-white shadow-[0_0_30px_rgba(132,71,131,0.5)] scale-[1.01]"
                          : "bg-[#141416] border-white/10 text-neutral-300 hover:border-[#844783]/50 hover:bg-[#1a141c]"
                      }`}
                    >
                      {prog.recommended && (
                        <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md flex items-center gap-1 z-20">
                          <Star className="w-3 h-3 fill-black text-black" />
                          <span>RECOMMENDED</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3.5">
                          <div className={`p-3 rounded-2xl shrink-0 ${isSelected ? "bg-white/20 text-white" : "bg-white/5"}`}>
                            {prog.icon}
                          </div>
                          <h3 className="text-lg font-black text-white leading-snug">
                            {isRtl ? prog.titleFa : prog.titleEn}
                          </h3>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#844783] shrink-0 shadow-lg">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                              <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <div className="flex items-center gap-2 flex-wrap" dir="ltr">
                          <span className="bg-white/10 border border-white/15 text-[11px] font-bold px-3 py-1 rounded-xl text-neutral-200">
                            Protein: {prog.protein}
                          </span>
                          <span className="bg-white/10 border border-white/15 text-[11px] font-bold px-3 py-1 rounded-xl text-neutral-200">
                            Carbs: {prog.carbs}
                          </span>
                          <span className="bg-white/10 border border-white/15 text-[11px] font-bold px-3 py-1 rounded-xl text-neutral-200">
                            Fat: {prog.fat}
                          </span>
                        </div>

                        {prog.extraKcal && (
                          <span className="text-emerald-400 font-black text-xs bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full shrink-0">
                            {prog.extraKcal}
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

              <div className="pt-4 mt-auto">
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full h-14 bg-gradient-to-r from-[#844783] to-[#a356a2] hover:from-[#965595] hover:to-[#b461b3] text-white font-black rounded-full transition-all text-base flex items-center justify-center gap-2 shadow-xl shadow-[#844783]/30 active:scale-[0.98]"
                >
                  <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300" />
                  <span>{isRtl ? "ایجاد برنامه کامل تمرینی و تغذیه" : "Generate Complete Workout & Meal Plan"}</span>
                </button>
              </div>

            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
