import React, { useEffect, useRef, useState } from "react";
import { applyOnboardingToProfile } from "../lib/nutrition/profile";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Check, CheckCheck, Drumstick, Dumbbell, Flame, Footprints, GraduationCap, HeartPulse, Home, Leaf, Minus,
  PersonStanding, Plus, Scale, Scan, Star, Trees, TrendingDown, Utensils, WheatOff, Zap as Lightning,
} from "lucide-react";
import { Card, Chip, CtaButton, IconButton, IconWell, Label, Segmented, cx, num } from "../components/ui/kit";
import { TrainIcon } from "../components/ui/icons";
import Header, { FlowFooter, FlowScreen, FlowTitle } from "../components/Header";

// The onboarding questionnaire: one question per step, answered on cards
// that turn ink when picked. Single-choice steps move on by themselves; every
// step also has a pinned button so the current pick can be kept as it is.

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

/* ─────────────── glyphs lucide doesn't have in this version ─────────────── */

const Glyph = ({ className = "", children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" className={className}>
    {children}
  </svg>
);
const MaleIcon = (p) => <Glyph {...p}><circle cx="10" cy="14" r="5.5" /><path d="M14 10l5.5-5.5M14.5 4.5h5v5" /></Glyph>;
const FemaleIcon = (p) => <Glyph {...p}><circle cx="12" cy="9" r="5.5" /><path d="M12 14.5V21M9 18h6" /></Glyph>;

/* ─────────────── selection surfaces: card when open, ink when picked ─────────────── */

const optionTone = (on) => (on ? "bg-inv text-on-inv" : "bg-card text-ink");
const wellTone = (on) => (on ? "bg-on-inv/10 text-accent dark:bg-jet" : "bg-sunk text-ink");
const subTone = (on) => (on ? "text-on-inv/65" : "text-muted");
const tagTone = (on) => (on ? "bg-on-inv/10 text-on-inv/85" : "bg-sunk text-ink");
const pressable = "border-0 cursor-pointer text-start transition-[background-color,color,transform] duration-150 active:scale-[0.98]";
const tagCls = "h-7 px-3 rounded-full inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap";

/** The round mark on a picked card: accent on ink, ink on paper at night. */
function Tick({ on, className = "" }) {
  return (
    <span aria-hidden="true"
      className={cx("w-[26px] h-[26px] shrink-0 rounded-full flex items-center justify-center transition-colors",
        on ? "bg-accent text-on-accent dark:bg-jet dark:text-accent" : "ring-2 ring-inset ring-faint", className)}>
      {on && <Check className="w-[15px] h-[15px]" strokeWidth={3} />}
    </span>
  );
}

function Well({ on, size = 44, children }) {
  return (
    <span style={{ width: size, height: size }}
      className={cx("shrink-0 rounded-full flex items-center justify-center transition-colors", wellTone(on))}>
      {children}
    </span>
  );
}

/** Four rising bars for workout intensity. */
function IntensityBars({ level, on }) {
  return (
    <span className={cx("w-11 h-11 shrink-0 rounded-full flex items-end justify-center gap-[3px] pb-[13px] transition-colors", wellTone(on))}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} style={{ height: 6 + i * 4 }}
          className={cx("w-1 rounded-full", i < level ? "bg-current" : on ? "bg-on-inv/25 dark:bg-hero-fg/25" : "bg-faint")} />
      ))}
    </span>
  );
}

/** A full-width answer row. */
function OptionRow({ on, onClick, lead, label, desc, ariaLabel }) {
  return (
    <button type="button" aria-pressed={on} aria-label={ariaLabel} onClick={onClick}
      className={cx("w-full min-h-[68px] rounded-3xl px-4 py-3 flex items-center gap-3.5", pressable, optionTone(on))}>
      {lead}
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-[17px] font-bold leading-snug">{label}</span>
        {desc && <span className={cx("text-[13px] leading-snug", subTone(on))}>{desc}</span>}
      </span>
      <Tick on={on} />
    </button>
  );
}

