import React from "react";
import { motion } from "framer-motion";
import { Bookmark, Phone, Settings, User, UserPlus, Users } from "lucide-react";
import { TG } from "../../lib/chat/extras";

function Item({ icon: Icon, label, badge, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.05] transition-colors text-start">
      <Icon className="w-5 h-5 text-neutral-400 shrink-0" />
      <span className="flex-1 text-sm font-bold text-white">{label}</span>
      {badge > 0 && (
        <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black text-white flex items-center justify-center"
          style={{ background: TG.accentDeep }}>
          {badge}
        </span>
      )}
    </button>
  );
}

/** Telegram-style side drawer: profile header, then the app's sections. */
export default function Drawer({ me, name, unread, isRtl, t, onGo, onClose, onToast }) {
  const side = isRtl ? { x: "100%" } : { x: "-100%" };

  return (
    <div className="fixed inset-0 z-[65]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/70" />

      <motion.div
        initial={side} animate={{ x: 0 }} exit={side}
        transition={{ type: "spring", stiffness: 340, damping: 36 }}
        className={`absolute top-0 bottom-0 w-[280px] flex flex-col ${isRtl ? "right-0" : "left-0"}`}
        style={{ background: TG.bg }}
      >
        {/* Profile header */}
        <button type="button" onClick={() => onGo("profile")}
          className="p-5 pb-4 text-start" style={{ background: TG.surface }}>
          <span className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ background: "linear-gradient(135deg,#3390ec55,#3390ec22)", border: "1.5px solid #3390ec77" }}>
            {me.avatar}
          </span>
          <span className="flex items-center gap-1.5 mt-3">
            <span className="text-base font-black text-white truncate">{name}</span>
            <span className="text-base leading-none">{me.emojiStatus}</span>
          </span>
          <span className="block text-xs font-bold text-neutral-500 mt-0.5" dir="ltr">{me.phone}</span>
        </button>

        <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
          <Item icon={User} label={t.myProfile} onClick={() => onGo("profile")} />
          <Item icon={Users} label={t.contactsTitle} onClick={() => onGo("contacts")} />
          <Item icon={Phone} label={t.calls} onClick={() => onGo("calls")} />
          <Item icon={Bookmark} label={t.savedMessages} onClick={() => onGo("saved")} badge={0} />
          <Item icon={Settings} label={t.settingsTitle} onClick={() => onGo("settings")} />
          <div className="my-2 border-t border-white/[0.07]" />
          <Item icon={UserPlus} label={t.inviteFriends}
            onClick={() => { navigator.clipboard?.writeText("https://fitclub.app/invite").catch(() => {}); onToast(t.inviteCopied); onClose(); }} />
        </div>

        <div className="px-5 py-4 border-t border-white/[0.07]">
          <span className="text-[10px] font-bold text-neutral-600">FitClub Messenger 2.0</span>
        </div>
      </motion.div>
    </div>
  );
}
