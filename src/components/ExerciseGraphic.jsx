import React from "react";
import { Dumbbell } from "lucide-react";

export default function ExerciseGraphic({ exerciseId, name, className = "" }) {
  const exId = (exerciseId || "").toLowerCase();
  const exName = (name || "").toLowerCase();

  // 1. Jump Squat - Anatomical figure with glowing quads & glutes
  if (exId.includes("ex1") || exName.includes("jump squat")) {
    return (
      <div className={`w-full h-full bg-[#0e1015] flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full text-neutral-300" fill="none">
          <circle cx="50" cy="18" r="8" fill="#d1d5db" />
          <path d="M44 26 L56 26 L54 50 L46 50 Z" fill="#9ca3af" />
          <path d="M44 28 L34 42 M56 28 L66 42" stroke="#d1d5db" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M45 50 L38 68 L44 86" stroke="#f87171" strokeWidth="5" strokeLinecap="round" />
          <path d="M55 50 L62 68 L56 86" stroke="#f87171" strokeWidth="5" strokeLinecap="round" />
          <path d="M44 86 L38 90 M56 86 L62 90" stroke="#9ca3af" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M30 92 L36 88 M64 88 L70 92" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 2. Barbell Deadlift - Lifter with barbell & highlighted hamstrings
  if (exId.includes("ex2") || (exName.includes("deadlift") && !exName.includes("dumbbell"))) {
    return (
      <div className={`w-full h-full bg-[#0e1015] flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <rect x="14" y="58" width="6" height="22" rx="3" fill="#6b7280" />
          <rect x="80" y="58" width="6" height="22" rx="3" fill="#6b7280" />
          <line x1="16" y1="69" x2="84" y2="69" stroke="#9ca3af" strokeWidth="3" />
          <circle cx="50" cy="24" r="7" fill="#e5e7eb" />
          <path d="M50 31 L50 52" stroke="#9ca3af" strokeWidth="4" strokeLinecap="round" />
          <path d="M46 34 L36 68 M54 34 L64 68" stroke="#d1d5db" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M47 52 L42 70 L43 90" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M53 52 L58 70 L57 90" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 3. Power Sled Push - Crisp white container like screenshot
  if (exId.includes("ex3") || exName.includes("sled")) {
    return (
      <div className={`w-full h-full bg-white flex items-center justify-center p-1 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <path d="M58 78 L92 78 M70 78 L70 36 M85 78 L85 36" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
          <line x1="68" y1="36" x2="87" y2="36" stroke="#4b5563" strokeWidth="3" />
          <rect x="74" y="52" width="7" height="24" rx="2" fill="#ef4444" />
          <circle cx="28" cy="40" r="6" fill="#111827" />
          <path d="M30 46 L46 58" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
          <path d="M42 54 L68 44" stroke="#374151" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M46 58 L36 70 L24 82" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
          <path d="M46 58 L56 70 L50 82" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 4. Barbell Squat - Athlete in deep squat
  if (exId.includes("ex4") || exName.includes("barbell squat")) {
    return (
      <div className={`w-full h-full bg-[#0e1015] flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <line x1="18" y1="36" x2="82" y2="36" stroke="#9ca3af" strokeWidth="3" />
          <rect x="14" y="28" width="5" height="16" rx="2" fill="#6b7280" />
          <rect x="81" y="28" width="5" height="16" rx="2" fill="#6b7280" />
          <circle cx="50" cy="24" r="7" fill="#e5e7eb" />
          <path d="M46 36 L47 56 L53 56 L54 36 Z" fill="#9ca3af" />
          <path d="M44 36 L36 36 M56 36 L64 36" stroke="#d1d5db" strokeWidth="3" strokeLinecap="round" />
          <path d="M47 56 L34 66 L44 86" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M53 56 L66 66 L56 86" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 5. Smith Leg Press - Machine Frame
  if (exId.includes("ex5") || exName.includes("leg press") || exName.includes("smith")) {
    return (
      <div className={`w-full h-full bg-[#0e1015] flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <line x1="26" y1="16" x2="26" y2="86" stroke="#e5e7eb" strokeWidth="3" />
          <line x1="74" y1="16" x2="74" y2="86" stroke="#e5e7eb" strokeWidth="3" />
          <line x1="22" y1="18" x2="78" y2="18" stroke="#9ca3af" strokeWidth="3.5" />
          <line x1="22" y1="84" x2="78" y2="84" stroke="#9ca3af" strokeWidth="3.5" />
          <rect x="22" y="44" width="56" height="6" rx="2" fill="#ef4444" />
          <rect x="18" y="38" width="6" height="18" rx="2" fill="#6b7280" />
          <rect x="76" y="38" width="6" height="18" rx="2" fill="#6b7280" />
          <path d="M40 76 L50 64 L60 76" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="80" r="5" fill="#9ca3af" />
          <path d="M46 64 L46 50 M54 64 L54 50" stroke="#f87171" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 6. Dumbbell Romanian Deadlift - Crisp white container
  if (exId.includes("ex6") || exName.includes("romanian") || (exName.includes("dumbbell") && exName.includes("deadlift"))) {
    return (
      <div className={`w-full h-full bg-white flex items-center justify-center p-1.5 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle cx="50" cy="20" r="7" fill="#111827" />
          <path d="M50 27 L50 50" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
          <path d="M46 32 L38 62 M54 32 L62 62" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
          <rect x="34" y="60" width="8" height="12" rx="2" fill="#111827" />
          <rect x="58" y="60" width="8" height="12" rx="2" fill="#111827" />
          <path d="M47 50 L42 68 L44 88" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M53 50 L58 68 L56 88" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 7. Ladder Agility Drills
  if (exName.includes("ladder") || exName.includes("agility")) {
    return (
      <div className={`w-full h-full bg-[#0e1015] flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Agility Ladder */}
          <line x1="30" y1="15" x2="30" y2="85" stroke="#f59e0b" strokeWidth="3" />
          <line x1="70" y1="15" x2="70" y2="85" stroke="#f59e0b" strokeWidth="3" />
          <line x1="30" y1="28" x2="70" y2="28" stroke="#f59e0b" strokeWidth="3" />
          <line x1="30" y1="46" x2="70" y2="46" stroke="#f59e0b" strokeWidth="3" />
          <line x1="30" y1="64" x2="70" y2="64" stroke="#f59e0b" strokeWidth="3" />
          <line x1="30" y1="82" x2="70" y2="82" stroke="#f59e0b" strokeWidth="3" />
          {/* Quick Feet Dots */}
          <circle cx="50" cy="37" r="5" fill="#ef4444" className="animate-ping" />
          <circle cx="50" cy="55" r="5" fill="#38bdf8" />
          <circle cx="50" cy="73" r="5" fill="#38bdf8" />
        </svg>
      </div>
    );
  }

  // 8. Lateral Cone Hops
  if (exName.includes("cone") || exName.includes("lateral")) {
    return (
      <div className={`w-full h-full bg-[#0e1015] flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Cone 1 */}
          <polygon points="30,75 42,75 36,45" fill="#f97316" />
          <rect x="26" y="75" width="20" height="4" rx="1" fill="#ea580c" />
          {/* Cone 2 */}
          <polygon points="58,75 70,75 64,45" fill="#f97316" />
          <rect x="54" y="75" width="20" height="4" rx="1" fill="#ea580c" />
          {/* Hop trajectory */}
          <path d="M20 60 Q50 15 80 60" stroke="#38bdf8" strokeWidth="3" strokeDasharray="4 4" />
          <circle cx="50" cy="28" r="6" fill="#ef4444" />
        </svg>
      </div>
    );
  }

  // 9. Kettlebell / Goblet
  if (exName.includes("kettlebell") || exName.includes("goblet")) {
    return (
      <div className={`w-full h-full bg-[#0e1015] flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle cx="50" cy="58" r="22" fill="#374151" stroke="#4b5563" strokeWidth="2" />
          <path d="M40 38 C40 22, 60 22, 60 38" stroke="#9ca3af" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="50" cy="58" r="8" fill="#ef4444" />
        </svg>
      </div>
    );
  }

  // 10. Bench Press
  if (exName.includes("bench press")) {
    return (
      <div className={`w-full h-full bg-[#0e1015] flex items-center justify-center p-2 relative ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <line x1="20" y1="65" x2="80" y2="65" stroke="#4b5563" strokeWidth="4" />
          <line x1="30" y1="65" x2="30" y2="85" stroke="#4b5563" strokeWidth="3" />
          <line x1="70" y1="65" x2="70" y2="85" stroke="#4b5563" strokeWidth="3" />
          <line x1="16" y1="36" x2="84" y2="36" stroke="#9ca3af" strokeWidth="3" />
          <rect x="12" y="26" width="6" height="20" rx="2" fill="#6b7280" />
          <rect x="82" y="26" width="6" height="20" rx="2" fill="#6b7280" />
          <path d="M44 60 L44 42 M56 60 L56 42" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // Default fallback
  return (
    <div className={`w-full h-full bg-[#121316] flex items-center justify-center text-neutral-300 ${className}`}>
      <Dumbbell className="w-7 h-7 text-[#844783]" />
    </div>
  );
}