/** A tile in a two-column grid, with the tick in its top corner once picked. */
function OptionTile({ on, onClick, top, children, ariaLabel, className = "" }) {
  return (
    <button type="button" aria-pressed={on} aria-label={ariaLabel} onClick={onClick}
      className={cx("relative rounded-3xl p-4 flex flex-col items-start justify-between", pressable, optionTone(on), className)}>
      {top}
      {on && <Tick on className="absolute top-3.5 end-3.5" />}
      {children}
    </button>
  );
}

/**
 * A number picker: a big readout above a slider with − and + either side.
 * The value is always stored in metric; `format` shows it in the chosen unit.
 */
function MeasurePicker({ value, min, max, onChange, format, unit, isRtl, label, ltrReadout }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, v)));
  const pct = (value - min) / (max - min);
  return (
    <Card className="flex flex-col items-center gap-7 pt-9 pb-5">
      <div className="flex items-baseline gap-2">
        <span dir={ltrReadout ? "ltr" : undefined}
          className="font-display font-extrabold text-[88px] leading-[0.85] tracking-[-0.05em] rtl:tracking-normal text-ink">{format(value)}</span>
        {unit && <span className="text-xl font-bold text-muted">{unit}</span>}
      </div>
      <div className="w-full flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <IconButton tone="soft" label={isRtl ? "کمتر" : "Less"} onClick={() => set(value - 1)} disabled={value <= min}
            className="disabled:opacity-40">
            <Minus className="w-5 h-5" strokeWidth={2} />
          </IconButton>
          <div className="relative flex-1 min-w-0 h-11 flex items-center">
            <span aria-hidden="true" className="absolute inset-x-0 h-2 rounded-full bg-line overflow-hidden">
              <span className="absolute inset-y-0 start-0 rounded-full bg-inv"
                style={{ width: `calc(14px + (100% - 28px) * ${pct})` }} />
            </span>
            <input type="range" min={min} max={max} step={1} value={value} aria-label={label}
              aria-valuetext={`${format(value)}${unit ? ` ${unit}` : ""}`}
              onChange={(e) => set(Number(e.target.value))}
              className={cx("relative w-full h-7 m-0 p-0 appearance-none bg-transparent cursor-pointer",
                "[&::-webkit-slider-runnable-track]:h-7 [&::-webkit-slider-runnable-track]:bg-transparent",
                "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full",
                "[&::-webkit-slider-thumb]:bg-inv [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-card [&::-webkit-slider-thumb]:shadow-lift",
                "[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full",
                "[&::-moz-range-thumb]:bg-inv [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-card")} />
          </div>
          <IconButton tone="soft" label={isRtl ? "بیشتر" : "More"} onClick={() => set(value + 1)} disabled={value >= max}
            className="disabled:opacity-40">
            <Plus className="w-5 h-5" strokeWidth={2} />
          </IconButton>
        </div>
        <div className="flex justify-between px-14 font-mono text-xs text-muted">
          <span dir={ltrReadout ? "ltr" : undefined}>{format(min)}</span>
          <span dir={ltrReadout ? "ltr" : undefined}>{format(max)}</span>
        </div>
      </div>
    </Card>
  );
}

