import React, { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, Search, UserPlus } from "lucide-react";
import { PEOPLE } from "../../lib/chat/chatStore";
import { TG } from "../../lib/chat/extras";
import { timeOf } from "../../lib/chat/chatModel";
import { Avatar, NameBadges } from "./ChatBits";
import { Sheet } from "./ChatSheets";

const AVATAR_CHOICES = ["👤", "🧑", "👩", "🧔", "👩‍🦰", "🧑‍🦱", "👨‍🦳", "👧", "🦾", "🏋️"];

function AddContactSheet({ isRtl, t, onSave, onClose }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("👤");
  return (
    <Sheet title={t.addContact} isRtl={isRtl} t={t} onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 font-black text-sm">{t.cancel}</button>
          <button type="button" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), avatar })}
            className="flex-1 h-12 rounded-2xl text-white font-black text-sm disabled:opacity-40"
            style={{ background: TG.accentDeep }}>{t.startChat}</button>
        </>
      }>
      <div className="p-4 space-y-4">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t.contactName}
          className="w-full h-11 px-3 rounded-2xl bg-[#1c2733] border border-white/10 text-sm font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30" />
        <div className="flex flex-wrap gap-1.5">
          {AVATAR_CHOICES.map((a) => (
            <button key={a} type="button" onClick={() => setAvatar(a)}
              className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                avatar === a ? "bg-white/15 ring-1 ring-white/40" : "bg-white/5 hover:bg-white/10"
              }`}>{a}</button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/** Contact directory, sorted the way Telegram sorts it: online first, then last seen. */
export default function ContactsScreen({ store, isRtl, t, onBack, onGoCalls }) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const contacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...PEOPLE, ...store.customUsers]
      .filter((u) => !q || u.name.toLowerCase().includes(q) || (u.nameFa || "").includes(q))
      .sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
      });
  }, [store.customUsers, query]);

  const subtitleOf = (u) => {
    if (u.online) return { text: t.online, tone: TG.accent };
    if (u.lastSeen) return { text: `${t.lastSeenAt} ${timeOf(u.lastSeen)}`, tone: "#6b7c8a" };
    return { text: t.lastSeenRecently, tone: "#6b7c8a" };
  };

  return (
    <div className="w-full min-h-[100dvh] text-white pb-8" style={{ background: TG.bg }}>
      <div className="sticky top-0 z-20 border-b border-white/[0.07]" style={{ background: TG.surface }}>
        <div className="flex items-center gap-2 px-3 h-14">
          <button type="button" onClick={onBack} aria-label={t.close}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-300 hover:text-white shrink-0">
            <ArrowLeft className={`w-5 h-5 ${isRtl ? "rotate-180" : ""}`} />
          </button>
          <h1 className="text-lg font-black text-white flex-1">{t.contactsTitle}</h1>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className={`w-4 h-4 text-neutral-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? "right-3" : "left-3"}`} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchContacts}
              className={`w-full h-10 ${isRtl ? "pr-10 pl-3" : "pl-10 pr-3"} rounded-2xl bg-[#1c2733] border border-white/[0.07] text-sm font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/25`} />
          </div>
        </div>
      </div>

      {/* Quick rows */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden" style={{ background: TG.surface }}>
        <button type="button" onClick={() => setAdding(true)}
          className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-white/[0.04] transition-colors text-start">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#3390ec" }}>
            <UserPlus className="w-4 h-4 text-white" />
          </span>
          <span className="text-sm font-bold text-white">{t.inviteFriends}</span>
        </button>
        <div className="border-t border-white/[0.05]" />
        <button type="button" onClick={onGoCalls}
          className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-white/[0.04] transition-colors text-start">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-600">
            <Phone className="w-4 h-4 text-white" />
          </span>
          <span className="text-sm font-bold text-white">{t.recentCalls}</span>
        </button>
      </div>

      {/* Contact list */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden pb-1" style={{ background: TG.surface }}>
        <span className="block px-4 pt-3 pb-1 text-xs font-bold" style={{ color: TG.accent }}>
          {t.sortedByLastSeen}
        </span>
        {contacts.map((u) => {
          const sub = subtitleOf(u);
          return (
            <button key={u.id} type="button" onClick={() => store.openOrCreatePrivateChat(u)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-start">
              <Avatar user={u} size={46} ring={TG.surface} />
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-white truncate">{isRtl ? u.nameFa || u.name : u.name}</span>
                  <NameBadges verified={u.verified} premium={u.premium} />
                </span>
                <span className="block text-xs font-bold" style={{ color: sub.tone }}>{sub.text}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* FAB */}
      <button type="button" onClick={() => setAdding(true)} aria-label={t.addContact}
        className={`fixed bottom-6 ${isRtl ? "left-5" : "right-5"} w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl active:scale-95 transition-transform z-30`}
        style={{ background: TG.accentDeep }}>
        <UserPlus className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {adding && (
          <AddContactSheet isRtl={isRtl} t={t}
            onSave={(v) => { const user = store.addContact(v); setAdding(false); store.openOrCreatePrivateChat(user); }}
            onClose={() => setAdding(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
