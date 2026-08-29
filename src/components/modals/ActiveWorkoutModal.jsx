import React, { useState, useEffect } from "react";
import { Check, X, Play, Pause, RotateCcw, ChevronRight, ChevronLeft, Dumbbell, Flame, Trophy, Clock } from "lucide-react";
import ExerciseGraphic from "../ExerciseGraphic";

export default function ActiveWorkoutModal({ onClose, isRtl, dayTitle, exercises: propExercises }) {
  const defaultExercises = [
    { id: "ex1", nameEn: "Jump Squat", nameFa: "اسکات پرشی", sets: 5, reps: "5 Reps", area: "Quads & Glutes" },
    { id: "ex2", nameEn: "Barbell Deadlift", nameFa: "ددلیفت با هالتر", sets: 3, reps: "3-5 Reps", area: "Hamstrings & Back" },
    { id: "ex3", nameEn: "Power Sled Push", nameFa: "هل دادن سورتمه قدرتی", sets: 4, reps: "30 Reps", area: "Full Body Explosive" },
    { id: "ex4", nameEn: "Barbell Squat", nameFa: "اسکات پشت با هالتر", sets: 4, reps: "6-8 Reps", area: "Quads & Core" },
    { id: "ex5", nameEn: "Smith Leg Press", nameFa: "پرس پا اسمیت", sets: 3, reps: "10-12 Reps", area: "Legs" },
    { id: "ex6", nameEn: "Dumbbell Romanian Deadlift", nameFa: "ددلیفت رومانیایی با دمبل", sets: 3, reps: "8-10 Reps", area: "Hamstrings" },
  ];

  const exercises = propExercises && propExercises.length > 0 ? propExercises : defaultExercises;
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState({});
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [restTimer, setRestTimer] = useState(null);
  const [isFinished, setIsFinished] = useState(false);

  const currentExercise = exercises[exerciseIndex] || exercises[0];

  // Stopwatch timer effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && !isFinished) {
      interval = setInterval(() => setTimerSeconds((prev) => prev + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isFinished]);

  // Rest Timer countdown
  useEffect(() => {
    let interval = null;
    if (restTimer !== null && restTimer > 0) {
      interval = setInterval(() => setRestTimer((prev) => prev - 1), 1000);
    } else if (restTimer === 0) {
      setRestTimer(null);
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  const toggleSet = (setNo) => {
    const key = `${exerciseIndex}-${setNo}`;
    setCompletedSets((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!prev[key]) {
        // Trigger 45s rest timer when completing set
        setRestTimer(45);
      }
      return next;
    });
  };

  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleNextExercise = () => {
    if (exerciseIndex < exercises.length - 1) {
      setExerciseIndex((prev) => prev + 1);
      setRestTimer(null);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrevExercise = () => {
    if (exerciseIndex > 0) {
      setExerciseIndex((prev) => prev - 1);
      setRestTimer(null);
    }
  };

  const currentSetsCount = currentExercise.sets 
    ? (typeof currentExercise.sets === 'number' ? currentExercise.sets : parseInt(currentExercise.sets, 10) || 4) 
    : 4;
  const totalCompletedCount = Object.values(completedSets).filter(Boolean).length;
  const estimatedCalories = Math.round((timerSeconds / 60) * 8.5) + (totalCompletedCount * 4);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="fixed inset-0 z-[100] w-full min-h-[100dvh] bg-[#090a0d] text-white flex flex-col justify-between overflow-y-auto font-sans select-none px-4 py-4 animate-in fade-in duration-200"
    >
      {/* Top HUD Navigation Bar */}
      <div className="border-b border-white/[0.08] pb-3 shrink-0">
        <div className="flex items-center justify-between">
          
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all active:scale-95 shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Center Routine Info & Multi-Segment Progress */}
          <div className="text-center flex flex-col items-center">
            <span className="text-[10px] font-black text-[#d17cd0] uppercase tracking-wider block">
              {dayTitle || (isRtl ? "تمرین زنده (LIVE SESSION)" : "LIVE WORKOUT SESSION")}
            </span>
            
            {/* Multi-segment exercise progress bar */}
            <div className="flex items-center gap-1 mt-1.5 w-32 max-w-full">
              {exercises.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    i < exerciseIndex
                      ? "bg-[#844783]"
                      : i === exerciseIndex
                      ? "bg-white animate-pulse"
                      : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Live Stopwatch Capsule */}
          <div className="flex items-center gap-2 bg-white/[0.06] backdrop-blur-xl border border-white/10 px-3.5 py-1.5 rounded-full shadow-inner" dir="ltr">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-black text-white">{formatTime(timerSeconds)}</span>
          </div>

        </div>
      </div>

      {!isFinished ? (
        <div className="my-auto py-3 space-y-4 flex-grow flex flex-col justify-center max-w-md mx-auto w-full">
          
          {/* Rest Timer Pop-up Banner */}
          {restTimer !== null && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/40 backdrop-blur-xl flex items-center justify-between animate-pulse shadow-lg">
              <div>
                <span className="text-xs font-black text-amber-400 uppercase block">{isRtl ? "زمان استراحت بین ست‌ها" : "Rest Interval"}</span>
                <p className="text-[11px] text-neutral-300 font-medium">{isRtl ? "تنفس عمیق و آماده‌سازی ست بعد..." : "Breathe & get ready for next set..."}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-black text-amber-400">{restTimer}s</span>
                <button
                  type="button"
                  onClick={() => setRestTimer((t) => (t || 0) + 15)}
                  className="text-[10px] bg-amber-500/20 border border-amber-500/30 px-2 py-1 rounded-lg text-amber-300 font-black hover:bg-amber-500/40"
                >
                  +15s
                </button>
                <button
                  type="button"
                  onClick={() => setRestTimer(null)}
                  className="text-[10px] bg-amber-500/20 border border-amber-500/30 px-2 py-1 rounded-lg text-amber-300 font-black hover:bg-amber-500/40"
                >
                  {isRtl ? "رد کردن" : "Skip"}
                </button>
              </div>
            </div>
          )}

          {/* High-End Apple Fitness+ Style Exercise Card */}
          <div className="p-5 rounded-[28px] bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] space-y-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
            
            {/* Top Category and Exercise Index */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-neutral-400 uppercase tracking-wider">
                {isRtl ? `حرکت ${exerciseIndex + 1} از ${exercises.length}` : `EXERCISE ${exerciseIndex + 1} OF ${exercises.length}`}
              </span>
              <span className="px-3 py-0.5 rounded-full bg-[#844783]/20 border border-[#844783]/40 text-[#d17cd0] text-[10px] font-black uppercase">
                {currentExercise.area || currentExercise.target || "Body Conditioning"}
              </span>
            </div>

            {/* Centered Graphic Preview Container */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-neutral-950/90 border border-white/10 mx-auto overflow-hidden shadow-inner flex items-center justify-center">
              <ExerciseGraphic exerciseId={currentExercise.id || `ex${exerciseIndex+1}`} name={currentExercise.nameEn} />
            </div>

            {/* Exercise Title & Badges */}
            <div className="text-center">
              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">
                {isRtl ? currentExercise.nameFa || currentExercise.nameEn : currentExercise.nameEn}
              </h3>
              
              {/* Single-row clean stats chips */}
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl">
                  ⚡ {currentSetsCount} Sets
                </span>
                <span className="text-xs font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-xl">
                  ⏱ {(currentExercise.reps || "8-10").toString().replace(/reps/gi, "").trim()} {isRtl ? "تکرار" : "Reps"}
                </span>
                <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">
                  🔥 ~{estimatedCalories} kcal
                </span>
              </div>
            </div>

            {/* Sets Tracker Checklist */}
            <div className="space-y-2 pt-2 border-t border-white/[0.08]">
              {Array.from({ length: currentSetsCount }).map((_, sIdx) => {
                const setNo = sIdx + 1;
                const isChecked = !!completedSets[`${exerciseIndex}-${setNo}`];
                return (
                  <button
                    key={setNo}
                    type="button"
                    onClick={() => toggleSet(setNo)}
                    className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all duration-200 active:scale-[0.99] ${
                      isChecked
                        ? "bg-gradient-to-r from-[#844783] via-[#944e93] to-[#a356a2] border-white/40 text-white shadow-md shadow-[#844783]/30"
                        : "bg-white/[0.04] border-white/[0.08] hover:border-white/20 text-neutral-300 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200 shrink-0 ${
                          isChecked ? "bg-white border-white text-[#844783]" : "border-neutral-500 bg-black/40"
                        }`}
                      >
                        {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-black tracking-tight">
                        {isRtl ? `ست ${setNo}` : `Set ${setNo}`} ({(currentExercise.reps || "8-10").toString().replace(/reps/gi, "").trim()} {isRtl ? "تکرار" : "Reps"})
                      </span>
                    </div>

                    <span className={`text-[11px] font-bold ${isChecked ? "text-white" : "text-neutral-500"}`}>
                      {isChecked ? (isRtl ? "ثبت شد ✓" : "Done ✓") : (isRtl ? "لمس برای ثبت" : "Tap to complete")}
                    </span>
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      ) : (
        /* Finished Celebration Screen */
        <div className="my-auto py-12 flex flex-col items-center text-center space-y-6 max-w-sm mx-auto">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-[#844783] p-1 shadow-[0_0_40px_rgba(16,185,129,0.4)] flex items-center justify-center animate-bounce">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <Trophy className="w-12 h-12 text-amber-300" />
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase">
              {isRtl ? "تمرین با موفقیت انجام شد! 🎉" : "WORKOUT COMPLETED! 🎉"}
            </h2>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              {isRtl
                ? "عالی بود! تمام ست‌ها و رکوردهای شما در تاریخچه و استریک ورزشی ذخیره شد."
                : "Great job! All sets, volume, and calories have been logged to your fitness streak."}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full">
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
              <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <span className="text-xs font-bold text-neutral-400 block">{isRtl ? "زمان" : "Duration"}</span>
              <span className="text-sm font-black text-white">{formatTime(timerSeconds)}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
              <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <span className="text-xs font-bold text-neutral-400 block">{isRtl ? "کالری" : "Calories"}</span>
              <span className="text-sm font-black text-white">{estimatedCalories} kcal</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
              <Dumbbell className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <span className="text-xs font-bold text-neutral-400 block">{isRtl ? "حرکات" : "Exercises"}</span>
              <span className="text-sm font-black text-white">{exercises.length}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full h-14 bg-white text-black font-black rounded-full text-base shadow-xl hover:bg-neutral-200 active:scale-95 transition-all"
          >
            {isRtl ? "بازگشت به برنامه اصلی" : "Done & Return"}
          </button>
        </div>
      )}

      {/* Footer Controls (Guaranteed on Top of viewport with Zero Overlap) */}
      {!isFinished && (
        <div className="space-y-3 pt-2 shrink-0 max-w-md mx-auto w-full">
          <button
            type="button"
            onClick={handleNextExercise}
            className="w-full h-14 bg-gradient-to-r from-[#844783] via-[#9e529d] to-[#a356a2] hover:brightness-110 text-white font-black rounded-full text-base flex items-center justify-center gap-2 shadow-[0_0_35px_rgba(132,71,131,0.6)] active:scale-98 transition-all border border-white/20"
          >
            <span>
              {exerciseIndex < exercises.length - 1
                ? (isRtl ? "حرکت بعدی" : "Next Exercise")
                : (isRtl ? "پایان و ثبت تمرین 🎉" : "Finish Workout 🎉")}
            </span>
            {isRtl ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>

          <div className="flex items-center justify-between text-xs text-neutral-400 font-bold px-2">
            {exerciseIndex > 0 ? (
              <button
                type="button"
                onClick={handlePrevExercise}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                <span>{isRtl ? "حرکت قبلی" : "Prev"}</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isTimerRunning ? (isRtl ? "توقف تایمر" : "Pause") : (isRtl ? "ادامه" : "Resume")}</span>
            </button>

            <button
              type="button"
              onClick={() => setTimerSeconds(0)}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isRtl ? "ریست" : "Reset"}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
