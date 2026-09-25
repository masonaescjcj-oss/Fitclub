import React, { useEffect } from "react";
import { FileText } from "lucide-react";
import { Card, IconWell, Screen, TopBar } from "../components/ui/kit";
import { LEGAL, LEGAL_UPDATED } from "../lib/legal";

const DRAFT = {
  en: "Draft, pending legal review. Last updated",
  fa: "پیش‌نویس، در انتظار بررسی حقوقی. آخرین به‌روزرسانی",
};

/** The privacy policy or the terms of use, readable before and after sign-in. */
export default function LegalPage({ kind, isRtl, onBack }) {
  const lang = isRtl ? "fa" : "en";
  const doc = LEGAL[kind][lang];
  useEffect(() => { window.scrollTo(0, 0); }, [kind]);
  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={doc.title} />
      <Card className="flex items-start gap-3">
        <IconWell tone="sunk" size={36}><FileText className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>
        <p className="m-0 flex-1 text-[13px] leading-snug text-muted pt-2">{DRAFT[lang]} {LEGAL_UPDATED[lang]}</p>
      </Card>
      <article className="flex flex-col gap-5 px-1 pb-4">
        <p className="m-0 text-[17px] leading-relaxed font-medium text-ink">{doc.lead}</p>
        {doc.sections.map((s) => (
          <section key={s.h} className="flex flex-col gap-2">
            <h2 className="m-0 font-display font-extrabold text-[19px] leading-tight tracking-[-0.02em] text-ink">{s.h}</h2>
            {s.p.map((line) => <p key={line} className="m-0 text-[15px] leading-relaxed text-muted">{line}</p>)}
          </section>
        ))}
      </article>
    </Screen>
  );
}
