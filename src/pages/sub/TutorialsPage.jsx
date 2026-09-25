import React, { useState } from "react";
import { Clock, Eye, Play } from "lucide-react";
import { Card, IconWell, Label, List, Row, Screen, Sheet, Tag, TopBar } from "../../components/ui/kit";

// Tutorials: the lesson list; a lesson opens in a sheet with its player.

const COPY = {
  en: {
    title: "Academy", lessons: "Video Lessons", watch: "Click to Watch Video Lesson", views: "views",
    level: { beginner: "Beginner", all: "All Levels", nutrition: "Nutrition", intermediate: "Intermediate" },
    category: { chest: "Chest", legs: "Legs", diet: "Diet", back: "Back" },
  },
  fa: {
    title: "آکادمی", lessons: "ویدیوها و مقالات آموزش حرکت", watch: "برای تماشای ویدیو ضربه بزنید", views: "بازدید",
    level: { beginner: "مبتدی", all: "همه‌ی سطوح", nutrition: "تغذیه", intermediate: "متوسط" },
    category: { chest: "سینه", legs: "پا", diet: "رژیم", back: "پشت" },
  },
};

export default function TutorialsPage({ onBack, isRtl }) {
  const [selectedLesson, setSelectedLesson] = useState(null);
  const c = COPY[isRtl ? "fa" : "en"];

  const lessons = [
    { id: 1, titleEn: "Proper Bench Press Technique", titleFa: "تکنیک صحیح حرکت پرس سینه", duration: "08:15", level: "beginner", category: "chest", views: "12.4k" },
    { id: 2, titleEn: "Squat Form & Knee Alignment", titleFa: "فرم صحیح اسکات و تراز زانوها", duration: "10:30", level: "all", category: "legs", views: "18.9k" },
    { id: 3, titleEn: "Mastering Protein & Macro Timing", titleFa: "اصول زمان‌بندی مصرف پروتئین و ماکروها", duration: "12:00", level: "nutrition", category: "diet", views: "24.1k" },
    { id: 4, titleEn: "Deadlift Form & Lower Back Safety", titleFa: "تکنیک ددلیفت و حفاظت از گودی کمر", duration: "14:20", level: "intermediate", category: "back", views: "15.7k" },
  ];
  const titleOf = (l) => (isRtl ? l.titleFa : l.titleEn);
  const sep = isRtl ? "، " : " · ";

  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={c.title} />

      <Label as="h2" className="m-0 mt-2 px-1">{c.lessons}</Label>
      <List>
        {lessons.map((lesson) => (
          <Row key={lesson.id} isRtl={isRtl} chevron onClick={() => setSelectedLesson(lesson)}
            icon={<IconWell tone="inv" size={48} square><Play className="w-5 h-5 fill-current" strokeWidth={2} /></IconWell>}
            title={titleOf(lesson)}
            subtitle={(
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" strokeWidth={2} />
                <span dir="ltr">{lesson.duration}</span>{sep}{c.level[lesson.level]}
              </span>
            )} />
        ))}
      </List>

      <Sheet open={!!selectedLesson} isRtl={isRtl} onClose={() => setSelectedLesson(null)}
        title={selectedLesson ? c.category[selectedLesson.category] : ""}>
        {selectedLesson && (
          <>
            <Card tone="hero" className="h-48 flex flex-col items-center justify-center gap-3 cursor-pointer">
              <span className="w-16 h-16 rounded-full bg-accent text-on-accent flex items-center justify-center transition-transform active:scale-95">
                <Play className="w-7 h-7 fill-current ms-1" strokeWidth={2} />
              </span>
              <span className="text-[13px] font-medium text-hero-muted">{c.watch}</span>
            </Card>
            <h3 className="m-0 font-display font-extrabold text-[24px] leading-tight tracking-[-0.02em] text-ink">{titleOf(selectedLesson)}</h3>
            <div className="flex flex-wrap gap-1.5">
              <Tag tone="card"><Clock className="w-3.5 h-3.5" strokeWidth={2} /><span dir="ltr">{selectedLesson.duration}</span></Tag>
              <Tag tone="card">{c.level[selectedLesson.level]}</Tag>
              <Tag tone="card"><Eye className="w-3.5 h-3.5" strokeWidth={2} /><span dir="ltr">{selectedLesson.views}</span> {c.views}</Tag>
            </div>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
