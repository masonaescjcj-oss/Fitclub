import { useEffect, useRef } from "react";

const MARK = "fitclub.fullscreen";
const ours = () => window.history.state?.[MARK] === true;

/**
 * While `active`, the phone's back gesture (or the browser's back button)
 * calls `onBack` instead of leaving the app: one history entry stands for
 * the full-screen view. `onBack` returns "stay" when it only closed
 * something inside the view (a sheet), and the entry is put back for the
 * next press. Closing the view another way (its X) takes the entry out.
 */
export default function useBackGesture(active, onBack) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const live = useRef(false);

  useEffect(() => {
    if (!active) return undefined;
    live.current = true;
    if (!ours()) window.history.pushState({ ...(window.history.state || {}), [MARK]: true }, "");
    const onPop = () => {
      if (ours()) return;
      if (onBackRef.current() === "stay") window.history.pushState({ [MARK]: true }, "");
    };
    window.addEventListener("popstate", onPop);
    return () => {
      live.current = false;
      window.removeEventListener("popstate", onPop);
      // A view that comes straight back (React's development remount) keeps its entry.
      setTimeout(() => { if (!live.current && ours()) window.history.back(); }, 0);
    };
  }, [active]);
}
