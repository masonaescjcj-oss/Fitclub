import React from "react";

export default function Header({
  onBack,
  showBack = true,
  isRtl = false,
  stepIndex = null,
  totalSteps = null,
  rightContent = null,
}) {
  const showProgress = stepIndex !== null && totalSteps !== null && totalSteps > 0;

  return (
    <div className="flex items-center justify-between p-4 h-16 sticky top-0 z-30 bg-transparent text-white w-full">
      {/* Back Button Container */}
      <div className="w-10 h-10 flex items-center justify-center">
        {showBack && onBack ? (
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-neutral-300 hover:text-white hover:border-white/30 transition-all active:scale-95 shadow-sm"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              {isRtl ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              )}
            </svg>
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>

      <div className="flex-grow" />

      {/* Right Content / Dot-Dash Progress Indicator */}
      <div className="flex items-center justify-end">
        {rightContent ? (
          rightContent
        ) : showProgress ? (
          <div className="flex items-center gap-1.5 dir-ltr pr-2" dir="ltr">
            {Array.from({ length: totalSteps }).map((_, idx) => {
              const isActive = idx === stepIndex;
              const isCompleted = idx < stepIndex;

              return (
                <div
                  key={idx}
                  className={`transition-all duration-300 rounded-full ${
                    isActive
                      ? "w-6 h-1.5 bg-[#844783]"
                      : isCompleted
                      ? "w-1.5 h-1.5 bg-[#844783]/60"
                      : "w-1.5 h-1.5 bg-white/20"
                  }`}
                />
              );
            })}
          </div>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>
    </div>
  );
}
