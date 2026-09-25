import React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "./ui/kit";
import { reportError } from "../lib/errorReport";

const COPY = {
  en: {
    title: "Something went wrong",
    body: "FitClub hit a problem and couldn't show this screen. Your data is safe, and we've been told about it.",
    reload: "Reload",
  },
  fa: {
    title: "مشکلی پیش آمد",
    body: "فیت‌کلاب نتوانست این صفحه را نشان دهد. داده‌هایت سالم است و گزارشش برای ما فرستاده شد.",
    reload: "بارگذاری دوباره",
  },
};

/**
 * The last line of defence: an error while drawing a screen shows this
 * instead of a blank page, with a way back, and files a report.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    reportError("render", error, info?.componentStack || "");
  }

  render() {
    if (!this.state.failed) return this.props.children;
    let fa = false;
    try { fa = localStorage.getItem("language") === "fa"; } catch { /* storage off */ }
    const c = fa ? COPY.fa : COPY.en;
    return (
      <main dir={fa ? "rtl" : "ltr"} role="alert"
        className="min-h-[100dvh] bg-canvas text-ink flex flex-col items-center justify-center gap-4 px-8 text-center">
        <h1 className="m-0 font-display font-extrabold text-[28px] leading-tight tracking-[-0.02em]">{c.title}</h1>
        <p className="m-0 max-w-sm text-[15px] leading-relaxed text-muted">{c.body}</p>
        <Button tone="ink" size="lg" onClick={() => window.location.reload()}
          icon={<RotateCcw className="w-[18px] h-[18px] text-accent dark:text-on-inv" strokeWidth={2.2} />}>
          {c.reload}
        </Button>
      </main>
    );
  }
}
