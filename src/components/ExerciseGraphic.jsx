import React from "react";
import { Dumbbell } from "lucide-react";

export default function ExerciseGraphic({ exerciseId, name, className = "" }) {
  const exId = (exerciseId || "").toLowerCase();
  const exName = (name || "").toLowerCase();

  // 1. Jump Squat - Anatomical figure with glowing quads & glutes
  if (exId.includes("ex1") || exName.includes("jump squat")) {
    return (
      <div className={`w-full h-full bg-jet flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle className="fill-hero-fg" cx="50" cy="18" r="8" />
          <path className="fill-hero-muted" d="M44 26 L56 26 L54 50 L46 50 Z" />
          <path className="stroke-hero-fg" d="M44 28 L34 42 M56 28 L66 42" strokeWidth="3.5" strokeLinecap="round" />
          <path className="stroke-accent" d="M45 50 L38 68 L44 86" strokeWidth="5" strokeLinecap="round" />
          <path className="stroke-accent" d="M55 50 L62 68 L56 86" strokeWidth="5" strokeLinecap="round" />
          <path className="stroke-hero-muted" d="M44 86 L38 90 M56 86 L62 90" strokeWidth="3.5" strokeLinecap="round" />
          <path className="stroke-accent" d="M30 92 L36 88 M64 88 L70 92" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 2. Barbell Deadlift - Lifter with barbell & highlighted hamstrings
  if (exId.includes("ex2") || (exName.includes("deadlift") && !exName.includes("dumbbell"))) {
    return (
      <div className={`w-full h-full bg-jet flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <rect className="fill-hero-muted/60" x="14" y="58" width="6" height="22" rx="3" />
          <rect className="fill-hero-muted/60" x="80" y="58" width="6" height="22" rx="3" />
          <line className="stroke-hero-muted" x1="16" y1="69" x2="84" y2="69" strokeWidth="3" />
          <circle className="fill-hero-fg" cx="50" cy="24" r="7" />
          <path className="stroke-hero-muted" d="M50 31 L50 52" strokeWidth="4" strokeLinecap="round" />
          <path className="stroke-hero-fg" d="M46 34 L36 68 M54 34 L64 68" strokeWidth="3.5" strokeLinecap="round" />
          <path className="stroke-accent" d="M47 52 L42 70 L43 90" strokeWidth="4.5" strokeLinecap="round" />
          <path className="stroke-accent" d="M53 52 L58 70 L57 90" strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 3. Power Sled Push - Crisp white container like screenshot
  if (exId.includes("ex3") || exName.includes("sled")) {
    return (
      <div className={`w-full h-full bg-jet flex items-center justify-center p-1 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <path className="stroke-hero-fg" d="M58 78 L92 78 M70 78 L70 36 M85 78 L85 36" strokeWidth="4" strokeLinecap="round" />
          <line className="stroke-hero-muted/60" x1="68" y1="36" x2="87" y2="36" strokeWidth="3" />
          <rect className="fill-accent" x="74" y="52" width="7" height="24" rx="2" />
          <circle className="fill-hero-fg" cx="28" cy="40" r="6" />
          <path className="stroke-hero-fg" d="M30 46 L46 58" strokeWidth="4" strokeLinecap="round" />
          <path className="stroke-hero-muted" d="M42 54 L68 44" strokeWidth="3.5" strokeLinecap="round" />
          <path className="stroke-accent" d="M46 58 L36 70 L24 82" strokeWidth="4" strokeLinecap="round" />
          <path className="stroke-accent" d="M46 58 L56 70 L50 82" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 4. Barbell Squat - Athlete in deep squat
  if (exId.includes("ex4") || exName.includes("barbell squat")) {
    return (
      <div className={`w-full h-full bg-jet flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <line className="stroke-hero-muted" x1="18" y1="36" x2="82" y2="36" strokeWidth="3" />
          <rect className="fill-hero-muted/60" x="14" y="28" width="5" height="16" rx="2" />
          <rect className="fill-hero-muted/60" x="81" y="28" width="5" height="16" rx="2" />
          <circle className="fill-hero-fg" cx="50" cy="24" r="7" />
          <path className="fill-hero-muted" d="M46 36 L47 56 L53 56 L54 36 Z" />
          <path className="stroke-hero-fg" d="M44 36 L36 36 M56 36 L64 36" strokeWidth="3" strokeLinecap="round" />
          <path className="stroke-accent" d="M47 56 L34 66 L44 86" strokeWidth="4.5" strokeLinecap="round" />
          <path className="stroke-accent" d="M53 56 L66 66 L56 86" strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 5. Smith Leg Press - Machine Frame
  if (exId.includes("ex5") || exName.includes("leg press") || exName.includes("smith")) {
    return (
      <div className={`w-full h-full bg-jet flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <line className="stroke-hero-fg" x1="26" y1="16" x2="26" y2="86" strokeWidth="3" />
          <line className="stroke-hero-fg" x1="74" y1="16" x2="74" y2="86" strokeWidth="3" />
          <line className="stroke-hero-muted" x1="22" y1="18" x2="78" y2="18" strokeWidth="3.5" />
          <line className="stroke-hero-muted" x1="22" y1="84" x2="78" y2="84" strokeWidth="3.5" />
          <rect className="fill-accent" x="22" y="44" width="56" height="6" rx="2" />
          <rect className="fill-hero-muted/60" x="18" y="38" width="6" height="18" rx="2" />
          <rect className="fill-hero-muted/60" x="76" y="38" width="6" height="18" rx="2" />
          <path className="stroke-hero-muted" d="M40 76 L50 64 L60 76" strokeWidth="3" strokeLinecap="round" />
          <circle className="fill-hero-muted" cx="50" cy="80" r="5" />
          <path className="stroke-accent" d="M46 64 L46 50 M54 64 L54 50" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 6. Dumbbell Romanian Deadlift - Crisp white container
  if (exId.includes("ex6") || exName.includes("romanian") || (exName.includes("dumbbell") && exName.includes("deadlift"))) {
    return (
      <div className={`w-full h-full bg-jet flex items-center justify-center p-1.5 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle className="fill-hero-fg" cx="50" cy="20" r="7" />
          <path className="stroke-hero-fg" d="M50 27 L50 50" strokeWidth="4" strokeLinecap="round" />
          <path className="stroke-hero-muted" d="M46 32 L38 62 M54 32 L62 62" strokeWidth="3" strokeLinecap="round" />
          <rect className="fill-hero-fg" x="34" y="60" width="8" height="12" rx="2" />
          <rect className="fill-hero-fg" x="58" y="60" width="8" height="12" rx="2" />
          <path className="stroke-accent" d="M47 50 L42 68 L44 88" strokeWidth="4.5" strokeLinecap="round" />
          <path className="stroke-accent" d="M53 50 L58 68 L56 88" strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 7. Ladder Agility Drills
  if (exName.includes("ladder") || exName.includes("agility")) {
    return (
      <div className={`w-full h-full bg-jet flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Agility Ladder */}
          <line className="stroke-hero-muted/70" x1="30" y1="15" x2="30" y2="85" strokeWidth="3" />
          <line className="stroke-hero-muted/70" x1="70" y1="15" x2="70" y2="85" strokeWidth="3" />
          <line className="stroke-hero-muted/70" x1="30" y1="28" x2="70" y2="28" strokeWidth="3" />
          <line className="stroke-hero-muted/70" x1="30" y1="46" x2="70" y2="46" strokeWidth="3" />
          <line className="stroke-hero-muted/70" x1="30" y1="64" x2="70" y2="64" strokeWidth="3" />
          <line className="stroke-hero-muted/70" x1="30" y1="82" x2="70" y2="82" strokeWidth="3" />
          {/* Quick Feet Dots */}
          <circle cx="50" cy="37" r="5" className="fill-accent animate-ping" />
          <circle className="fill-hero-fg" cx="50" cy="55" r="5" />
          <circle className="fill-hero-fg" cx="50" cy="73" r="5" />
        </svg>
      </div>
    );
  }

  // 8. Lateral Cone Hops
  if (exName.includes("cone") || exName.includes("lateral")) {
    return (
      <div className={`w-full h-full bg-jet flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Cone 1 */}
          <polygon className="fill-accent" points="30,75 42,75 36,45" />
          <rect className="fill-accent/60" x="26" y="75" width="20" height="4" rx="1" />
          {/* Cone 2 */}
          <polygon className="fill-accent" points="58,75 70,75 64,45" />
          <rect className="fill-accent/60" x="54" y="75" width="20" height="4" rx="1" />
          {/* Hop trajectory */}
          <path className="stroke-hero-fg" d="M20 60 Q50 15 80 60" strokeWidth="3" strokeDasharray="4 4" />
          <circle className="fill-accent" cx="50" cy="28" r="6" />
        </svg>
      </div>
    );
  }

  // 9. Kettlebell / Goblet
  if (exName.includes("kettlebell") || exName.includes("goblet")) {
    return (
      <div className={`w-full h-full bg-jet flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle className="fill-hero-muted stroke-hero-muted/60" cx="50" cy="58" r="22" strokeWidth="2" />
          <path className="stroke-hero-muted" d="M40 38 C40 22, 60 22, 60 38" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle className="fill-accent" cx="50" cy="58" r="8" />
        </svg>
      </div>
    );
  }

  // 10. Bench Press
  if (exName.includes("bench press")) {
    return (
      <div className={`w-full h-full bg-jet flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <line className="stroke-hero-muted/60" x1="20" y1="65" x2="80" y2="65" strokeWidth="4" />
          <line className="stroke-hero-muted/60" x1="30" y1="65" x2="30" y2="85" strokeWidth="3" />
          <line className="stroke-hero-muted/60" x1="70" y1="65" x2="70" y2="85" strokeWidth="3" />
          <line className="stroke-hero-muted" x1="16" y1="36" x2="84" y2="36" strokeWidth="3" />
          <rect className="fill-hero-muted/60" x="12" y="26" width="6" height="20" rx="2" />
          <rect className="fill-hero-muted/60" x="82" y="26" width="6" height="20" rx="2" />
          <path className="stroke-accent" d="M44 60 L44 42 M56 60 L56 42" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // Default fallback
  return (
    <div className={`w-full h-full bg-jet flex items-center justify-center text-accent ${className}`}>
      <Dumbbell className="w-7 h-7" strokeWidth={2} />
    </div>
  );
}
