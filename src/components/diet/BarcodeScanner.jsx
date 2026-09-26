import React, { useEffect, useRef, useState } from "react";
import { Keyboard, Loader2, ScanBarcode } from "lucide-react";
import { Button, Field, cx } from "../ui/kit";
import { cleanBarcode, lookupBarcode, nativeScanner } from "../../lib/nutrition/barcode";

const FORMATS = ["ean_13", "ean_8", "upc_a"];

/**
 * Reads a barcode with the camera (the browser's own reader where there is
 * one, ZXing otherwise, loaded only now) or from typed digits, then looks
 * it up. `onFound(food)` gets a food ready for the portion card.
 */
export default function BarcodeScanner({ t, isRtl, onFound }) {
  const video = useRef(null);
  const [mode, setMode] = useState("camera"); // camera | manual
  const [state, setState] = useState({ kind: "idle" }); // idle | looking | missing | invalid | error | blocked
  const [digits, setDigits] = useState("");
  const busy = useRef(false);

  const look = async (raw) => {
    if (busy.current) return;
    const code = cleanBarcode(raw);
    if (!code) { setState({ kind: "invalid" }); return; }
    busy.current = true;
    setState({ kind: "looking", code });
    try {
      const r = await lookupBarcode(code);
      if (r.food) onFound(r.food);
      else setState({ kind: r.invalid ? "invalid" : "missing", code });
    } catch {
      setState({ kind: "error", code });
    } finally {
      busy.current = false;
    }
  };

  useEffect(() => {
    if (mode !== "camera") return undefined;
    let stopped = false;
    let stream = null;
    let timer = null;
    let controls = null;
    const found = (text) => { if (!stopped && !busy.current) look(text); };
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera");
        if (nativeScanner()) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
          if (stopped) return;
          video.current.srcObject = stream;
          await video.current.play().catch(() => {});
          const supported = await window.BarcodeDetector.getSupportedFormats?.().catch(() => FORMATS) || FORMATS;
          const detector = new window.BarcodeDetector({ formats: FORMATS.filter((f) => supported.includes(f)) });
          const tick = async () => {
            if (stopped) return;
            try {
              const codes = await detector.detect(video.current);
              if (codes[0]?.rawValue) found(codes[0].rawValue);
            } catch { /* a frame that wasn't ready */ }
            timer = setTimeout(tick, 250);
          };
          tick();
        } else {
          const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
          if (stopped) return;
          const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A]]]);
          const reader = new BrowserMultiFormatReader(hints);
          controls = await reader.decodeFromConstraints({ video: { facingMode: "environment" }, audio: false }, video.current,
            (result) => { if (result) found(result.getText()); });
          if (stopped) controls.stop();
        }
      } catch {
        if (!stopped) { setMode("manual"); setState({ kind: "blocked" }); }
      }
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
      if (controls) controls.stop();
      if (stream) stream.getTracks().forEach((tr) => tr.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const message = {
    looking: t.lookingUp, missing: t.barcodeMissing, invalid: t.barcodeInvalid, error: t.lookupFailed, blocked: t.cameraBlocked,
  }[state.kind];

  return (
    <div className="flex flex-col gap-3">
      {mode === "camera" ? (
        <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-hero">
          <video ref={video} muted playsInline className="w-full h-full object-cover" aria-label={t.scanPoint} />
          <span aria-hidden="true" className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-24 rounded-2xl ring-2 ring-accent/90" />
          <span className="absolute inset-x-0 bottom-3 text-center text-[13px] font-semibold text-white drop-shadow">{t.scanPoint}</span>
        </div>
      ) : (
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); look(digits); }}>
          <Field className="flex-1" label={t.barcodeLabel} value={digits} inputMode="numeric" autoComplete="off" dir="ltr"
            onChange={(e) => setDigits(e.target.value.replace(/[^\d]/g, "").slice(0, 14))} placeholder="6260000000000" />
          <Button tone="ink" type="submit" disabled={digits.length < 8 || state.kind === "looking"}>{t.lookUp}</Button>
        </form>
      )}
      {message && (
        <p role={state.kind === "looking" ? "status" : "alert"} className={cx("m-0 px-1 text-[14px] leading-snug flex items-start gap-2", state.kind === "looking" ? "text-muted" : "text-ink")}>
          {state.kind === "looking" && <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" strokeWidth={2.2} />}
          <span>{message}{state.code && state.kind !== "looking" ? <span dir="ltr" className="text-muted"> ({state.code})</span> : null}</span>
        </p>
      )}
      <Button tone="card" block onClick={() => { setState({ kind: "idle" }); setMode(mode === "camera" ? "manual" : "camera"); }}
        icon={mode === "camera" ? <Keyboard className="w-[18px] h-[18px]" strokeWidth={2} /> : <ScanBarcode className="w-[18px] h-[18px]" strokeWidth={2} />}>
        {mode === "camera" ? t.typeBarcode : t.scanBarcode}
      </Button>
    </div>
  );
}
