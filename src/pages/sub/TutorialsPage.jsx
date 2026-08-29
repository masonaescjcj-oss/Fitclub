import React, { useState } from "react";
import { GraduationCap, ArrowLeft, Play, Clock } from "lucide-react";

export default function TutorialsPage({ onBack, isRtl }) {
  const [selectedLesson, setSelectedLesson] = useState(null);

  const lessons = [
    { id: 1, titleEn: "Proper Bench Press Technique", titleFa: "تکنیک صحیح حرکت پرس سینه", duration: "08:15", level: "Beginner", category: "Chest", views: "12.4k" },
    { id: 2, titleEn: "Squat Form & Knee Alignment", titleFa: "فرم صحیح اسکات و تراز زانوها", duration: "10:30", level: "All Levels", category: "Legs", views: "18.9k" },
    { id: 3, titleEn: "Mastering Protein & Macro Timing", titleFa: "اصول زمان‌بندی مصرف پروتئین و ماکروها", duration: "12:00", level: "Nutrition", category: "Diet", views: "24.1k" },
    { id: 4, titleEn: "Deadlift Form & Lower Back Safety", titleFa: "تکنیک ددلیفت و حفاظت از گودی کمر", duration: "14:20", level: "Intermediate", category: "Back", views: "15.7k" },
  ];

  return (
    <div className="w-full min-h-[100dvh] bg-black text-white px-4 pt-6 pb-28 space-y-6 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-[#141416] border border-white/10 flex items-center justify-center text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
          <h1 className="text-xl font-black text-white">{isRtl ? "آکادمی و آموزش‌های ورزشی" : "Fitness Academy & Tutorials"}</h1>
        </div>
        <GraduationCap className="w-6 h-6 text-[#844783]" />
      </div>

      {/* Lesson Player Modal */}
      {selectedLesson && (
        <div className="p-5 rounded-3xl bg-neutral-900 border border-[#844783] space-y-3 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-[#844783] uppercase">{selectedLesson.category}</span>
            <button type="button" onClick={() => setSelectedLesson(null)} className="text-xs text-gray-400 hover:text-white">✕ Close</button>
          </div>

          <div className="w-full h-44 rounded-2xl bg-black border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer">
            <div className="w-14 h-14 rounded-full bg-[#844783] flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 fill-white ml-1" />
            </div>
            <span className="text-xs font-bold text-gray-300 mt-2">Click to Watch Video Lesson</span>
          </div>

          <h3 className="text-base font-black text-white">{isRtl ? selectedLesson.titleFa : selectedLesson.titleEn}</h3>
        </div>
      )}

      {/* Lessons List */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider px-1">
          {isRtl ? "ویدیوها و مقالات آموزش حرکت" : "Video Lessons"}
        </h3>

        {lessons.map((lesson) => (
          <div
            key={lesson.id}
            onClick={() => setSelectedLesson(lesson)}
            className="p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-between hover:border-[#844783]/40 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-center text-[#844783] shrink-0">
                <Play className="w-5 h-5 fill-[#844783]" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">{isRtl ? lesson.titleFa : lesson.titleEn}</h4>
                <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium mt-0.5">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <span>{lesson.duration} • {lesson.level}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
