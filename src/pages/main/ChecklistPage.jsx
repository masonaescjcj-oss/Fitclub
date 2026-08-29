import React, { useState } from "react";
import { CheckSquare, Check, Droplets, BookOpen, Dumbbell, Moon } from "lucide-react";

export default function ChecklistPage({ isRtl }) {
  const [tasks, setTasks] = useState([
    { id: 1, textEn: "Drink 8 glasses of water 💧", textFa: "۸ لیوان آب بنوشید 💧", completed: true, icon: <Droplets className="w-5 h-5 text-cyan-400" /> },
    { id: 2, textEn: "Complete today's 45-min workout 🏋️", textFa: "ورزش ۴۵ دقیقه‌ای روزانه 🏋️", completed: true, icon: <Dumbbell className="w-5 h-5 text-[#844783]" /> },
    { id: 3, textEn: "20 Minutes meditation & relaxation 🧘", textFa: "۲۰ دقیقه مدیتیشن و آرامش 🧘", completed: false, icon: <Moon className="w-5 h-5 text-purple-400" /> },
    { id: 4, textEn: "Read 10 pages of book 📖", textFa: "مطالعه ۱۰ صفحه کتاب 📖", completed: false, icon: <BookOpen className="w-5 h-5 text-amber-400" /> },
  ]);

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="w-full min-h-[100dvh] bg-black text-white px-4 pt-6 pb-28 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-black text-[#844783] uppercase tracking-wider">
            {isRtl ? "عادت‌ها و وظایف روزانه" : "DAILY HABIT TRACKER"}
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            {isRtl ? "چک‌لیست روزانه" : "Daily Checklist"}
          </h1>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-[#844783]/20 border border-[#844783]/40 flex items-center justify-center text-[#844783]">
          <CheckSquare className="w-5 h-5" />
        </div>
      </div>

      {/* Daily Completion Progress Bar */}
      <div className="p-5 rounded-3xl bg-[#141416] border border-white/10 space-y-3">
        <div className="flex justify-between items-center text-xs font-black">
          <span className="text-white uppercase">{isRtl ? "پیشرفت کارهای امروز" : "Completion Progress"}</span>
          <span className="text-[#844783]">{completedCount} / {tasks.length} {isRtl ? "تکمیل شده" : "Completed"}</span>
        </div>
        <div className="w-full bg-neutral-900 h-3 rounded-full overflow-hidden p-0.5 border border-white/5">
          <div
            className="bg-gradient-to-r from-[#844783] to-[#a356a2] h-full rounded-full transition-all duration-300 shadow-md"
            style={{ width: `${(completedCount / tasks.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
              task.completed
                ? "bg-[#141416]/50 border-white/5 opacity-75"
                : "bg-[#141416] border-white/10 hover:border-[#844783]/40"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                  task.completed
                    ? "bg-[#844783] border-[#844783] text-white"
                    : "border-neutral-500 bg-black/40"
                }`}
              >
                {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
              <span
                className={`text-sm font-black transition-all ${
                  task.completed ? "line-through text-gray-500" : "text-white"
                }`}
              >
                {isRtl ? task.textFa : task.textEn}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-neutral-900 border border-white/10 shrink-0">
              {task.icon}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
