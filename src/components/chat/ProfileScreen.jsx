import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Settings, Share2, Smile, Sparkles } from "lucide-react";
import { GIFTS, TG } from "../../lib/chat/extras";
import { Sheet } from "./ChatSheets";
import { ActionRow, Card, ChatPreviewCard, Hero, InfoRow, SectionHeader } from "./ProfileBits";
import { lastMessage, previewOf, relativeTime } from "../../lib/chat/chatModel";

const AVATARS = ["🏋️", "💪", "🧗", "🏃", "🚴", "🧘", "🥇", "🦾", "😎", "🐺"];
const STATUSES = ["⭐", "🏆", "🔥", "💪", "⚡", "🥇", "🧊", "🌙", "❤️", "🫡"];

function EmojiPickSheet({ title, options, isRtl, t, onPick, onClose }) {
  return (
    <Sheet title={title} isRtl={isRtl} t={t} onClose={onClose}>
      <div className="p-4 flex flex-wrap gap-2">
        {options.map((e) => (
          <button key={e} type="button" onClick={() => onPick(e)}
            className="w-12 h-12 rounded-2xl bg-white/[0.06] hover:bg-white/15 text-2xl flex items-center justify-center active:scale-90 transition-all">
            {e}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function EditInfoSheet({ me, isRtl, t, onSave, onClose }) {
  const [bio, setBio] = useState(me.bio);
  const [username, setUsername] = useState(me.username);
  const field = "w-full h-11 px-3 rounded-2xl bg-[#1c2733] border border-white/10 text-sm font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30";
  return (
    <Sheet title={t.editInfo} isRtl={isRtl} t={t} onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 font-black text-sm">{t.cancel}</button>
          <button type="button" onClick={() => onSave({ bio: bio.trim(), username: username.trim() || me.username })}
            className="flex-1 h-12 rounded-2xl text-white font-black text-sm on-accent" style={{ background: TG.accentDeep }}>{t.save}</button>
        </>
      }>
      <div className="p-4 space-y-4">
        <label className="block">
          <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-1.5">{t.bio}</span>
          <input value={bio} onChange={(e) => setBio(e.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-1.5">{t.usernameLabel}</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className={field} dir="ltr" />
        </label>
      </div>
    </Sheet>
  );
}

/** My own profile, laid out like the iOS client: hero, round actions, cards. */
export default function ProfileScreen({ store, name, isRtl, t, onBack, onGoSettings, onOpenChannel, onToast }) {
  const me = store.me;
  const [tab, setTab] = useState("gifts");
  const [sheet, setSheet] = useState(null); // "photo" | "status" | "edit"

  const age = Math.floor((Date.now() - new Date(`${me.birthday}T00:00:00`)) / (365.25 * 86400000));
  const birthdayLabel = new Date(`${me.birthday}T00:00:00`)
    .toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  const channel = store.chats.find((c) => c.id === "news");
  const last = channel ? lastMessage(store.messages, channel.id) : null;

  const share = () => {
    navigator.clipboard?.writeText(`https://t.me/${me.username}`).catch(() => {});
    onToast?.(t.linkCopied);
  };

  const actions = [
    { id: "photo", icon: Smile, label: t.photo, onClick: () => setSheet("photo") },
    { id: "status", icon: Sparkles, label: t.statusAction, onClick: () => setSheet("status") },
    { id: "share", icon: Share2, label: t.shareAction, onClick: share },
    { id: "settings", icon: Settings, label: t.settingsTab, onClick: onGoSettings },
  ];

  return (
    <div className="w-full min-h-[100dvh] text-white pb-12" style={{ background: TG.bg }}>
      <Hero color="#844783" emoji={me.avatar} name={name} subtitle={t.online} isRtl={isRtl} t={t} onBack={onBack}
        badges={<button type="button" onClick={() => setSheet("status")} aria-label={t.emojiStatus} className="text-[22px] leading-none">{me.emojiStatus}</button>}
        editLabel={t.edit} onEdit={() => setSheet("edit")} />
      <ActionRow actions={actions} />

      {channel && (
        <>
          <SectionHeader label={t.channelLabel} trailing={`${channel.subscribers.toLocaleString()} ${t.subscribers}`} />
          <Card>
            <ChatPreviewCard chat={channel} title={isRtl ? channel.titleFa || channel.title : channel.title}
              preview={last ? previewOf(last, isRtl, t) : ""} time={last ? relativeTime(last.at, t) : ""} onClick={onOpenChannel} />
          </Card>
        </>
      )}

      <SectionHeader label={t.infoLabel} />
      <Card>
        <InfoRow label={t.mobile} value={me.phone} dir="ltr" link />
        <InfoRow label={t.usernameLabel} value={`@${me.username}`} dir="ltr" link />
        <InfoRow label={t.birthday} value={`${birthdayLabel} (${age} ${t.yearsOld})`} />
        <InfoRow label={t.bio} value={me.bio} />
      </Card>

      {/* Gifts / Posts */}
      <Card className="mt-4">
        <div className="flex border-b" style={{ borderColor: TG.sep }}>
          {[["gifts", `${t.giftsTab} 🎂🏆`], ["posts", t.postsTab]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={`flex-1 py-3 text-[14px] font-semibold transition-colors relative ${tab === id ? "text-white" : "text-neutral-500"}`}>
              {label}
              {tab === id && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-t-full" style={{ background: TG.accentDeep }} />
              )}
            </button>
          ))}
        </div>
        {tab === "gifts" ? (
          <div className="grid grid-cols-3 gap-2 p-3">
            {GIFTS.map((g) => (
              <div key={g.id} className="rounded-2xl p-3 flex flex-col items-center gap-1.5 relative on-accent" style={{ background: g.bg }}>
                <span className="absolute top-1.5 start-1.5 text-[10px]">📌</span>
                <span className="text-3xl">{g.emoji}</span>
                <span className="text-[9px] font-black text-white/90 text-center leading-tight">{isRtl ? g.nameFa : g.nameEn}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-xs font-bold text-neutral-600">{t.noPosts}</p>
        )}
      </Card>

      <AnimatePresence>
        {sheet === "photo" && (
          <EmojiPickSheet title={t.pickEmoji} options={AVATARS} isRtl={isRtl} t={t}
            onPick={(e) => { store.updateMe({ avatar: e }); setSheet(null); }} onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "status" && (
          <EmojiPickSheet title={t.pickStatus} options={STATUSES} isRtl={isRtl} t={t}
            onPick={(e) => { store.updateMe({ emojiStatus: e }); setSheet(null); }} onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "edit" && (
          <EditInfoSheet me={me} isRtl={isRtl} t={t}
            onSave={(patch) => { store.updateMe(patch); setSheet(null); }} onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
