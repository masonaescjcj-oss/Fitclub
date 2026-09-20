import React, { useState } from "react";
import { motion } from "framer-motion";
import { Ban, Bell, BellOff, ChevronRight, Flag, LogOut, MoreHorizontal, Phone, PlusCircle, Radio, Search, Settings, Share2, ShieldCheck, Trash2, UserMinus, UserPlus, Video } from "lucide-react";
import { ME, chatLink, lastMessage, previewOf, relativeTime } from "../../lib/chat/chatModel";
import { PEOPLE, findUser } from "../../lib/chat/chatStore";
import { TG } from "../../lib/chat/extras";
import { Avatar, NameBadges } from "./ChatBits";
import { ActionRow, Card, ChatPreviewCard, Hero, InfoRow, SectionHeader } from "./ProfileBits";
import { InviteLinkCard } from "./CreateScreens";
import { appLinkFor } from "../../lib/chat/search";

const ageOf = (iso) => Math.floor((Date.now() - new Date(`${iso}T00:00:00`)) / (365.25 * 86400000));
const birthdayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** A settings-style row: icon, label, count, chevron. */
function LinkRow({ icon: Icon, label, trailing, onClick, tone }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3.5 px-4 py-3 text-start active:bg-black/[0.04]">
      <Icon className="w-[22px] h-[22px] shrink-0" style={{ color: tone || TG.muted }} />
      <span className="flex-1 text-[16px]" style={{ color: tone || "var(--fg)" }}>{label}</span>
      {trailing !== undefined && <span className="text-[15px]" style={{ color: TG.muted }}>{trailing}</span>}
      <ChevronRight className="w-4 h-4 rtl:rotate-180" style={{ color: TG.muted }} />
    </button>
  );
}

/**
 * Who you are talking to: a person's profile, or a group's / channel's info.
 * Pushed over the conversation the way the iOS client does it.
 */