export default function OnboardingWizard({ onNavigate }) {
  const [stepIndex, setStepIndex] = useState(0);

  const language = localStorage.getItem("language") || "en";
  const isRtl = language === "fa";
  const mt = muscleTranslations[language];
  const n = (v) => num(v, isRtl);

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
      subtitleEn: "Pick one. You can change it any time.",
      subtitleFa: "یکی را انتخاب کنید. هر زمان می‌توانید تغییرش دهید.",
      type: "single",
      options: [
        { id: "Weight Loss", labelEn: "Weight Loss", labelFa: "کاهش وزن", Icon: TrendingDown, descEn: "Keep strength, drop weight", descFa: "قدرت بماند، وزن کم شود" },
        { id: "Muscle Gain", labelEn: "Muscle Gain", labelFa: "افزایش عضله", Icon: Dumbbell, descEn: "Size, with progressive overload", descFa: "حجم، با اضافه‌بار تدریجی" },
        { id: "Keep Fit", labelEn: "Keep Fit", labelFa: "تثبیت وزن", Icon: HeartPulse, descEn: "Stay lean and keep moving", descFa: "روی فرم بمانید و فعال باشید" },
        { id: "Max Strength", labelEn: "Max Strength", labelFa: "حداکثر قدرت", Icon: Lightning, descEn: "Chase numbers on the big lifts", descFa: "رکورد در حرکات اصلی" },
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
      titleEn: "Select your gender",
      titleFa: "جنسیت خود را انتخاب کنید",
      type: "gender",
      options: [
        { id: "male", labelEn: "Male", labelFa: "مرد", Icon: MaleIcon },
        { id: "female", labelEn: "Female", labelFa: "زن", Icon: FemaleIcon }
      ]
    },
    {
      key: "focusAreas",
      titleEn: "Target muscles",
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
        { id: "beginner", labelEn: "Beginner", labelFa: "مبتدی", descEn: "New to training, or back after a long break", descFa: "تازه‌کار، یا برگشته بعد از یک وقفه‌ی طولانی" },
        { id: "intermediate", labelEn: "Intermediate", labelFa: "متوسط", descEn: "Training regularly for six months or more", descFa: "بیش از شش ماه تمرین منظم" },
        { id: "advanced", labelEn: "Advanced", labelFa: "حرفه‌ای", descEn: "Years of structured training", descFa: "چند سال تمرین اصولی و برنامه‌دار" },
      ]
    },
    {
      key: "location",
      titleEn: "Where do you prefer to train?",
      titleFa: "محل تمرین مورد علاقه شما کجاست؟",
      type: "single",
      options: [
        { id: "gym", labelEn: "Gym", labelFa: "باشگاه ورزشی", Icon: Building2 },
        { id: "home", labelEn: "Home", labelFa: "خانه", Icon: Home },
        { id: "outdoor", labelEn: "Outdoor Park", labelFa: "فضای باز / پارک", Icon: Trees },
      ]
    },
    {
      key: "height",
      titleEn: "What's your height?",
      titleFa: "قد شما چقدر است؟",
      type: "height-picker",
    },
    {
      key: "weight",
      titleEn: "What's your current weight?",
      titleFa: "وزن فعلی شما چقدر است؟",
      type: "weight-picker",
    },
    {
      key: "equipment",
      titleEn: "What equipment do you have?",
      titleFa: "به چه تجهیزاتی دسترسی دارید؟",
      type: "single",
      options: [
        { id: "full_gym", labelEn: "Full Gym Machines", labelFa: "تجهیزات کامل باشگاهی", Icon: TrainIcon },
        { id: "dumbbells", labelEn: "Dumbbells & Barbells", labelFa: "دمبل و هالتر", Icon: Dumbbell },
        { id: "bodyweight", labelEn: "Bodyweight Only", labelFa: "فقط وزن بدن (کالیستنیکس)", Icon: PersonStanding },
      ]
    },
    {
      key: "difficulty",
      titleEn: "Preferred workout intensity",
      titleFa: "شدت و سختی تمرینات مد نظر",
      type: "single",
      options: [
        { id: "light", labelEn: "Light", labelFa: "سبک", bars: 1 },
        { id: "moderate", labelEn: "Moderate", labelFa: "متوسط", bars: 2 },
        { id: "intense", labelEn: "Intense", labelFa: "شدید", bars: 3 },
        { id: "extreme", labelEn: "Extreme", labelFa: "فوق‌العاده شدید", bars: 4 },
      ]
    },
    {
      key: "dietType",
      titleEn: "Dietary preference",
      titleFa: "رژیم غذایی مورد علاقه شما",
      type: "single",
      options: [
        { id: "standard", labelEn: "Standard Diet", labelFa: "معمولی و همه‌چیزخوار", Icon: Utensils },
        { id: "high_protein", labelEn: "High Protein", labelFa: "پر پروتئین (تناسب اندام)", Icon: Drumstick },
        { id: "vegetarian", labelEn: "Vegetarian", labelFa: "گیاه‌خواری", Icon: Leaf },
        { id: "keto", labelEn: "Keto / Low Carb", labelFa: "کتوژنیک / کم کربوهیدرات", Icon: WheatOff },
      ]
    },
    {
      key: "workoutProgram",
      titleEn: "Select your workout program",
      titleFa: "برنامه تمرینی خود را انتخاب کنید",
      subtitleEn: "Based on your goals, location and equipment, these programs are recommended:",
      subtitleFa: "بر اساس اهداف، محل تمرین و تجهیزات شما، این برنامه‌ها پیشنهاد شده‌اند:",
      type: "workout-program-picker",
    },
    {
      key: "mealProgram",
      titleEn: "Select your meal program",
      titleFa: "برنامه تغذیه خود را انتخاب کنید",
      subtitleEn: "Based on your goal and diet type, these programs are recommended:",
      subtitleFa: "بر اساس هدف و نوع رژیم غذایی شما، این برنامه‌ها پیشنهاد شده‌اند:",
      type: "meal-program-picker",
    }
  ];

  const workoutPrograms = [
    {
      id: "full_body",
      recommended: true,
      Icon: Dumbbell,
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
      Icon: Lightning,
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
      Icon: Footprints,
      titleEn: "Runner Conditioning - 4 Days",
      titleFa: "آمادگی و چابکی دونده - ۴ روز در هفته",
      descEn: "Mix of long runs and HIIT for performance.",
      descFa: "ترکیب دویدن‌های استقامتی و HIIT برای آمادگی بالا.",
      badge1En: "Duration: 30 Days", badge1Fa: "مدت: ۳۰ روز",
      badge2En: "Target Days/Week: 4 days", badge2Fa: "تمرین: ۴ روز در هفته"
    }
  ];

  const mealPrograms = [
    {
      id: "maintain",
      recommended: true,
      Icon: Scale,
      titleEn: "Maintain weight",
      titleFa: "تثبیت وزن و تعادل نهایی",
      protein: "30%", carbs: "45%", fat: "25%",
      extraKcal: null,
    },
    {
      id: "muscle_gain",
      recommended: false,
      Icon: Flame,
      titleEn: "Muscle gain with minimal fat",
      titleFa: "افزایش عضله با حداقل درصد چربی",
      protein: "30%", carbs: "45%", fat: "25%",
      extraKcal: 300,
    },
    {
      id: "affordable",
      recommended: false,
      Icon: GraduationCap,
      titleEn: "Affordable nutrition",
      titleFa: "تغذیه اقتصادی و کاملاً در دسترس",
      protein: "30%", carbs: "45%", fat: "25%",
      extraKcal: 200,
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

  // A single choice moves on by itself after the pick has shown.
  const choose = (key, value) => {
    handleOptionSelect(key, value);
    setTimeout(handleNext, 90);
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

  // Height and weight are stored in cm and kg; the unit switch changes only how they read.
  const formatHeight = (cm) => {
    if (heightUnit === "cm") return n(cm);
    const inches = cm / 2.54;
    let ft = Math.floor(inches / 12);
    let inch = Math.round(inches - ft * 12);
    if (inch === 12) { ft += 1; inch = 0; }
    return `${n(ft)}′${n(inch)}″`;
  };
  const formatWeight = (kg) => n(weightUnit === "kg" ? kg : Math.round(kg * 2.20462));
  const unitName = {
    cm: isRtl ? "سانتی‌متر" : "cm", ft: isRtl ? "فوت" : "ft",
    kg: isRtl ? "کیلوگرم" : "kg", lb: isRtl ? "پوند" : "lb",
  };

  // Each step starts at its top, however far the last one was scrolled.
  const stepRef = useRef(null);
  useEffect(() => {
    stepRef.current?.parentElement?.scrollTo?.(0, 0);
  }, [stepIndex]);

  const label = (o) => (isRtl ? o.labelFa : o.labelEn);
  const nextLabel = isRtl ? "ادامه" : "Next";
  const type = currentStepData.type;
  const key = currentStepData.key;

  const footerLabel = {
    "muscle-target": mt?.Next || "Next",
    "height-picker": isRtl ? "ادامه و محاسبه" : "Let's Calculate",
    "meal-program-picker": isRtl ? "ایجاد برنامه کامل تمرینی و تغذیه" : "Generate Complete Workout & Meal Plan",
  }[type] || nextLabel;

  const selectedCount = (formData.focusAreas || []).length;

  return (
    <FlowScreen isRtl={isRtl}>
      <Header onBack={handleBack} isRtl={isRtl} stepIndex={stepIndex} totalSteps={totalSteps} />

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          ref={stepRef}
          initial={{ opacity: 0, x: isRtl ? -10 : 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRtl ? 10 : -10 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          className="flex-1 flex flex-col gap-3.5"
        >
          <FlowTitle size={36} className="!mt-4 mb-2"
            title={isRtl ? currentStepData.titleFa : currentStepData.titleEn}
            lede={currentStepData.subtitleEn ? (isRtl ? currentStepData.subtitleFa : currentStepData.subtitleEn) : null} />

          {/* GOAL: the board's two-by-two cards */}
          {type === "single" && key === "goal" && (
            <div className="grid grid-cols-2 gap-2.5">
              {currentStepData.options.map((opt) => {
                const on = formData.goal === opt.id;
                return (
                  <OptionTile key={opt.id} on={on} onClick={() => choose("goal", opt.id)} className="min-h-[140px]"
                    top={<Well on={on} size={40}><opt.Icon className="w-5 h-5" strokeWidth={2} /></Well>}>
                    <span className="flex flex-col gap-0.5 mt-4">
                      <span className="text-[17px] font-bold leading-snug">{label(opt)}</span>
                      <span className={cx("text-[13px] leading-snug", subTone(on))}>{isRtl ? opt.descFa : opt.descEn}</span>
                    </span>
                  </OptionTile>
                );
              })}
            </div>
          )}

          {/* FREQUENCY: big day counts */}
          {type === "single" && key === "frequency" && (
            <div className="grid grid-cols-2 gap-2.5">
              {currentStepData.options.map((opt) => {
                const on = formData.frequency === opt.id;
                return (
                  <OptionTile key={opt.id} on={on} onClick={() => choose("frequency", opt.id)} ariaLabel={label(opt)}
                    className="min-h-[120px] !justify-end">
                    <span className="font-display font-extrabold text-[44px] leading-none tracking-[-0.04em]">
                      {n(opt.id.replace("_", "–"))}
                    </span>
                    <span className={cx("mt-1.5 text-[13px]", subTone(on))}>{isRtl ? "روز در هفته" : "days a week"}</span>
                  </OptionTile>
                );
              })}
            </div>
          )}

          {/* EVERY OTHER SINGLE CHOICE: full-width rows */}
          {type === "single" && key !== "goal" && key !== "frequency" && (
            <div className="flex flex-col gap-2.5">
              {currentStepData.options.map((opt) => {
                const on = formData[key] === opt.id;
                const lead = opt.bars ? <IntensityBars level={opt.bars} on={on} />
                  : opt.Icon ? <Well on={on}><opt.Icon className="w-5 h-5" strokeWidth={2} /></Well> : null;
                return (
                  <OptionRow key={opt.id} on={on} onClick={() => choose(key, opt.id)} lead={lead}
                    label={label(opt)} desc={isRtl ? opt.descFa : opt.descEn} />
                );
              })}
            </div>
          )}

          {/* GENDER */}
          {type === "gender" && (
            <div className="grid grid-cols-2 gap-2.5">
              {currentStepData.options.map((opt) => {
                const on = formData.gender === opt.id;
                return (
                  <OptionTile key={opt.id} on={on} onClick={() => choose("gender", opt.id)}
                    className="min-h-[184px] !items-center !justify-center gap-4"
                    top={<Well on={on} size={64}><opt.Icon className="w-8 h-8" /></Well>}>
                    <span className="text-xl font-bold">{label(opt)}</span>
                  </OptionTile>
                );
              })}
            </div>
          )}

          {/* TARGET MUSCLES */}
          {type === "muscle-target" && (
            <>
              <Segmented value={muscleSide} onChange={setMuscleSide}
                options={[{ id: "front", label: mt?.Front }, { id: "back", label: mt?.Back }]} />
              <Card className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between gap-3">
                  <Label>{muscleSide === "front" ? mt?.Front : mt?.Back}</Label>
                  <span className="text-[13px] text-muted">
                    {isRtl
                      ? `${n(selectedCount)} از ${n(allInitialMuscles.length)} انتخاب شده`
                      : `${selectedCount} of ${allInitialMuscles.length} selected`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeMuscles.map((muscle) => {
                    const on = (formData.focusAreas || []).includes(muscle);
                    return (
                      <Chip key={muscle} active={on} onCard onClick={() => handleMuscleToggle(muscle)}
                        className="!h-11 !px-4 !text-[15px] !font-semibold">
                        {on && <Check className="w-4 h-4 -ms-0.5" strokeWidth={2.6} />}
                        {mt?.[muscle] || muscle}
                      </Chip>
                    );
                  })}
                </div>
                <button type="button" aria-pressed={allActiveSelected} onClick={toggleAllActive}
                  className="h-12 -mx-1 px-1 flex items-center gap-3 border-0 border-t border-solid border-hair bg-transparent cursor-pointer text-start text-ink">
                  <span className={cx("w-[26px] h-[26px] shrink-0 rounded-full flex items-center justify-center",
                    allActiveSelected ? "bg-jet text-accent dark:bg-accent dark:text-on-accent" : "ring-2 ring-inset ring-faint")}>
                    {allActiveSelected && <CheckCheck className="w-[15px] h-[15px]" strokeWidth={2.6} />}
                  </span>
                  <span className="text-[15px] font-semibold">{mt?.All}</span>
                </button>
              </Card>
            </>
          )}

          {/* HEIGHT */}
          {type === "height-picker" && (
            <>
              <Segmented value={heightUnit} onChange={setHeightUnit} className="self-center w-52"
                options={[{ id: "cm", label: unitName.cm }, { id: "ft", label: unitName.ft }]} />
              <MeasurePicker value={formData.height} min={130} max={220} isRtl={isRtl}
                onChange={(v) => setFormData((prev) => ({ ...prev, height: v }))}
                format={formatHeight} unit={heightUnit === "cm" ? unitName.cm : null} ltrReadout={heightUnit === "ft"}
                label={isRtl ? "قد" : "Height"} />
            </>
          )}

          {/* WEIGHT */}
          {type === "weight-picker" && (
            <>
              <Segmented value={weightUnit} onChange={setWeightUnit} className="self-center w-52"
                options={[{ id: "kg", label: unitName.kg }, { id: "lb", label: unitName.lb }]} />
              <MeasurePicker value={formData.weight} min={40} max={150} isRtl={isRtl}
                onChange={(v) => setFormData((prev) => ({ ...prev, weight: v }))}
                format={formatWeight} unit={unitName[weightUnit]} label={isRtl ? "وزن" : "Weight"} />
              <Card className="flex items-start gap-3.5">
                <IconWell tone="sunk" size={44}><Scan className="w-5 h-5" strokeWidth={2} /></IconWell>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px] font-bold">{isRtl ? "شاخص BMI فعلی شما" : "Your current BMI"}</span>
                    <span className="font-display font-extrabold text-[28px] leading-none tracking-[-0.03em]">{isRtl ? n(bmiValue).replace(".", "٫") : bmiValue}</span>
                  </div>
                  <p className="m-0 text-[13px] leading-snug text-muted">
                    {isRtl
                      ? "تنها به چند جلسه تمرینی عالی برای رسیدن به تناسب اندام ایده‌آل نیاز دارید!"
                      : "You just need a few more sweaty exercises to see a fitter you!"}
                  </p>
                </div>
              </Card>
            </>
          )}

          {/* WORKOUT PROGRAM */}
          {type === "workout-program-picker" && (
            <div className="flex flex-col gap-2.5">
              {workoutPrograms.map((prog) => {
                const on = formData.workoutProgram === prog.id;
                return (
                  <button key={prog.id} type="button" aria-pressed={on} onClick={() => handleOptionSelect("workoutProgram", prog.id)}
                    className={cx("w-full rounded-3xl p-4 flex flex-col gap-3.5", pressable, optionTone(on))}>
                    <span className="w-full flex items-start gap-3.5">
                      <Well on={on}><prog.Icon className="w-5 h-5" strokeWidth={2} /></Well>
                      <span className="flex-1 min-w-0 flex flex-col gap-1">
                        <span className="text-[17px] font-bold leading-snug">{isRtl ? prog.titleFa : prog.titleEn}</span>
                        <span className={cx("text-[13px] leading-snug", subTone(on))}>{isRtl ? prog.descFa : prog.descEn}</span>
                      </span>
                      <Tick on={on} />
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {prog.recommended && <RecommendedTag on={on} isRtl={isRtl} />}
                      <span className={cx(tagCls, tagTone(on))}>{isRtl ? prog.badge1Fa : prog.badge1En}</span>
                      <span className={cx(tagCls, tagTone(on))}>{isRtl ? prog.badge2Fa : prog.badge2En}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* MEAL PROGRAM */}
          {type === "meal-program-picker" && (
            <div className="flex flex-col gap-2.5">
              {mealPrograms.map((prog) => {
                const on = formData.mealProgram === prog.id;
                const pct = (p) => (isRtl ? num(p, true).replace("%", "٪") : p);
                return (
                  <button key={prog.id} type="button" aria-pressed={on} onClick={() => handleOptionSelect("mealProgram", prog.id)}
                    className={cx("w-full rounded-3xl p-4 flex flex-col gap-3.5", pressable, optionTone(on))}>
                    <span className="w-full flex items-center gap-3.5">
                      <Well on={on}><prog.Icon className="w-5 h-5" strokeWidth={2} /></Well>
                      <span className="flex-1 min-w-0 text-[17px] font-bold leading-snug">{isRtl ? prog.titleFa : prog.titleEn}</span>
                      <Tick on={on} />
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {prog.recommended && <RecommendedTag on={on} isRtl={isRtl} />}
                      <span className={cx(tagCls, tagTone(on))}>{isRtl ? "پروتئین" : "Protein"} {pct(prog.protein)}</span>
                      <span className={cx(tagCls, tagTone(on))}>{isRtl ? "کربوهیدرات" : "Carbs"} {pct(prog.carbs)}</span>
                      <span className={cx(tagCls, tagTone(on))}>{isRtl ? "چربی" : "Fat"} {pct(prog.fat)}</span>
                      {prog.extraKcal && (
                        <span className={cx(tagCls, on ? "bg-on-inv text-inv" : "bg-inv text-on-inv")}>
                          +{n(prog.extraKcal)} {isRtl ? "کالری" : "kcal"}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <FlowFooter>
            <CtaButton isRtl={isRtl} onClick={handleNext}
              className={type === "meal-program-picker" ? "!h-auto min-h-[56px] py-2 !text-[15px]" : ""}>
              {type === "meal-program-picker"
                ? <span className="block whitespace-normal text-start leading-tight">{footerLabel}</span>
                : footerLabel}
            </CtaButton>
          </FlowFooter>
        </motion.div>
      </AnimatePresence>
    </FlowScreen>
  );
}

function RecommendedTag({ on, isRtl }) {
  return (
    <span className={cx(tagCls, "!font-bold", on ? "bg-accent text-on-accent dark:bg-jet dark:text-accent" : "bg-accent text-on-accent")}>
      <Star className="w-3 h-3 fill-current" strokeWidth={2} />
      {isRtl ? "پیشنهادی" : "Recommended"}
    </span>
  );
}
