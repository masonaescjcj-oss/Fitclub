import React, { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Megaphone, Phone, Search, UserPlus, Users } from "lucide-react";
import { PEOPLE } from "../../lib/chat/chatStore";
import { TG } from "../../lib/chat/extras";
import { timeOf, validateUsername } from "../../lib/chat/chatModel";
import { Avatar, NameBadges } from "./ChatBits";
import { Sheet } from "./ChatSheets";

const AVATAR_CHOICES = ["👤", "🧑", "👩", "🧔", "👩‍🦰", "🧑‍🦱", "👨‍🦳", "👧", "🦾", "🏋️"];

const USERNAME_ERROR = { short: "usernameShort", long: "usernameLong", chars: "usernameChars", start: "usernameStart", taken: "usernameTaken" };

/**
 * A person added by hand gets the same identity as everyone else: name,
 * @username, phone. With `initial` it edits that person instead.
 */
export function ContactSheet({ store, initial = null, isRtl, t, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [username, setUsername] = useState(initial?.username || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [avatar, setAvatar] = useState(initial?.avatar || "👤");
  const slug = username.trim().replace(/^@/, "").toLowerCase();
  const taken = store.takenUsernames().map((u) => u.toLowerCase()).filter((u) => u !== (initial?.username || "").toLowerCase());
  const error = slug ? validateUsername(slug, [], null) || (taken.includes(slug) ? "taken" : null) : null;
  const field = "w-full h-11 px-3 rounded-2xl text-sm font-bold text-white placeholder:text-neutral-500 focus:outline-none";
  return (
    <Sheet title={initial ? t.editContact : t.addContact} isRtl={isRtl} t={t} onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 font-black text-sm">{t.cancel}</button>
          <button type="button" disabled={!name.trim() || !!error} onClick={() => onSave({ name: name.trim(), avatar, username: slug, phone: phone.trim() })}
            className="flex-1 h-12 rounded-2xl text-white font-black text-sm disabled:opacity-40 on-accent"
            style={{ background: TG.accentDeep }}>{initial ? t.save : t.startChat}</button>
        </>
      }>
      <div className="p-4 space-y-3">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t.contactName} aria-label={t.contactName}
          className={field} style={{ background: TG.card }} />
        <div>
          <div className="flex items-center h-11 px-3 rounded-2xl" style={{ background: TG.card }} dir="ltr">
            <span className="text-sm font-bold text-neutral-500">@</span>
            <input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))} placeholder={t.contactUsername} aria-label={t.contactUsername}
              autoCapitalize="none" spellCheck={false} maxLength={32}
              className="flex-1 min-w-0 bg-transparent text-sm font-bold text-white placeholder:text-neutral-500 focus:outline-none" />
          </div>
          <p className="mt-1 px-1 text-[12px]" style={{ color: error ? "#ef4444" : TG.muted }}>{error ? t[USERNAME_ERROR[error]] : slug ? t.usernameFree : t.contactAutoId}</p>
        </div>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.contactPhone} aria-label={t.contactPhone} inputMode="tel" dir="ltr"
          className={field} style={{ background: TG.card }} />
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
export default function ContactsScreen({ store, isRtl, t, onBack, onGoCalls, onNewGroup, onNewChannel }) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const contacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...PEOPLE, ...store.customUsers]
      .filter((u) => !q || u.name.toLowerCase().includes(q) || (u.nameFa || "").includes(q) || (u.username || "").toLowerCase().includes(q.replace(/^@/, "")) || (u.phone || "").replace(/\s+/g, "").includes(q))
      .sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
      });
  }, [store.customUsers, query]);

  const subtitleOf = (u) => {
    if (u.username && query.trim().startsWith("@")) return { text: `@${u.username}`, tone: "#6b7c8a" };
    if (u.online) return { text: t.online, tone: TG.accent };
    if (u.lastSeen) return { text: `${t.lastSeenAt} ${timeOf(u.lastSeen)}`, tone: "#6b7c8a" };
    return { text: t.lastSeenRecently, tone: "#6b7c8a" };
  };

  return (
    <div className="w-full min-h-[100dvh] text-white pb-44" style={{ background: TG.bg }}>
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

      {/* Quick rows — new group and channel first, the way the Android client leads with them */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden" style={{ background: TG.surface }}>
        <button type="button" onClick={onNewGroup}
          className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-white/[0.04] transition-colors text-start">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#2fa6ff" }}>
            <Users className="w-4 h-4 text-white" />
          </span>
          <span className="text-sm font-bold text-white">{t.newGroup}</span>
        </button>
        <div className="border-t border-white/[0.05]" />
        <button type="button" onClick={onNewChannel}
          className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-white/[0.04] transition-colors text-start">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#f59e0b" }}>
            <Megaphone className="w-4 h-4 text-white" />
          </span>
          <span className="text-sm font-bold text-white">{t.newChannel}</span>
        </button>
        <div className="border-t border-white/[0.05]" />
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
        className={`fixed bottom-24 ${isRtl ? "left-5" : "right-5"} w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl active:scale-95 transition-transform z-30 on-accent`}
        style={{ background: TG.accentDeep }}>
        <UserPlus className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {adding && (
          <ContactSheet store={store} isRtl={isRtl} t={t}
            onSave={(v) => { const user = store.addContact(v); setAdding(false); store.openOrCreatePrivateChat(user); }}
            onClose={() => setAdding(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
