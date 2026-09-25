import React from "react";
import { ArrowDownLeft, ArrowUpRight, Info, Phone, PhoneMissed } from "lucide-react";
import { CALLS, findPerson } from "../../lib/chat/extras";
import { relativeTime } from "../../lib/chat/chatModel";
import { IconButton, List, Screen, TopBar, cx, num } from "../ui/kit";
import { Avatar } from "./ChatBits";

const TYPE = {
  incoming: { icon: ArrowDownLeft, tone: "text-ink", label: "incoming" },
  outgoing: { icon: ArrowUpRight, tone: "text-muted", label: "outgoing" },
  missed: { icon: PhoneMissed, tone: "text-alert", label: "missed" },
};

const fmt = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `0:${String(s).padStart(2, "0")}`);

/** Call history. Real calls need a server, and the footer says so. */
export default function CallsScreen({ isRtl, t, onBack, onToast }) {
  // A middle dot beside Persian digits reads as a zero, so Persian uses its comma.
  const sep = isRtl ? "، " : " · ";
  return (
    <Screen isRtl={isRtl}>
      <TopBar title={t.calls} onBack={onBack} isRtl={isRtl} backLabel={t.close} />

      <List className="mt-2">
        {CALLS.map((call) => {
          const user = findPerson(call.userId);
          if (!user) return null;
          const kind = TYPE[call.type];
          const Icon = kind.icon;
          const missed = call.type === "missed";
          const meta = [t[kind.label], call.seconds > 0 ? num(fmt(call.seconds), isRtl) : null, num(relativeTime(call.at, t), isRtl)].filter(Boolean).join(sep);
          return (
            <li key={call.id} className="list-none min-h-[64px] flex items-center gap-3 ps-4 pe-3 py-2.5">
              <Avatar user={user} size={44} showStatus={false} />
              <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className={cx("text-[15px] font-semibold truncate", missed ? "text-alert" : "text-ink")}>
                  {isRtl ? user.nameFa || user.name : user.name}
                </span>
                <span className="flex items-center gap-1 text-[13px] text-muted min-w-0">
                  <Icon className={cx("w-3.5 h-3.5 shrink-0", kind.tone)} strokeWidth={2.2} />
                  <span className="truncate">{meta}</span>
                </span>
              </span>
              <IconButton label={t.calls} tone="soft" size={44} onClick={() => onToast(t.callsSimNote)}>
                <Phone className="w-[18px] h-[18px]" strokeWidth={2} />
              </IconButton>
            </li>
          );
        })}
      </List>

      <p className="m-0 flex items-start justify-center gap-1.5 px-6 pt-2 text-center text-xs leading-relaxed text-muted">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={2} /> {t.callsSimNote}
      </p>
    </Screen>
  );
}
