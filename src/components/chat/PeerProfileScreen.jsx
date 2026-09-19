import React from "react";
import { motion } from "framer-motion";
import { Bell, BellOff, MoreHorizontal, Phone, Search, Video } from "lucide-react";
import { ME, lastMessage, previewOf, relativeTime } from "../../lib/chat/chatModel";
import { PEOPLE, findUser } from "../../lib/chat/chatStore";
import { TG } from "../../lib/chat/extras";
import { Avatar, NameBadges } from "./ChatBits";
import { ActionRow, Card, ChatPreviewCard, Hero, InfoRow, SectionHeader } from "./ProfileBits";

const ageOf = (iso) => Math.floor((Date.now() - new Date(`${iso}T00:00:00`)) / (365.25 * 86400000));
const birthdayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/**
 * Who you are talking to: a person's profile, or a group's / channel's info.
 * Pushed over the conversation the way the iOS client does it.
 */
export default function PeerProfileScreen({ store, chat, user, isRtl, t, onBack, onToast, onSearch, onMore, onOpenChat, onRequestReveal }) {
  const match = chat.buddy ? store.buddy.matches.find((m) => m.chatId === chat.id) : null;
  const name = user ? (isRtl ? user.nameFa || user.name : user.name) : (isRtl ? chat.titleFa || chat.title : chat.title);
  const subtitle = user
    ? user.online ? t.online : user.lastSeen ? `${t.lastSeen} ${relativeTime(user.lastSeen, t)}` : t.lastSeenRecently
    : chat.type === "channel" ? `${chat.subscribers.toLocaleString()} ${t.subscribers}` : `${chat.members.length} ${t.members}`;

  const actions = [
    ...(user ? [
      { id: "call", icon: Phone, label: t.call, onClick: () => onToast(t.callsSimNote) },
      { id: "video", icon: Video, label: t.video, onClick: () => onToast(t.callsSimNote) },
    ] : []),
    { id: "mute", icon: chat.muted ? BellOff : Bell, label: chat.muted ? t.unmute : t.mute, onClick: () => store.toggleMuted(chat.id) },
    { id: "search", icon: Search, label: t.searchAction, onClick: onSearch },
    { id: "more", icon: MoreHorizontal, label: t.more, onClick: onMore },
  ];

  // The channel this person runs, and the groups you are both in.
  const ownChannel = user ? store.chats.find((c) => c.type === "channel" && c.admins.includes(user.id)) : null;
  const shared = user ? store.chats.filter((c) => c.type === "group" && c.members.includes(user.id) && c.members.includes(ME)) : [];
  const members = !user ? (chat.type === "channel" ? chat.admins : chat.members).map((id) => findUser(id)) : [];

  const previewFor = (c) => {
    const m = lastMessage(store.messages, c.id);
    return { preview: m ? previewOf(m, isRtl, t) : "", time: m ? relativeTime(m.at, t) : "" };
  };

  return (
    <motion.div initial={{ x: isRtl ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: isRtl ? "-100%" : "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 40 }}
      className="fixed inset-0 z-[70] overflow-y-auto scrollbar-hide text-white pb-10 md:max-w-lg md:mx-auto"
      style={{ background: TG.bg }} dir={isRtl ? "rtl" : "ltr"}>
      <Hero color={user?.color || chat.color} emoji={user?.avatar || chat.emoji} name={name} subtitle={subtitle}
        badges={<NameBadges verified={chat.verified || user?.verified} premium={chat.premium || user?.premium} size={18} />}
        isRtl={isRtl} t={t} onBack={onBack}
        editLabel={t.edit} onEdit={user && !match ? () => onToast(t.uiOnlyNote) : null} />
      <ActionRow actions={actions} />

      {ownChannel && (
        <>
          <SectionHeader label={t.channelLabel} trailing={`${ownChannel.subscribers.toLocaleString()} ${t.subscribers}`} />
          <Card>
            <ChatPreviewCard chat={ownChannel} title={isRtl ? ownChannel.titleFa || ownChannel.title : ownChannel.title}
              {...previewFor(ownChannel)} onClick={() => onOpenChat(ownChannel.id)} />
          </Card>
        </>
      )}

      {shared.length > 0 && (
        <>
          <SectionHeader label={t.groupsInCommon} trailing={`${shared.length}`} />
          <Card>
            {shared.map((c) => (
              <ChatPreviewCard key={c.id} chat={c} title={isRtl ? c.titleFa || c.title : c.title}
                {...previewFor(c)} onClick={() => onOpenChat(c.id)} />
            ))}
          </Card>
        </>
      )}

      {match && (
        <>
          <SectionHeader label={t.anonTitle} trailing={`${match.score}% ${t.compatible}`} />
          <Card>
            <div className="px-4 py-3 space-y-3">
              <p className="text-[14px] leading-snug" style={{ color: TG.muted }}>{t.anonHint}</p>
              {match.revealed ? (
                <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: "#1f9d4d" }}>🙂 {t.revealed}</span>
              ) : match.revealRequested ? (
                <span className="inline-flex items-center gap-1.5 text-[14px] font-medium" style={{ color: TG.muted }}>⏳ {t.revealPending}</span>
              ) : (
                <button type="button" onClick={onRequestReveal}
                  className="h-11 px-5 rounded-full text-[15px] font-semibold text-white on-accent" style={{ background: TG.accentDeep }}>
                  🎭 {t.reveal}
                </button>
              )}
            </div>
          </Card>
        </>
      )}

      {user && (user.bio || user.phone || user.username || user.birthday) && (
        <>
          <SectionHeader label={t.infoLabel} />
          <Card>
            <InfoRow label={t.mobile} value={user.phone} dir="ltr" link />
            <InfoRow label={t.usernameLabel} value={user.username ? `@${user.username}` : ""} dir="ltr" link />
            <InfoRow label={t.birthday} value={user.birthday ? `${birthdayLabel(user.birthday)} (${ageOf(user.birthday)} ${t.yearsOld})` : ""} />
            <InfoRow label={t.bio} value={user.bio} />
          </Card>
        </>
      )}

      {!user && (
        <>
          <SectionHeader label={chat.type === "channel" ? t.adminsLabel : t.membersLabel} trailing={`${members.length}`} />
          <Card>
            {members.map((m) => {
              const mine = m.id === ME;
              const sub = mine ? t.online : m.online ? t.online : m.lastSeen ? `${t.lastSeen} ${relativeTime(m.lastSeen, t)}` : t.lastSeenRecently;
              return (
                <button key={m.id} type="button" disabled={mine}
                  onClick={() => { const person = PEOPLE.find((p) => p.id === m.id) || m; onOpenChat(store.openOrCreatePrivateChat(person)); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-start active:bg-black/[0.04]">
                  <Avatar user={m} size={44} showStatus={false} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1">
                      <span className="text-[16px] font-semibold text-white truncate">{isRtl ? m.nameFa || m.name : m.name}</span>
                      <NameBadges verified={m.verified} premium={m.premium} size={14} />
                    </span>
                    <span className="block text-[13px]" style={{ color: m.online ? TG.accent : TG.muted }}>{sub}</span>
                  </span>
                  {chat.admins.includes(m.id) && <span className="text-[12px] text-neutral-500">{t.adminsLabel}</span>}
                </button>
              );
            })}
          </Card>
        </>
      )}
    </motion.div>
  );
}