export default function PeerProfileScreen({
  store, chat, user, isRtl, t, onBack, onToast, onSearch, onMore, onOpenChat, onRequestReveal,
  leaderboardRows = null, challenge = null, blocked = false, onReport, onBlock, onUnblock,
  onEditInfo, onOpenSettings, onAddMembers, onMemberAction, onLeave, onDeleteChat, onEditContact, onDeleteContact,
}) {
  const isContact = !!user && store.customUsers.some((u) => u.id === user.id);
  const [memberFilter, setMemberFilter] = useState("all"); // all | admins
  const match = chat.buddy ? store.buddy.matches.find((m) => m.chatId === chat.id) : null;
  const isChannel = chat.type === "channel";
  const iAdmin = !user && (chat.admins || []).includes(ME);
  const iOwn = !user && chat.createdBy === ME;
  const link = !user ? chatLink(chat) : "";
  const typeTag = isChannel ? (chat.isPublic ? t.publicChannelTag : t.privateChannelTag) : (chat.isPublic ? t.publicGroupTag : t.privateGroupTag);

  const name = user ? (isRtl ? user.nameFa || user.name : user.name) : (isRtl ? chat.titleFa || chat.title : chat.title);
  const subtitle = user
    ? user.online ? t.online : user.lastSeen ? `${t.lastSeen} ${relativeTime(user.lastSeen, t)}` : t.lastSeenRecently
    : isChannel
      ? (chat.subscribers > 1 ? `${chat.subscribers.toLocaleString()} ${t.subscribers}` : typeTag)
      : `${chat.members.length} ${t.members}`;

  // What gets copied is the app's own openable URL; the card shows the short form.
  const copyLink = () => { navigator.clipboard?.writeText(appLinkFor(chat) || link).catch(() => {}); onToast(t.chatLinkCopied); };
  const copyId = () => { navigator.clipboard?.writeText(`@${user.username}`).catch(() => {}); onToast(t.idCopied); };

  const actions = user
    ? [
      { id: "call", icon: Phone, label: t.call, onClick: () => onToast(t.callsSimNote) },
      { id: "video", icon: Video, label: t.video, onClick: () => onToast(t.callsSimNote) },
      { id: "mute", icon: chat.muted ? BellOff : Bell, label: chat.muted ? t.unmute : t.mute, onClick: () => store.toggleMuted(chat.id) },
      { id: "search", icon: Search, label: t.searchAction, onClick: onSearch },
      { id: "more", icon: MoreHorizontal, label: t.more, onClick: onMore },
    ]
    : [
      ...(isChannel && iAdmin ? [{ id: "live", icon: Radio, label: t.liveStream, onClick: () => onToast(t.liveSoon) }] : []),
      { id: "mute", icon: chat.muted ? BellOff : Bell, label: chat.muted ? t.unmute : t.mute, onClick: () => store.toggleMuted(chat.id) },
      ...(isChannel && iAdmin ? [{ id: "story", icon: PlusCircle, label: t.addStory, onClick: () => onToast(t.storiesSoon) }] : []),
      ...(link ? [{ id: "share", icon: Share2, label: t.shareLinkAction, onClick: copyLink }] : [{ id: "search", icon: Search, label: t.searchAction, onClick: onSearch }]),
      { id: "more", icon: MoreHorizontal, label: t.more, onClick: onMore },
    ];

  // The channel this person runs, and the groups you are both in.
  const ownChannel = user ? store.chats.find((c) => c.type === "channel" && c.admins.includes(user.id)) : null;
  const shared = user ? store.chats.filter((c) => c.type === "group" && c.members.includes(user.id) && c.members.includes(ME)) : [];
  const memberIds = !user ? (memberFilter === "admins" ? chat.members.filter((id) => chat.admins.includes(id)) : chat.members) : [];
  const members = memberIds.map((id) => findUser(id));
  const adminCount = !user ? chat.members.filter((id) => chat.admins.includes(id)).length : 0;

  const previewFor = (c) => {
    const m = lastMessage(store.messages, c.id);
    return { preview: m ? previewOf(m, isRtl, t) : "", time: m ? relativeTime(m.at, t) : "" };
  };

  const roleOf = (id) => (id === chat.createdBy ? t.ownerLabel : chat.admins.includes(id) ? t.adminsLabel : "");

  return (
    <motion.div initial={{ x: isRtl ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: isRtl ? "-100%" : "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 40 }}
      className="fixed inset-0 z-[70] overflow-y-auto scrollbar-hide text-white pb-10 md:max-w-lg md:mx-auto"
      style={{ background: TG.bg }} dir={isRtl ? "rtl" : "ltr"}>
      <Hero color={user?.color || chat.color} emoji={user?.avatar || chat.emoji} name={name} subtitle={subtitle}
        badges={<NameBadges verified={chat.verified || user?.verified} premium={chat.premium || user?.premium} size={18} />}
        isRtl={isRtl} t={t} onBack={onBack}
        editLabel={t.edit} onEdit={user ? (isContact ? onEditContact : !match ? () => onToast(t.uiOnlyNote) : null) : (iAdmin ? onEditInfo : null)} />
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
            {user.username && (
              <button type="button" onClick={copyId} className="w-full text-start">
                <InfoRow label={`${t.usernameLabel} · ${t.copyId}`} value={`@${user.username}`} dir="ltr" link />
              </button>
            )}
            <InfoRow label={t.birthday} value={user.birthday ? `${birthdayLabel(user.birthday)} (${ageOf(user.birthday)} ${t.yearsOld})` : ""} />
            <InfoRow label={t.bio} value={user.bio} />
          </Card>
        </>
      )}

      {/* ── group / channel info ── */}
      {!user && chat.description && (
        <>
          <SectionHeader label={t.infoLabel} trailing={typeTag} />
          <Card>
            <InfoRow label={t.descriptionLabel} value={chat.description} />
          </Card>
        </>
      )}

      {!user && link && (chat.isPublic || iAdmin) && (
        <>
          <SectionHeader label={chat.isPublic ? t.linkLabel : t.inviteLink} trailing={chat.description ? undefined : typeTag} />
          <InviteLinkCard link={link} t={t} onCopy={copyLink} onQr={() => onToast(t.qrSoon)}
            onRevoke={iAdmin && !chat.isPublic ? () => { store.regenerateInviteLink(chat.id); onToast(t.linkRevoked); } : null} />
        </>
      )}

      {!user && (
        <div className="mt-3">
          <Card>
            <LinkRow icon={UserPlus} label={isChannel ? t.subscribersRow : t.membersLabel} trailing={chat.members.length.toLocaleString()}
              onClick={() => setMemberFilter("all")} />
            <LinkRow icon={ShieldCheck} label={t.administratorsRow} trailing={adminCount} onClick={() => setMemberFilter("admins")} />
            {iAdmin && <LinkRow icon={Settings} label={isChannel ? t.channelSettings : t.groupSettings} onClick={onOpenSettings} />}
          </Card>
        </div>
      )}

      {!user && chat.crew && challenge && (
        <>
          <SectionHeader label={`🎯 ${t.challengeTitle}`} trailing={challenge.done ? `✓ ${t.challengeDone}` : `${challenge.pct}%`} />
          <Card>
            <div className="px-4 py-3 space-y-2">
              <span className="block text-[15px] font-semibold text-white">{challenge.kind === "volume" ? t.kindVolume : challenge.kind === "sessions" ? t.kindSessions : t.kindStreak}</span>
              <span className="block text-[13px]" style={{ color: TG.muted }} dir="ltr">{challenge.value.toLocaleString()} / {challenge.target.toLocaleString()}</span>
              <span className="block h-2 rounded-full overflow-hidden" style={{ background: "var(--track)" }}>
                <span className="block h-full rounded-full" style={{ width: `${challenge.pct}%`, background: challenge.done ? "#34c759" : "linear-gradient(90deg,#34c759,#2fa6ff)" }} />
              </span>
            </div>
          </Card>
        </>
      )}

      {!user && chat.crew && leaderboardRows && (
        <>
          <SectionHeader label={`🏆 ${t.thisWeek}`} trailing={`${leaderboardRows.length} ${t.members}`} />
          <Card>
            {leaderboardRows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-7 text-center text-[17px]">{["🥇", "🥈", "🥉"][r.rank - 1] || <span className="text-[14px] text-neutral-500">{r.rank}</span>}</span>
                <Avatar user={findUser(r.id === "me" ? ME : r.id)} size={40} showStatus={false} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold text-white truncate">{r.name}</span>
                  <span className="block text-[12px]" style={{ color: TG.muted }}>{r.sessions} {t.sessionsLabel} · 🔥 {r.streak}</span>
                </span>
                <span className="text-[15px] font-bold text-white tabular-nums" dir="ltr">{r.volumeKg.toLocaleString()} <span className="text-[12px] font-medium text-neutral-500">{t.volumeKg}</span></span>
              </div>
            ))}
          </Card>
        </>
      )}

      {user && (
        <>
          <SectionHeader label={t.safetyLabel} />
          <Card>
            <button type="button" onClick={onReport} className="w-full flex items-center gap-3 px-4 py-3 text-start">
              <Flag className="w-5 h-5 shrink-0" style={{ color: TG.accent }} />
              <span className="text-[16px] font-medium" style={{ color: TG.accent }}>{t.report}</span>
            </button>
            <button type="button" onClick={blocked ? onUnblock : onBlock} className="w-full flex items-center gap-3 px-4 py-3 text-start">
              <Ban className="w-5 h-5 shrink-0 text-rose-500" />
              <span className="text-[16px] font-medium text-rose-500">{blocked ? t.unblock : t.block}</span>
            </button>
            {isContact && (
              <button type="button" onClick={onDeleteContact} className="w-full flex items-center gap-3 px-4 py-3 text-start">
                <UserMinus className="w-5 h-5 shrink-0 text-rose-500" />
                <span className="text-[16px] font-medium text-rose-500">{t.deleteContact}</span>
              </button>
            )}
          </Card>
        </>
      )}

      {!user && (
        <>
          <SectionHeader label={memberFilter === "admins" ? t.administratorsRow : (isChannel ? t.subscribersRow : t.membersLabel)} trailing={`${members.length}`} />
          <Card>
            {iAdmin && (
              <button type="button" onClick={onAddMembers} className="w-full flex items-center gap-3 px-3 py-2.5 text-start active:bg-black/[0.04]">
                <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: `${TG.accent}22` }}>
                  <UserPlus className="w-5 h-5" style={{ color: TG.accent }} />
                </span>
                <span className="text-[16px] font-medium" style={{ color: TG.accent }}>{isChannel ? t.addSubscribers : t.addMembers}</span>
              </button>
            )}
            {members.map((m) => {
              const mine = m.id === ME;
              const sub = mine ? t.online : m.online ? t.online : m.lastSeen ? `${t.lastSeen} ${relativeTime(m.lastSeen, t)}` : t.lastSeenRecently;
              const manageable = iAdmin && !mine && m.id !== chat.createdBy;
              return (
                <button key={m.id} type="button" disabled={mine}
                  onClick={() => {
                    if (manageable && onMemberAction) { onMemberAction(m); return; }
                    const person = PEOPLE.find((p) => p.id === m.id) || m;
                    onOpenChat(store.openOrCreatePrivateChat(person));
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-start active:bg-black/[0.04]">
                  <Avatar user={m} size={44} showStatus={false} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1">
                      <span className="text-[16px] font-semibold text-white truncate">{mine ? t.youLabel : (isRtl ? m.nameFa || m.name : m.name)}</span>
                      <NameBadges verified={m.verified} premium={m.premium} size={14} />
                    </span>
                    <span className="block text-[13px]" style={{ color: m.online ? TG.accent : TG.muted }}>{sub}</span>
                  </span>
                  {roleOf(m.id) && <span className="text-[12px] text-neutral-500">{roleOf(m.id)}</span>}
                </button>
              );
            })}
          </Card>

          <div className="mt-4">
            <Card>
              {iOwn ? (
                <button type="button" onClick={onDeleteChat} className="w-full flex items-center gap-3 px-4 py-3 text-start">
                  <Trash2 className="w-5 h-5 shrink-0 text-rose-500" />
                  <span className="text-[16px] font-medium text-rose-500">{isChannel ? t.deleteChannel : t.deleteGroup}</span>
                </button>
              ) : (
                <button type="button" onClick={onLeave} className="w-full flex items-center gap-3 px-4 py-3 text-start">
                  <LogOut className="w-5 h-5 shrink-0 text-rose-500" />
                  <span className="text-[16px] font-medium text-rose-500">{isChannel ? t.leaveChannel : t.leaveGroup}</span>
                </button>
              )}
            </Card>
          </div>
        </>
      )}
    </motion.div>
  );
}
