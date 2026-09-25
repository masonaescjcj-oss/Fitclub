import React, { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Check, Megaphone, Search, UserPlus, Users } from "lucide-react";
import { DEMO_WORLD, PEOPLE_SHOWN } from "../../lib/chat/chatStore";
import { timeOf, validateUsername } from "../../lib/chat/chatModel";
import { Button, Field, IconButton, IconWell, Label, List, Row, Screen, Sheet, cx, num } from "../ui/kit";
import { Avatar, NameBadges } from "./ChatBits";

const USERNAME_ERROR = { short: "usernameShort", long: "usernameLong", chars: "usernameChars", start: "usernameStart", taken: "usernameTaken" };
const dirOf = (isRtl) => (isRtl ? "rtl" : "ltr");

/**
 * A person added by hand gets the same identity as everyone else: name,
 * @username, phone. With `initial` it edits that person instead.
 *
 * People are drawn as initials now, so the sheet previews those instead of
 * offering emoji faces; an existing picture value is carried through as is.
 */
export function ContactSheet({ store, initial = null, isRtl, t, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [username, setUsername] = useState(initial?.username || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const avatar = initial?.avatar || "👤";
  const slug = username.trim().replace(/^@/, "").toLowerCase();
  const taken = store.takenUsernames().map((u) => u.toLowerCase()).filter((u) => u !== (initial?.username || "").toLowerCase());
  const error = slug ? validateUsername(slug, [], null) || (taken.includes(slug) ? "taken" : null) : null;
  const preview = { id: initial?.id || "new-contact", name: name.trim() || "?", avatar, color: initial?.color };

  return (
    <Sheet title={initial ? t.editContact : t.addContact} isRtl={isRtl} onClose={onClose} closeLabel={t.close}
      footer={
        <>
          <Button tone="card" className="flex-1" onClick={onClose}>{t.cancel}</Button>
          <Button tone="ink" className="flex-1" disabled={!name.trim() || !!error}
            onClick={() => onSave({ name: name.trim(), avatar, username: slug, phone: phone.trim() })}>
            {initial ? t.save : t.startChat}
          </Button>
        </>
      }>
      <div className="flex items-end gap-3">
        <span className="pb-0.5"><Avatar user={preview} size={48} showStatus={false} /></span>
        <Field autoFocus className="flex-1 min-w-0" value={name} onChange={(e) => setName(e.target.value)} label={t.contactName} aria-label={t.contactName} />
      </div>
      {/* The handle reads left to right in both languages; its label and message follow the page. */}
      <div dir="ltr">
        <Field value={username} onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
          label={<span dir={dirOf(isRtl)} className="block text-start">{t.contactUsername}</span>} aria-label={t.contactUsername}
          prefix={<span className="text-muted">@</span>} inputClass="-ms-2" autoCapitalize="none" spellCheck={false} maxLength={32}
          error={error ? <span dir={dirOf(isRtl)} className="block text-start">{t[USERNAME_ERROR[error]]}</span> : null}
          hint={<span dir={dirOf(isRtl)} className={cx("flex items-center gap-1.5", slug && "text-ink font-medium")}>
            {slug && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.6} />}
            {slug ? t.usernameFree : t.contactAutoId}
          </span>} />
      </div>
      <Field value={phone} onChange={(e) => setPhone(e.target.value)} label={t.contactPhone} aria-label={t.contactPhone}
        inputMode="tel" dir="ltr" inputClass={isRtl ? "text-end" : ""} />
    </Sheet>
  );
}

/**
 * With accounts, a contact is a real FitClub member: found by the
 * @username they chose, then straight into a chat with them.
 */
export function FindPersonSheet({ store, isRtl, t, onFound, onClose }) {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const slug = username.trim().replace(/^@/, "").toLowerCase();
  const find = async () => {
    if (!slug) return;
    setBusy(true);
    setMissing(false);
    const hit = await store.resolveRemote(`@${slug}`).catch(() => ({}));
    setBusy(false);
    if (hit.user) onFound(hit.user); else setMissing(true);
  };
  return (
    <Sheet title={t.findPersonTitle} isRtl={isRtl} onClose={onClose} closeLabel={t.close}
      footer={
        <>
          <Button tone="card" className="flex-1" onClick={onClose}>{t.cancel}</Button>
          <Button tone="ink" className="flex-1" disabled={!slug || busy} aria-busy={busy} onClick={find}>{t.findPersonGo}</Button>
        </>
      }>
      <div dir="ltr">
        <Field autoFocus value={username} onChange={(e) => { setUsername(e.target.value.replace(/\s+/g, "")); setMissing(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") find(); }}
          label={<span dir={dirOf(isRtl)} className="block text-start">{t.contactUsername}</span>} aria-label={t.contactUsername}
          prefix={<span className="text-muted">@</span>} inputClass="-ms-2" autoCapitalize="none" spellCheck={false} maxLength={32}
          error={missing ? <span dir={dirOf(isRtl)} className="block text-start">{t.findPersonNone}</span> : null}
          hint={<span dir={dirOf(isRtl)} className="block text-start">{t.findPersonHint}</span>} />
      </div>
    </Sheet>
  );
}

/** Shares the app itself: the native share sheet where there is one, the clipboard otherwise. */
function shareApp(t, onDone) {
  const url = window.location.origin;
  if (navigator.share) { navigator.share({ title: "FitClub", text: t.inviteText, url }).catch(() => {}); return; }
  navigator.clipboard?.writeText(`${t.inviteText}: ${url}`).then(() => onDone?.(t.chatLinkCopied)).catch(() => {});
}

/** Contact directory, sorted the way Telegram sorts it: online first, then last seen. */
export default function ContactsScreen({ store, isRtl, t, onNewGroup, onNewChannel, onToast }) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const contacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...PEOPLE_SHOWN, ...store.customUsers, ...(store.remoteUsers || [])]
      .filter((u) => !q || u.name.toLowerCase().includes(q) || (u.nameFa || "").includes(q) || (u.username || "").toLowerCase().includes(q.replace(/^@/, "")) || (u.phone || "").replace(/\s+/g, "").includes(q))
      .sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
      });
  }, [store.customUsers, store.remoteUsers, query]);

  const subtitleOf = (u) => {
    if (u.username && query.trim().startsWith("@")) return { text: `@${u.username}`, online: false };
    if (u.online) return { text: t.online, online: true };
    if (u.lastSeen) return { text: `${t.lastSeenAt} ${num(timeOf(u.lastSeen), isRtl)}`, online: false };
    return { text: t.lastSeenRecently, online: false };
  };

  const quick = [
    { id: "group", icon: Users, label: t.newGroup, onClick: onNewGroup },
    { id: "channel", icon: Megaphone, label: t.newChannel, onClick: onNewChannel },
    { id: "invite", icon: UserPlus, label: t.inviteFriends, onClick: () => (DEMO_WORLD ? setAdding(true) : shareApp(t, onToast)) },
  ];

  return (
    <Screen isRtl={isRtl} tabbed>
      <header className="flex items-center justify-between gap-3">
        <h1 className="m-0 min-w-0 truncate font-display font-extrabold text-[38px] leading-[0.95] tracking-[-0.04em] text-ink">{t.contactsTitle}</h1>
        <div className="flex gap-2 shrink-0">
          <IconButton label={t.addContact} tone="jet" onClick={() => setAdding(true)}>
            <UserPlus className="w-5 h-5" strokeWidth={2} />
          </IconButton>
        </div>
      </header>

      <Field type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchContacts} aria-label={t.searchContacts}
        prefix={<Search className="w-[18px] h-[18px] text-muted" strokeWidth={2} />} />

      {/* Quick rows: new group and channel first, the way the Android client leads with them. */}
      <List>
        {quick.map(({ id, icon: Icon, label, onClick }) => (
          <Row key={id} onClick={onClick} title={label} isRtl={isRtl}
            icon={<IconWell size={40} tone="sunk"><Icon className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>} />
        ))}
      </List>

      <Label as="h2" className="m-0 mt-2 px-1">{t.sortedByLastSeen}</Label>
      <List>
        {contacts.length === 0 && (
          <li className="list-none px-4 py-8 text-center text-sm text-muted">{query.trim() || DEMO_WORLD ? t.noContactsMatch : t.noContactsYet}</li>
        )}
        {contacts.map((u) => {
          const sub = subtitleOf(u);
          const nameText = isRtl ? u.nameFa || u.name : u.name;
          return (
            <li key={u.id} className="list-none">
              <button type="button" onClick={() => store.openOrCreatePrivateChat(u)}
                className="w-full min-h-[64px] flex items-center gap-3 px-4 py-2.5 text-start bg-transparent border-0 cursor-pointer active:bg-sunk transition-colors">
                <Avatar user={u} size={44} />
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[15px] font-semibold text-ink truncate">{nameText}</span>
                    <NameBadges verified={u.verified} premium={u.premium} />
                  </span>
                  <span className={cx("text-[13px] truncate", sub.online ? "text-ink font-medium" : "text-muted")}>{sub.text}</span>
                </span>
              </button>
            </li>
          );
        })}
      </List>

      <AnimatePresence>
        {adding && (DEMO_WORLD ? (
          <ContactSheet store={store} isRtl={isRtl} t={t}
            onSave={(v) => { const user = store.addContact(v); setAdding(false); store.openOrCreatePrivateChat(user); }}
            onClose={() => setAdding(false)} />
        ) : (
          <FindPersonSheet store={store} isRtl={isRtl} t={t}
            onFound={(user) => { setAdding(false); store.openOrCreatePrivateChat(user); }}
            onClose={() => setAdding(false)} />
        ))}
      </AnimatePresence>
    </Screen>
  );
}
