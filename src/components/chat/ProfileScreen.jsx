import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Check as CheckIcon, Pin, Settings, Share2, Smile, Sparkles } from "lucide-react";
import { GIFTS } from "../../lib/chat/extras";
import { Button, Card as KitCard, Field, Screen, Segmented, Sheet, cx, num } from "../ui/kit";
import { Avatar } from "./ChatBits";
import { ActionRow, Card, ChatPreviewCard, CopyGlyph, GiftTile, Hero, InfoRow, SectionHeader, StatusIcon } from "./ProfileBits";
import { LINK_HOST, lastMessage, previewOf, relativeTime, validateUsername } from "../../lib/chat/chatModel";

const AVATARS = ["🏋️", "💪", "🧗", "🏃", "🚴", "🧘", "🥇", "🦾", "😎", "🐺"];
const STATUSES = ["⭐", "🏆", "🔥", "💪", "⚡", "🥇", "🧊", "🌙", "❤️", "🫡"];

/** A grid of choices: the avatar picks are the user's own emoji, statuses draw as icons. */
function EmojiPickSheet({ title, options, current, asIcon = false, isRtl, t, onPick, onClose }) {
  return (
    <Sheet title={title} isRtl={isRtl} closeLabel={t.close} onClose={onClose}>
      <div className="grid grid-cols-5 gap-2">
        {options.map((e) => {
          const on = e === current;
          return (
            <button key={e} type="button" onClick={() => onPick(e)} aria-pressed={on} aria-label={e}
              className={cx("aspect-square rounded-[20px] flex items-center justify-center border-0 cursor-pointer transition-transform active:scale-95",
                on ? "bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line" : "bg-card text-ink")}>
              {asIcon ? <StatusIcon status={e} className="w-6 h-6" /> : <span className="text-[26px] leading-none">{e}</span>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

const USERNAME_ERROR = { short: "usernameShort", long: "usernameLong", chars: "usernameChars", start: "usernameStart", taken: "usernameTaken" };

/** Name, bio and the @username others find you by — checked live against everyone else's. */
function EditInfoSheet({ me, name, taken, isRtl, t, onSave, onClose }) {
  const [displayName, setDisplayName] = useState(me.name || name);
  const [bio, setBio] = useState(me.bio);
  const [username, setUsername] = useState(me.username);
  const slug = username.trim().replace(/^@/, "").toLowerCase();
  const others = taken.filter((u) => u.toLowerCase() !== (me.username || "").toLowerCase());
  const error = validateUsername(slug, [], null) || (others.map((u) => u.toLowerCase()).includes(slug) ? "taken" : null);
  return (
    <Sheet title={t.editInfo} isRtl={isRtl} closeLabel={t.close} onClose={onClose}
      footer={
        <>
          <Button tone="card" className="flex-1" onClick={onClose}>{t.cancel}</Button>
          <Button tone="ink" className="flex-1" disabled={!!error || !displayName.trim()}
            onClick={() => onSave({ name: displayName.trim(), bio: bio.trim(), username: slug })}>{t.save}</Button>
        </>
      }>
      <Field label={t.nameLabel} aria-label={t.nameLabel} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      <Field label={t.bio} aria-label={t.bio} value={bio} onChange={(e) => setBio(e.target.value)} />
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-muted">{t.usernameLabel}</span>
        <label dir="ltr" className={cx("h-[52px] rounded-2xl bg-card flex items-center gap-1 px-4 transition-shadow",
          error ? "ring-2 ring-inset ring-alert" : "focus-within:ring-2 focus-within:ring-inset focus-within:ring-ink")}>
          <span className="font-semibold text-muted shrink-0">@</span>
          <input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))} aria-label={t.usernameLabel}
            autoCapitalize="none" spellCheck={false} maxLength={32}
            className="flex-1 min-w-0 h-full border-0 bg-transparent text-base font-semibold text-ink outline-none focus-visible:outline-none" />
        </label>
        <span className={cx("inline-flex items-center gap-1.5 text-[13px]", error ? "text-alert" : "font-semibold text-ink")} aria-live="polite">
          {!error && <CheckIcon className="w-4 h-4 shrink-0" strokeWidth={2.6} />}
          {error ? t[USERNAME_ERROR[error]] : t.usernameFree}
        </span>
        <span className="text-[13px] leading-snug text-muted">
          {t.usernameHint} <span dir="ltr" className="font-semibold text-ink">{LINK_HOST}/{slug || "…"}</span>
        </span>
      </div>
    </Sheet>
  );
}

/** My own profile, laid out like the iOS client: avatar and name, round actions, cards. */
export default function ProfileScreen({ store, name, isRtl, t, onBack, onGoSettings, onOpenChannel, onToast }) {
  const me = store.me;
  const [tab, setTab] = useState("gifts");
  const [sheet, setSheet] = useState(null); // "photo" | "status" | "edit"

  const age = Math.floor((Date.now() - new Date(`${me.birthday}T00:00:00`)) / (365.25 * 86400000));
  const birthdayLabel = new Date(`${me.birthday}T00:00:00`)
    .toLocaleDateString(isRtl ? "fa-IR" : undefined, { day: "numeric", month: "short", year: "numeric" });

  const channel = store.chats.find((c) => c.id === "news");
  const last = channel ? lastMessage(store.messages, channel.id) : null;

  const share = () => {
    navigator.clipboard?.writeText(`${LINK_HOST}/${me.username}`).catch(() => {});
    onToast?.(t.linkCopied);
  };
  const copyId = () => {
    navigator.clipboard?.writeText(`@${me.username}`).catch(() => {});
    onToast?.(t.idCopied);
  };
  const shownName = me.name || name;

  const actions = [
    { id: "photo", icon: Smile, label: t.photo, onClick: () => setSheet("photo") },
    { id: "status", icon: Sparkles, label: t.statusAction, onClick: () => setSheet("status") },
    { id: "share", icon: Share2, label: t.shareAction, onClick: share },
    { id: "settings", icon: Settings, label: t.settingsTab, onClick: onGoSettings },
  ];

  // The status sits on the avatar's corner, as the PRO pill does on the app's profile.
  const avatar = (
    <span className="relative">
      <Avatar user={{ ...me, id: "me", name: shownName, online: false, emojiStatus: null }} size={104} showStatus={false} />
      <button type="button" onClick={() => setSheet("status")} aria-label={t.emojiStatus}
        className="absolute -end-1 bottom-0.5 w-9 h-9 rounded-full bg-jet text-accent flex items-center justify-center border-0 cursor-pointer ring-[3px] ring-canvas">
        <StatusIcon status={me.emojiStatus} className="w-[18px] h-[18px]" />
      </button>
    </span>
  );

  return (
    <Screen isRtl={isRtl}>
      <Hero avatar={avatar} name={shownName} isRtl={isRtl} t={t} onBack={onBack}
        subtitle={<span dir="ltr">@{me.username}</span>}
        editLabel={t.edit} onEdit={() => setSheet("edit")}>
        {me.bio && <p dir="auto" className="m-0 mt-2 max-w-[300px] text-[15px] leading-snug text-ink">{me.bio}</p>}
      </Hero>
      <ActionRow actions={actions} />

      {channel && (
        <>
          <SectionHeader label={t.channelLabel} trailing={`${channel.subscribers.toLocaleString(isRtl ? "fa-IR" : "en-US")} ${t.subscribers}`} />
          <Card>
            <ChatPreviewCard chat={channel} title={isRtl ? channel.titleFa || channel.title : channel.title}
              preview={last ? previewOf(last, isRtl, t) : ""} time={last ? num(relativeTime(last.at, t), isRtl) : ""} onClick={onOpenChannel} />
          </Card>
        </>
      )}

      <SectionHeader label={t.infoLabel} />
      <Card>
        <InfoRow label={t.mobile} value={me.phone} dir="ltr" link />
        <InfoRow label={t.usernameLabel} value={`@${me.username}`} dir="ltr" link onClick={copyId}
          action={<CopyGlyph />} actionLabel={t.copyId} />
        <InfoRow label={t.birthday} value={`${birthdayLabel} (${num(age, isRtl)} ${t.yearsOld})`} />
        <InfoRow label={t.bio} value={me.bio} dir="auto" />
      </Card>

      {/* Gifts / Posts */}
      <KitCard className="flex flex-col gap-3 mt-2">
        <Segmented onCard value={tab} onChange={setTab}
          options={[{ id: "gifts", label: t.giftsTab }, { id: "posts", label: t.postsTab }]} />
        {tab === "gifts" ? (
          <div className="grid grid-cols-3 gap-2">
            {GIFTS.map((g, i) => (
              <GiftTile key={g.id} gift={g} index={i} isRtl={isRtl}>
                <Pin aria-hidden="true" className="absolute top-2.5 start-2.5 w-3 h-3 text-muted" strokeWidth={2.2} />
              </GiftTile>
            ))}
          </div>
        ) : (
          <p className="m-0 py-8 text-center text-sm text-muted">{t.noPosts}</p>
        )}
      </KitCard>

      <AnimatePresence>
        {sheet === "photo" && (
          <EmojiPickSheet title={t.pickEmoji} options={AVATARS} current={me.avatar} isRtl={isRtl} t={t}
            onPick={(e) => { store.updateMe({ avatar: e }); setSheet(null); }} onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "status" && (
          <EmojiPickSheet title={t.pickStatus} options={STATUSES} current={me.emojiStatus} asIcon isRtl={isRtl} t={t}
            onPick={(e) => { store.updateMe({ emojiStatus: e }); setSheet(null); }} onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "edit" && (
          <EditInfoSheet me={me} name={name} taken={store.takenUsernames()} isRtl={isRtl} t={t}
            onSave={(patch) => { store.updateMe(patch); setSheet(null); onToast?.(t.chatInfoSaved); }} onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>
    </Screen>
  );
}
