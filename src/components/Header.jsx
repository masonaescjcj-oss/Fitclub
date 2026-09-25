import React from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { IconButton, Label, Screen, cx, num } from "./ui/kit";

// The top of every sign-up and onboarding step: a round back button, the step
// track and a mono "n/N" counter. The other exports are the small pieces those
// screens share, so every step is laid out the same way: a display title, the
// form, and one action pinned to the bottom.

export default function Header({
  onBack,
  showBack = true,
  isRtl = false,
  stepIndex = null,
  totalSteps = null,
  rightContent = null,
  tone = "paper",
  backLabel,
}) {
  const showProgress = stepIndex !== null && totalSteps !== null && totalSteps > 0;
  const Back = isRtl ? ArrowRight : ArrowLeft;
  const ink = tone === "ink";

  return (
    <div className="relative z-10 flex items-center gap-3.5 pt-3 shrink-0">
      {showBack && onBack ? (
        <IconButton label={backLabel || (isRtl ? "بازگشت" : "Back")} onClick={onBack} tone={ink ? "hero" : "card"}>
          <Back className="w-5 h-5" strokeWidth={2} />
        </IconButton>
      ) : (
        <span aria-hidden="true" className="w-11 h-11 shrink-0" />
      )}

      {showProgress ? (
        <>
          <div role="progressbar" aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={stepIndex + 1}
            aria-label={isRtl ? "پیشرفت" : "Progress"}
            className={cx("flex-1 min-w-0 flex", totalSteps > 6 ? "gap-1" : "gap-1.5")}>
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <span key={idx}
                className={cx("flex-1 h-1 rounded-full transition-colors duration-300",
                  idx <= stepIndex ? (ink ? "bg-accent" : "bg-inv") : (ink ? "bg-hero-2" : "bg-line"))} />
            ))}
          </div>
          <span className={cx("font-mono text-xs font-medium shrink-0", ink ? "text-hero-muted" : "text-muted")}>
            {num(stepIndex + 1, isRtl)}/{num(totalSteps, isRtl)}
          </span>
        </>
      ) : (
        <span className="flex-1" />
      )}

      {rightContent}
    </div>
  );
}

/**
 * A flow step's page root. It is its own scroll area, so the pinned action
 * stays on screen however long the step is.
 */
export function FlowScreen({ isRtl, className = "", children, ...rest }) {
  return (
    <Screen isRtl={isRtl} {...rest}
      className={cx("h-[100dvh] overflow-y-auto overflow-x-hidden !pb-0 md:max-w-lg md:mx-auto scrollbar-hide", className)}>
      {children}
    </Screen>
  );
}

/** A step's display title with an optional lede under it. */
export function FlowTitle({ title, lede, eyebrow, size = 40, className = "" }) {
  return (
    <div className={cx("flex flex-col gap-3 mt-5", className)}>
      {eyebrow && <Label>{eyebrow}</Label>}
      <h1 style={{ fontSize: size }}
        className="m-0 font-display font-extrabold text-ink leading-[1.02] tracking-[-0.04em] rtl:leading-[1.3] rtl:tracking-normal">
        {title}
      </h1>
      {lede && <p className="m-0 text-base leading-[1.45] text-muted">{lede}</p>}
    </div>
  );
}

/** The action pinned to the bottom of a step, with the ground fading in above it. */
export function FlowFooter({ tone = "paper", className = "", children }) {
  const ink = tone === "ink";
  return (
    <div className={cx("sticky bottom-0 z-10 mt-auto -mx-5 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),24px)] flex flex-col gap-2 shrink-0",
      ink ? "bg-jet" : "bg-canvas", className)}>
      <span aria-hidden="true"
        className={cx("pointer-events-none absolute inset-x-0 bottom-full h-6 bg-gradient-to-t",
          ink ? "from-jet to-jet/0" : "from-canvas to-canvas/0")} />
      {children}
    </div>
  );
}

