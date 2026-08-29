import React from "react";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Info, Phone, PhoneMissed } from "lucide-react";
import { CALLS, TG, findPerson } from "../../lib/chat/extras";
import { relativeTime } from "../../lib/chat/chatModel";
import { Avatar } from "./ChatBits";

const TYPE = {
  incoming: { icon: ArrowDownLeft, tone: "#4fa9e8", label: "incoming" },
  outgoing: { icon: ArrowUpRight, tone: "#22c55e", label: "outgoing" },
  missed: { icon: PhoneMissed, tone: "#ef4444", label: "missed" },
};

const fmt = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `0:${String(s).padStart(2, "0")}`);

/** Call history. Real calls need a server, and the footer says so. */
export default function CallsScreen({ isRtl, t, onBack, onToast }) {
  return (
    <div className="w-full min-h-[100dvh] text-white pb-8" style={{ background: TG.bg }}>
      <div className="sticky top-0 z-20 flex items-center gap-2 px-3 h-14 border-b border-white/[0.07]"
        style={{ background: TG.surface }}>
        <button type="button" onClick={onBack} aria-label={t.close}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-300 hover:text-white shrink-0">
          <ArrowLeft className={`w-5 h-5 ${isRtl ? "rotate-180" : ""}`} />
        </button>
        <h1 className="text-lg font-black text-white flex-1">{t.calls}</h1>
      </div>

      <div className="mx-3 mt-3 rounded-2xl overflow-hidden" style={{ background: TG.surface }}>
        {CALLS.map((call) => {
          const user = findPerson(call.userId);
          if (!user) return null;
          const kind = TYPE[call.type];
          const Icon = kind.icon;
          return (
            <div key={call.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] last:border-0">
              <Avatar user={user} size={44} ring={TG.surface} showStatus={false} />
              <span className="flex-1 min-w-0">
                <span className={`block text-sm font-black truncate ${call.type === "missed" ? "text-rose-400" : "text-white"}`}>
                  {isRtl ? user.nameFa || user.name : user.name}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-neutral-500">
                  <Icon className="w-3.5 h-3.5" style={{ color: kind.tone }} />
                  {t[kind.label]}{call.seconds > 0 ? ` · ${fmt(call.seconds)}` : ""} · {relativeTime(call.at, t)}
                </span>
              </span>
              <button type="button" aria-label={t.calls} onClick={() => onToast(t.callsSimNote)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white shrink-0">
                <Phone className="w-4 h-4" style={{ color: TG.accent }} />
              </button>
            </div>
          );
        })}
      </div>

      <p className="flex items-center justify-center gap-1.5 px-8 pt-5 text-center text-[10px] font-bold text-neutral-600">
        <Info className="w-3 h-3 shrink-0" /> {t.callsSimNote}
      </p>
    </div>
  );
}
