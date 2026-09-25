import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Ban, Bell, BellOff, Check, Flag, Flame, Globe, Hourglass, Lock, LogOut, MoreHorizontal,
  Search, Settings, Share2, ShieldCheck, Target, Trash2, Trophy, UserCheck, UserMinus, UserPlus, Users, VenetianMask,
} from "lucide-react";
import { ME, chatLink, lastMessage, previewOf, relativeTime } from "../../lib/chat/chatModel";
import { PEOPLE, findUser } from "../../lib/chat/chatStore";
import { Bar, Button, Card as KitCard, IconWell, List, Row, Tag, cx, num } from "../ui/kit";
import { Avatar, NameBadges } from "./ChatBits";
import { ActionRow, Card, ChatPreviewCard, CopyGlyph, Hero, InfoRow, LinkCard, SectionHeader } from "./ProfileBits";
import { appLinkFor } from "../../lib/chat/search";

const ageOf = (iso) => Math.floor((Date.now() - new Date(`${iso}T00:00:00`)) / (365.25 * 86400000));
const birthdayLabel = (iso, isRtl) => new Date(`${iso}T00:00:00`).toLocaleDateString(isRtl ? "fa-IR" : undefined, { day: "numeric", month: "short", year: "numeric" });

const well = (Icon, tone = "sunk") => (
  <IconWell tone={tone} size={36}><Icon className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>
);

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
  const n = (v) => (typeof v === "number" ? v.toLocaleString(isRtl ? "fa-IR" : "en-US") : num(v, isRtl));
  // Telegram's tags are lower case ("public channel"); a pill starts with a capital.
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  const name = user ? (isRtl ? user.nameFa || user.name : user.name) : (isRtl ? chat.titleFa || chat.title : chat.title);
  const subtitle = user
    ? user.online ? t.online : user.lastSeen ? `${t.lastSeen} ${num(relativeTime(user.lastSeen, t), isRtl)}` : t.lastSeenRecently
    : isChannel
      ? (chat.subscribers > 1 ? `${n(chat.subscribers)} ${t.subscribers}` : typeTag)
      : `${n(chat.members.length)} ${t.members}`;

  // What gets copied is the app's own openable URL; the card shows the short form.
  const copyLink = () => { navigator.clipboard?.writeText(appLinkFor(chat) || link).catch(() => {}); onToast(t.chatLinkCopied); };
  const copyId = () => { navigator.clipboard?.writeText(`@${user.username}`).catch(() => {}); onToast(t.idCopied); };

  const actions = user
    ? [
      { id: "mute", icon: chat.muted ? BellOff : Bell, label: chat.muted ? t.unmute : t.mute, onClick: () => store.toggleMuted(chat.id) },
      { id: "search", icon: Search, label: t.searchAction, onClick: onSearch },
      { id: "more", icon: MoreHorizontal, label: t.more, onClick: onMore },
    ]
    : [
      { id: "mute", icon: chat.muted ? BellOff : Bell, label: chat.muted ? t.unmute : t.mute, onClick: () => store.toggleMuted(chat.id) },
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
    return { preview: m ? previewOf(m, isRtl, t) : "", time: m ? num(relativeTime(m.at, t), isRtl) : "" };
  };

  // One person is one admin, so the pill says it in the singular.
  const roleOf = (id) => (id === chat.createdBy ? t.ownerLabel : chat.admins.includes(id) ? (isRtl ? "مدیر" : "admin") : "");
  const onEdit = user ? (isContact ? onEditContact : !match ? () => onToast(t.uiOnlyNote) : null) : (iAdmin ? onEditInfo : null);
  const TypeIcon = chat.isPublic ? Globe : Lock;

  return (
    <motion.div initial={{ x: isRtl ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: isRtl ? "-100%" : "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 40 }}
      className="ui fixed inset-0 z-[70] overflow-y-auto scrollbar-hide bg-canvas text-ink md:max-w-lg md:mx-auto"
      dir={isRtl ? "rtl" : "ltr"}>
      <div className="min-h-full px-5 pt-[calc(env(safe-area-inset-top)+6px)] pb-10 flex flex-col gap-3.5">
        <Hero chat={user ? undefined : chat} user={user || undefined} name={name} subtitle={subtitle}
          badges={<NameBadges verified={chat.verified || user?.verified} premium={chat.premium || user?.premium} size={20} />}
          isRtl={isRtl} t={t} onBack={onBack} editLabel={t.edit} onEdit={onEdit}>
          {!user && (
            <Tag tone="card" className="mt-3"><TypeIcon className="w-3.5 h-3.5" strokeWidth={2} />{cap(typeTag)}</Tag>
          )}
          {!user && chat.description && (
            <p dir="auto" className="m-0 mt-3 max-w-[300px] text-[15px] leading-snug text-ink whitespace-pre-line">{chat.description}</p>
          )}
          {user && blocked && (
            <Tag tone="alert" className="mt-3"><Ban className="w-3.5 h-3.5" strokeWidth={2} />{isRtl ? "مسدود شده" : "Blocked"}</Tag>
          )}
        </Hero>
        <ActionRow actions={actions} />

        {ownChannel && (
          <>
            <SectionHeader label={t.channelLabel} trailing={`${n(ownChannel.subscribers)} ${t.subscribers}`} />
            <Card>
              <ChatPreviewCard chat={ownChannel} title={isRtl ? ownChannel.titleFa || ownChannel.title : ownChannel.title}
                {...previewFor(ownChannel)} onClick={() => onOpenChat(ownChannel.id)} />
            </Card>
          </>
        )}

        {shared.length > 0 && (
          <>
            <SectionHeader label={t.groupsInCommon} trailing={n(shared.length)} />
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
            <SectionHeader label={t.anonTitle} trailing={`${n(match.score)}% ${t.compatible}`} />
            <KitCard className="flex flex-col items-start gap-3">
              <p className="m-0 text-sm leading-snug text-muted">{t.anonHint}</p>
              {match.revealed ? (
                <Tag tone="inv"><UserCheck className="w-3.5 h-3.5" strokeWidth={2.2} />{t.revealed}</Tag>
              ) : match.revealRequested ? (
                <Tag tone="sunk"><Hourglass className="w-3.5 h-3.5" strokeWidth={2.2} />{t.revealPending}</Tag>
              ) : (
                <Button tone="ink" icon={<VenetianMask className="w-[18px] h-[18px]" strokeWidth={2} />} onClick={onRequestReveal}>
                  {t.reveal}
                </Button>
              )}
            </KitCard>
          </>
        )}

        {user && (user.bio || user.phone || user.username || user.birthday) && (
          <>
            <SectionHeader label={t.infoLabel} />
            <Card>
              <InfoRow label={t.mobile} value={user.phone} dir="ltr" link />
              {user.username && (
                <InfoRow label={t.usernameLabel} value={`@${user.username}`} dir="ltr" link onClick={copyId}
                  action={<CopyGlyph />} actionLabel={t.copyId} />
              )}
              <InfoRow label={t.birthday} value={user.birthday ? `${birthdayLabel(user.birthday, isRtl)} (${n(ageOf(user.birthday))} ${t.yearsOld})` : ""} />
              <InfoRow label={t.bio} value={user.bio} dir="auto" />
            </Card>
          </>
        )}

        {/* ── group / channel info ── */}
        {!user && link && (chat.isPublic || iAdmin) && (
          <LinkCard label={chat.isPublic ? t.linkLabel : t.inviteLink} link={link} t={t} isRtl={isRtl}
            hint={chat.isPublic ? (isChannel ? t.linkHint : null) : t.inviteLinkHint}
            onCopy={copyLink}
            onRevoke={iAdmin && !chat.isPublic ? () => { store.regenerateInviteLink(chat.id); onToast(t.linkRevoked); } : null} />
        )}

        {!user && (
          <List>
            <Row isRtl={isRtl} chevron aria-pressed={memberFilter === "all"}
              icon={well(Users, memberFilter === "all" ? "inv" : "sunk")}
              title={isChannel ? t.subscribersRow : t.membersLabel} right={n(chat.members.length)}
              onClick={() => setMemberFilter("all")} />
            <Row isRtl={isRtl} chevron aria-pressed={memberFilter === "admins"}
              icon={well(ShieldCheck, memberFilter === "admins" ? "inv" : "sunk")}
              title={t.administratorsRow} right={n(adminCount)} onClick={() => setMemberFilter("admins")} />
            {iAdmin && (
              <Row isRtl={isRtl} chevron icon={well(Settings)} title={isChannel ? t.channelSettings : t.groupSettings} onClick={onOpenSettings} />
            )}
          </List>
        )}

        {!user && chat.crew && challenge && (
          <>
            <SectionHeader label={<><Target className="w-3.5 h-3.5" strokeWidth={2.2} />{t.challengeTitle}</>}
              trailing={challenge.done ? <><Check className="w-3.5 h-3.5 text-ink" strokeWidth={2.6} />{t.challengeDone}</> : `${n(challenge.pct)}%`} />
            <KitCard className="flex flex-col gap-2">
              <span className="text-[15px] font-semibold text-ink">
                {challenge.kind === "volume" ? t.kindVolume : challenge.kind === "sessions" ? t.kindSessions : t.kindStreak}
              </span>
              <span className="text-[13px] text-muted"><span dir="ltr">{n(challenge.value)} / {n(challenge.target)}</span></span>
              <Bar value={challenge.pct / 100} height={8} color={challenge.done ? "bg-jet" : "bg-inv"} />
            </KitCard>
          </>
        )}

        {!user && chat.crew && leaderboardRows && (
          <>
            <SectionHeader label={<><Trophy className="w-3.5 h-3.5" strokeWidth={2.2} />{t.thisWeek}</>}
              trailing={`${n(leaderboardRows.length)} ${t.members}`} />
            <Card>
              {leaderboardRows.map((r) => (
                <li key={r.id} className="list-none min-h-[60px] flex items-center gap-3 px-4 py-2.5">
                  <span className={cx("w-7 h-7 rounded-full shrink-0 inline-flex items-center justify-center text-[13px] font-bold",
                    r.rank === 1 ? "bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line" : r.rank <= 3 ? "bg-sunk text-ink" : "text-muted")}>
                    {n(r.rank)}
                  </span>
                  <Avatar user={findUser(r.id === "me" ? ME : r.id)} size={40} showStatus={false} />
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold text-ink truncate">{r.name}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      {n(r.sessions)} {t.sessionsLabel}
                      <Flame className="ms-1.5 w-3.5 h-3.5" strokeWidth={2} />{n(r.streak)}
                    </span>
                  </span>
                  <span className="text-[15px] font-bold text-ink tabular-nums whitespace-nowrap">
                    {n(r.volumeKg)} <span className="text-xs font-medium text-muted">{t.volumeKg}</span>
                  </span>
                </li>
              ))}
            </Card>
          </>
        )}

        {user && (
          <>
            <SectionHeader label={t.safetyLabel} />
            <List>
              <Row isRtl={isRtl} icon={well(Flag)} title={t.report} onClick={onReport} />
              {blocked
                ? <Row isRtl={isRtl} icon={well(Ban)} title={t.unblock} onClick={onUnblock} />
                : <Row isRtl={isRtl} danger icon={well(Ban, "alert")} title={t.block} onClick={onBlock} />}
              {isContact && (
                <Row isRtl={isRtl} danger icon={well(UserMinus, "alert")} title={t.deleteContact} onClick={onDeleteContact} />
              )}
            </List>
          </>
        )}

        {!user && (
          <>
            <SectionHeader label={memberFilter === "admins" ? t.administratorsRow : (isChannel ? t.subscribersRow : t.membersLabel)} trailing={n(members.length)} />
            <Card>
              {iAdmin && (
                <Row isRtl={isRtl} icon={well(UserPlus, "inv")} title={isChannel ? t.addSubscribers : t.addMembers} onClick={onAddMembers} />
              )}
              {members.map((m) => {
                const mine = m.id === ME;
                const sub = mine ? t.online : m.online ? t.online : m.lastSeen ? `${t.lastSeen} ${num(relativeTime(m.lastSeen, t), isRtl)}` : t.lastSeenRecently;
                const manageable = iAdmin && !mine && m.id !== chat.createdBy;
                const role = roleOf(m.id);
                return (
                  <li key={m.id} className="list-none">
                    <button type="button" disabled={mine}
                      onClick={() => {
                        if (manageable && onMemberAction) { onMemberAction(m); return; }
                        const person = PEOPLE.find((p) => p.id === m.id) || m;
                        onOpenChat(store.openOrCreatePrivateChat(person));
                      }}
                      className="w-full min-h-[60px] flex items-center gap-3 px-4 py-2 text-start bg-transparent border-0 cursor-pointer active:bg-sunk transition-colors disabled:cursor-default disabled:active:bg-transparent">
                      <Avatar user={m} size={44} showStatus={false} />
                      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="flex items-center gap-1 min-w-0">
                          <span className="text-[15px] font-semibold text-ink truncate">{mine ? t.youLabel : (isRtl ? m.nameFa || m.name : m.name)}</span>
                          <NameBadges verified={m.verified} premium={m.premium} size={14} />
                        </span>
                        <span className={cx("text-[13px]", m.online || mine ? "text-ink font-medium" : "text-muted")}>{sub}</span>
                      </span>
                      {role && (
                        <span className={cx("h-6 px-2.5 rounded-full inline-flex items-center text-[11px] font-bold shrink-0",
                          m.id === chat.createdBy ? "bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line" : "bg-sunk text-ink")}>
                          {cap(role)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </Card>

            <List className="mt-2">
              {iOwn ? (
                <Row isRtl={isRtl} danger icon={well(Trash2, "alert")} title={isChannel ? t.deleteChannel : t.deleteGroup} onClick={onDeleteChat} />
              ) : (
                <Row isRtl={isRtl} danger icon={<IconWell tone="alert" size={36}><LogOut className="w-[18px] h-[18px] rtl:-scale-x-100" strokeWidth={2} /></IconWell>} title={isChannel ? t.leaveChannel : t.leaveGroup} onClick={onLeave} />
              )}
            </List>
          </>
        )}
      </div>
    </motion.div>
  );
}