/** A form-level error on a soft alert well. */
export function FormError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="m-0 flex items-start gap-2.5 rounded-2xl bg-alert/10 px-4 py-3 text-sm font-medium leading-snug text-alert">
      <AlertCircle className="w-[18px] h-[18px] shrink-0 mt-px" strokeWidth={2} />
      <span>{children}</span>
    </p>
  );
}

/** A small busy indicator that takes the colour of its text. */
export function Spinner({ className = "" }) {
  return <span aria-hidden="true" className={cx("inline-block w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin", className)} />;
}

/** "or continue with" between the form and the social sign-ins. */
export function OrDivider({ label }) {
  return (
    <div className="flex items-center gap-3 mt-3">
      <span className="flex-1 h-px bg-line" />
      <Label>{label}</Label>
      <span className="flex-1 h-px bg-line" />
    </div>
  );
}

/** Apple and Google sign-in buttons. They are placeholders until real auth exists. */
/**
 * Sign-in providers. `providers` limits which show (default: both);
 * `onProvider(id)` starts that provider's sign-in.
 */
export function SocialButtons({ appleLabel, googleLabel, providers = ["apple", "google"], onProvider }) {
  const cls = "h-[54px] w-full rounded-full bg-card text-ink text-base font-semibold border-0 cursor-pointer inline-flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98]";
  return (
    <div className="flex flex-col gap-2.5">
      {providers.includes("apple") && (
      <button type="button" className={cls} onClick={() => onProvider?.("apple")}>
        <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 170 170" aria-hidden="true">
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.14-1.9-14.4-6.09-3.41-2.75-7.3-7.4-11.67-13.96-5.83-8.73-10.45-18.49-13.87-29.28-3.41-10.79-5.12-21.13-5.12-31.02 0-14.82 3.84-27.1 11.52-36.85 7.68-9.74 17.38-14.75 29.1-15.02 4.47 0 9.58 1.18 15.34 3.54 5.76 2.36 9.87 3.54 12.33 3.54 2.12 0 6.13-1.12 12.03-3.35 5.9-2.24 10.86-3.26 14.88-3.07 10.97.54 19.98 4.47 27.02 11.8 7.04 7.32 11.45 16.4 13.23 27.24-9.62 5.79-14.33 13.91-14.13 24.36.2 10.45 4.3 18.9 12.31 25.35 4.54 3.65 9.77 6.27 15.69 7.86-2.24 6.64-5.13 13.25-8.68 19.82zM119.22 31.75c0-7.07 2.54-13.98 7.62-20.73 5.08-6.75 11.66-11.01 19.74-12.78.13 1.1.2 2.05.2 2.85 0 7.3-2.65 14.39-7.95 21.28-5.3 6.89-11.87 11.23-19.71 13.02-.13-1.09-.2-2.14-.2-3.14z" />
        </svg>
        {appleLabel}
      </button>
      )}
      {providers.includes("google") && (
      <button type="button" className={cls} onClick={() => onProvider?.("google")}>
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        {googleLabel}
      </button>
      )}
    </div>
  );
}

/** The show/hide control that sits at the end of a password field. */
export function PasswordToggle({ shown, onToggle, isRtl }) {
  const label = shown ? (isRtl ? "پنهان کردن رمز" : "Hide password") : (isRtl ? "نمایش رمز" : "Show password");
  return (
    <button type="button" onClick={onToggle} aria-label={label} title={label} aria-pressed={shown}
      className="w-11 h-11 -me-3 flex items-center justify-center rounded-full bg-transparent border-0 text-muted cursor-pointer">
      {shown ? <EyeOff className="w-5 h-5" strokeWidth={2} /> : <Eye className="w-5 h-5" strokeWidth={2} />}
    </button>
  );
}

/** A quiet underlined text action, 44 px tall. */
export function TextAction({ className = "", children, ...rest }) {
  return (
    <button type="button" {...rest}
      className={cx("h-11 px-1 bg-transparent border-0 cursor-pointer text-[15px] font-semibold text-ink underline underline-offset-[3px] decoration-1", className)}>
      {children}
    </button>
  );
}
