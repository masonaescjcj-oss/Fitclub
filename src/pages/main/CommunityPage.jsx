import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useChatT } from "../../lib/chat/chatI18n";
import { useChatStore } from "../../lib/chat/chatContext";
import { STORIES_SHOWN, findUser } from "../../lib/chat/chatStore";
import { ME, makeInviteLink, relativeTime } from "../../lib/chat/chatModel";
import { resolveJoin } from "../../lib/chat/search";
import { localized } from "../../lib/checklistModel";
import ChatList from "../../components/chat/ChatList";
import ChatView from "../../components/chat/ChatView";
import ContactsScreen, { ContactSheet } from "../../components/chat/ContactsScreen";
import SettingsScreen from "../../components/chat/SettingsScreen";
import ProfileScreen from "../../components/chat/ProfileScreen";
import PeerProfileScreen from "../../components/chat/PeerProfileScreen";
import BuddyDiscoverScreen, { BuddyPrefsSheet, ChallengeSheet, CrewSheet, ReportSheet } from "../../components/chat/BuddyScreens";
import { ChatDetailsScreen, ChatTypeScreen, MemberActionsSheet, MemberPickerScreen, addablePeople } from "../../components/chat/CreateScreens";
import { useBuddyT } from "../../lib/buddy/buddyI18n";
import {
  botAnon, botChallenge, botChallengeDone, botCrewCreated, botFallback, botLeaderboard, botMatched, botMatches, botMenu,
  botNeedTeammates, botNoOne, botPrefsSaved, botProfile, botSession, botTaskAdded, challengeProgress, deriveMyProfile, findBuddy,
  leaderboard, likesBack, rankCandidates, suggestSession,
} from "../../lib/buddy/buddyModel";
import { useNutritionStore } from "../../lib/nutrition/nutritionContext";
import { useTrainingStore } from "../../lib/training/trainingContext";
import { useChecklistStore } from "../../lib/checklistContext";
import { Avatar, toneOf } from "../../components/chat/ChatBits";
import { ChatActionsSheet } from "../../components/chat/ChatSheets";
import { loadSession } from "../../lib/session";
import MessengerNav from "../../components/chat/MessengerNav";
import { cx, num } from "../../components/ui/kit";

/** Screens that show the app's tab bar and the section switch; the rest are pushed on top. */
const ROOT_SCREENS = ["list", "contacts", "settings"];

/**
 * Full-screen story viewer: one friend's story, auto-advancing through the
 * rail. The story sits on its author's avatar tone; tap the far side to go
 * on, the near side to go back.
 */
function StoryViewer({ stories, index, isRtl, t, onIndex, onClose }) {
  const story = stories[index];
  const user = findUser(story.userId);
  const tone = toneOf(user.name);
  const dark = tone === "bg-jet";
  useEffect(() => {
    const id = setTimeout(() => (index + 1 < stories.length ? onIndex(index + 1) : onClose()), 5000);
    return () => clearTimeout(id);
  }, [index, stories.length, onIndex, onClose]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const next = () => { if (index + 1 < stories.length) onIndex(index + 1); else onClose(); };
  const prev = () => { if (index > 0) onIndex(index - 1); };
  const tap = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const forward = isRtl ? x < 0.35 : x > 0.65;
    const back = isRtl ? x > 0.65 : x < 0.35;
    if (forward) next();
    else if (back) prev();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      role="dialog" aria-modal="true" aria-label={`${t.storyOf}: ${isRtl ? user.nameFa || user.name : user.name}`}
      dir={isRtl ? "rtl" : "ltr"} className="ui fixed inset-0 z-[95] flex items-center justify-center !bg-hero">
      <div onClick={tap}
        className={cx("relative w-full h-full md:max-w-lg md:h-[92dvh] md:rounded-4xl overflow-hidden select-none", tone,
          dark ? "text-hero-fg" : "text-on-accent")}>
        <div className="absolute top-[max(env(safe-area-inset-top),12px)] inset-x-4 flex gap-1 z-10">
          {stories.map((s, i) => (
            <span key={s.id} className={cx("flex-1 h-[3px] rounded-full overflow-hidden", dark ? "bg-hero-fg/25" : "bg-jet/20")}>
              {i === index && <motion.span key={story.id} className={cx("block h-full", dark ? "bg-hero-fg" : "bg-jet")}
                initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 5, ease: "linear" }} />}
              {i < index && <span className={cx("block h-full", dark ? "bg-hero-fg" : "bg-jet")} />}
            </span>
          ))}
        </div>
        <div className="absolute top-[calc(max(env(safe-area-inset-top),12px)+14px)] inset-x-4 flex items-center gap-3 z-10">
          {/* The avatar wears the story's own tone, so a ring lifts it off the page. */}
          <span className={cx("rounded-full ring-2", dark ? "ring-hero-fg/70" : "ring-jet/70")}>
            <Avatar user={user} size={40} showStatus={false} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold truncate">{isRtl ? user.nameFa || user.name : user.name}</span>
            <span className="block text-[12px] opacity-70">{num(relativeTime(story.at, t), isRtl)}</span>
          </span>
          <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label={t.close}
            className={cx("w-11 h-11 rounded-full border-0 flex items-center justify-center cursor-pointer active:scale-95 transition-transform",
              dark ? "bg-hero-2 text-hero-fg" : "bg-jet/10 text-on-accent")}>
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-7 px-8 text-center pointer-events-none">
          <span className={cx("w-44 h-44 rounded-full flex items-center justify-center", dark ? "bg-hero-2" : "bg-card/45")}>
            <span className="text-[96px] leading-none">{story.emoji}</span>
          </span>
          <p className="m-0 font-display font-extrabold text-[30px] leading-[1.1] tracking-[-0.03em] max-w-[320px]">
            {isRtl ? story.captionFa : story.captionEn}
          </p>
        </div>
        {/* Tap zones double as buttons for keyboards and screen readers. */}
        <button type="button" aria-label={t.storyPrev} onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute bottom-0 start-0 w-1/3 h-3/4 border-0 bg-transparent p-0 opacity-0 cursor-pointer" />
        <button type="button" aria-label={t.storyNext} onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute bottom-0 end-0 w-1/3 h-3/4 border-0 bg-transparent p-0 opacity-0 cursor-pointer" />
      </div>
    </motion.div>
  );
}

/** A short line above the tab bar, ink on paper (paper on ink at night). */
function Flash({ children }) {
  return (
    <div className="fixed bottom-28 inset-x-0 flex justify-center z-[96] pointer-events-none px-6">
      <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
        role="status" className="font-ui max-w-md min-h-10 px-4 py-2.5 rounded-3xl bg-inv text-on-inv text-sm font-semibold text-center leading-snug shadow-bar">
        {children}
      </motion.span>
    </div>
  );
}

/**
 * The messenger: chat list plus the Telegram-style shell around it. It is a
 * place of its own: the three root screens (chats, contacts, settings)
 * switch with the messenger's bottom bar, whose round button (`onExit`)
 * goes back to the app. A conversation or a pushed screen covers the bar.
 */
export default function CommunityPage({ isRtl, onExit, joinCode = null, onJoinHandled, openTarget = null, onOpenHandled }) {
  const chatT = useChatT(isRtl);
  const buddyT = useBuddyT(isRtl);
  const t = useMemo(() => ({ ...chatT, ...buddyT }), [chatT, buddyT]);
  const store = useChatStore();
  const nutrition = useNutritionStore();
  const training = useTrainingStore();
  const checklist = useChecklistStore();
  const { lists } = checklist;
  const [discover, setDiscover] = useState(false);
  const [crewOpen, setCrewOpen] = useState(false);
  const [challengeFor, setChallengeFor] = useState(null); // crew chat id awaiting a challenge
  const [reporting, setReporting] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  // Making a group or channel walks through a few pushed screens; this is where it stands.
  const [creating, setCreating] = useState(null); // { kind, step, draft }
  const [editing, setEditing] = useState(null);   // { chatId, screen: "details" | "type" }
  const [addingTo, setAddingTo] = useState(null); // chat id getting new members
  const [memberAction, setMemberAction] = useState(null); // member an admin tapped
  const [editingContact, setEditingContact] = useState(null); // an added person being edited
  const [jumpTo, setJumpTo] = useState(null); // message to land on when the chat opens
  const pending = useRef([]); // timers for teammates who answer later

  // The athlete's match card, rebuilt from live data whenever it changes.
  const myCard = useMemo(
    () => deriveMyProfile({ profile: nutrition.profile, sessions: training.sessions, lists, prefs: store.buddy.prefs }),
    [nutrition.profile, training.sessions, lists, store.buddy.prefs]
  );
  const ranked = useMemo(
    () => rankCandidates(myCard, { liked: store.buddy.liked, passed: [...store.buddy.passed, ...store.blocked], matched: store.buddy.matches.map((m) => m.buddyId) }),
    [myCard, store.buddy, store.blocked]
  );
  useEffect(() => () => pending.current.forEach(clearTimeout), []);
  const [menuChat, setMenuChat] = useState(null);
  const [toast, setToast] = useState("");
  const [story, setStory] = useState(null); // { list, index }
  const [profileOpen, setProfileOpen] = useState(false); // who you're talking to, over the chat
  const [searching, setSearching] = useState(false);

  const name = loadSession().name || "Isaac";
  const open = store.openedChat;
  const openPeer = open && open.type === "private" && open.id !== "saved"
    ? findUser(open.members.find((m) => m !== ME))
    : null;

  // Leaving a conversation drops whatever was stacked on it.
  useEffect(() => { setProfileOpen(false); setSearching(false); }, [open?.id]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (story) store.markStorySeen(story.list[story.index].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.index]);

  const toggleLanguage = () => {
    const next = (localStorage.getItem("language") || "en") === "fa" ? "en" : "fa";
    localStorage.setItem("language", next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === "fa" ? "rtl" : "ltr";
    store.bump(); // MainAppShell re-reads the language on the next render
  };

  const openStory = (s) => {
    // Play the rail from the tapped story onwards, in the order it is shown.
    const seen = new Set(store.seenStories || []);
    const list = [...STORIES_SHOWN].sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)));
    setStory({ list, index: Math.max(list.findIndex((x) => x.id === s.id), 0) });
  };

  const matchWith = (c, score) => {
    const chatId = store.buddyMatch(c.id, score, isRtl);
    store.botPost(botMatched(c, score, chatId, isRtl));
    return chatId;
  };

  /** Like from the card: an instant match, a later one, or nothing back. */
  const like = (c, score) => {
    const answer = likesBack(c.id, score);
    if (answer.match && answer.delayMs === 0) return { chatId: matchWith(c, score) };
    store.buddyLike(c.id);
    if (answer.match) pending.current.push(setTimeout(() => matchWith(c, score), answer.delayMs));
    setToast(t.sent);
    return null;
  };

  /** Rows for a crew, or for me plus every teammate when there is no crew yet. */
  const rowsFor = (memberIds) => leaderboard(memberIds, { mySessions: training.sessions, myStreak: myCard.streak, isRtl });
  const crewMembers = (chat) => (chat?.members || []).filter((id) => id !== ME).map((id) => findBuddy(id)).filter(Boolean);

  const progressOf = (chat) => (chat?.challenge ? challengeProgress(chat, chat.challenge, { mySessions: training.sessions, myStreak: myCard.streak }) : null);
  const postProgress = (chat) => {
    const p = progressOf(chat);
    if (!p) return;
    store.botPost(botChallenge(p, chat.id), chat.id);
    if (p.done) store.botPost(botChallengeDone(), chat.id);
  };

  const botAction = (id, fromChatId = null) => {
    if (id.startsWith("open:")) { store.openChat(id.slice(5)); return; }
    const target = (raw) => (raw === "self" ? fromChatId : raw);
    if (id.startsWith("challenge:")) { const chatId = target(id.slice(10)); if (chatId) setChallengeFor(chatId); return; }
    if (id.startsWith("progress:")) { postProgress(store.chats.find((c) => c.id === target(id.slice(9)))); return; }
    if (id.startsWith("leaderboard:")) {
      const chatId = target(id.slice(12));
      const chat = store.chats.find((c) => c.id === chatId);
      if (chat) store.botPost(botLeaderboard(rowsFor(chat.members), chatId, isRtl), chatId);
      return;
    }
    if (id.startsWith("session:") || id.startsWith("session2:")) {
      const alt = id.startsWith("session2:");
      const chatId = target(id.slice(alt ? 9 : 8));
      const chat = store.chats.find((c) => c.id === chatId);
      if (chat) store.botPost(botSession(suggestSession(myCard.time, crewMembers(chat), { alt }), chatId, isRtl), chatId);
      return;
    }
    if (id.startsWith("addtask:")) {
      const [, chatId, iso] = id.split(":").length > 3 ? [null, id.split(":")[1], id.split(":").slice(2).join(":")] : id.split(":");
      const chat = store.chats.find((c) => c.id === chatId);
      const list = checklist.activeList;
      if (list) {
        const when = new Date(iso);
        const label = when.toLocaleString(isRtl ? "fa-IR" : undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
        checklist.addItem(list.id, { text: `${isRtl ? "جلسه‌ی کرو" : "Crew session"} · ${chat?.title || ""} · ${label}`, priority: "high", due: iso.slice(0, 10) });
        store.botPost(botTaskAdded(localized(list, isRtl)), chatId);
        setToast(t.sessionAdded);
      }
      return;
    }
    switch (id) {
      case "find": setDiscover(true); break;
      case "anon": {
        const best = ranked.find((r) => r.score >= 40);
        if (!best) { store.botPost(botNoOne()); break; }
        const chatId = store.buddyMatch(best.candidate.id, best.score, isRtl);
        store.botPost(botAnon(best.candidate, best.score, chatId));
        store.openChat(chatId);
        break;
      }
      case "matches": store.botPost(botMatches(store.buddy.matches, isRtl)); break;
      case "crew:new": if (store.buddy.matches.length) setCrewOpen(true); else store.botPost(botNeedTeammates()); break;
      case "leaderboard": {
        const ids = [ME, ...store.buddy.matches.map((m) => m.buddyId)];
        store.botPost(ids.length > 1 ? botLeaderboard(rowsFor(ids), null, isRtl) : botNeedTeammates());
        break;
      }
      case "profile": store.botPost(botProfile(myCard)); break;
      case "prefs": setPrefsOpen(true); break;
      case "menu": store.botPost(botMenu()); break;
      default: store.botPost(botFallback());
    }
  };

  // The other side "agrees" to reveal a moment after you ask — a stand-in for a real reply.
  const requestReveal = (chatId) => {
    store.buddyRequestReveal(chatId);
    pending.current.push(setTimeout(() => store.buddyReveal(chatId), 2500));
  };

  // Someone opened an invite link: open it if it's ours, join it if it's public, or say it leads nowhere.
  const handledJoin = useRef(null);
  useEffect(() => {
    if (!joinCode || handledJoin.current === joinCode) return;
    handledJoin.current = joinCode;
    const hit = resolveJoin(joinCode, { chats: store.chats, directory: store.directory, people: addablePeople(store) });
    const act = (h) => {
      if (h.chat && h.joined) store.openChat(h.chat.id);
      else if (h.chat) { store.joinChat(h.chat); setToast(t.joinedToast(isRtl ? h.chat.titleFa || h.chat.title : h.chat.title)); }
      else if (h.user) store.openOrCreatePrivateChat(h.user);
      else setToast(t.joinNotFound);
    };
    if (hit.chat || hit.user || !store.online) act(hit);
    else store.resolveRemote(joinCode).then(act).catch(() => setToast(t.joinNotFound));
    onJoinHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode]);

  // The notifications centre (or the @ badge) asked for a chat at a specific message.
  const openAt = (chatId, messageId) => { setJumpTo(messageId || null); store.openChat(chatId); store.setScreen("list"); };
  useEffect(() => {
    if (!openTarget) return;
    openAt(openTarget.chatId, openTarget.messageId);
    onOpenHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTarget]);

  /** A tapped @handle: the person's chat when we know them, otherwise the community by that name. */
  const openMention = (username) => {
    const hit = resolveJoin(username, { chats: store.chats, directory: store.directory, people: [...addablePeople(store), { ...findUser(ME), username: store.me.username }] });
    if (hit.user && hit.user.id === ME) { store.closeChat(); store.setScreen("profile"); return; }
    if (hit.user) { store.openOrCreatePrivateChat(hit.user); return; }
    if (hit.chat && hit.joined) { store.openChat(hit.chat.id); return; }
    if (hit.chat) { store.joinChat(hit.chat); return; }
    if (store.online) {
      store.resolveRemote(username).then((h) => {
        if (h.user) store.openOrCreatePrivateChat(h.user);
        else if (h.chat && h.joined) store.openChat(h.chat.id);
        else if (h.chat) store.joinChat(h.chat);
        else setToast(t.noSearchResults);
      }).catch(() => setToast(t.noSearchResults));
      return;
    }
    setToast(t.noSearchResults);
  };

  /* ── groups & channels ── */
  const startGroup = () => setCreating({ kind: "group", step: "members", draft: { memberIds: [] } });
  const startChannel = () => setCreating({ kind: "channel", step: "details", draft: { inviteLink: makeInviteLink(), isPublic: false, username: "" } });
  const finishCreate = (draft) => {
    const result = draft.kind === "channel" ? store.createChannel(draft) : store.createGroup(draft);
    setCreating(null);
    store.setScreen("list");
    if (result && result.remote) {
      result.promise.then((chatId) => store.openChat(chatId)).catch((e) => setToast(e.code === "username_taken" ? t.linkTaken : `${t.connectFailed} ${e.message || ""}`));
      return;
    }
    store.openChat(result);
  };
  const advance = (patch) => {
    const next = { ...creating, draft: { ...creating.draft, ...patch } };
    if (next.kind === "group") {
      if (next.step === "members") { setCreating({ ...next, step: "details" }); return; }
      finishCreate({ kind: "group", ...next.draft });
      return;
    }
    if (next.step === "details") { setCreating({ ...next, step: "type" }); return; }
    if (next.step === "type") { setCreating({ ...next, step: "members" }); return; }
    finishCreate({ kind: "channel", ...next.draft });
  };
  const retreat = () => {
    if (!creating) return;
    const order = creating.kind === "group" ? ["members", "details"] : ["details", "type", "members"];
    const i = order.indexOf(creating.step);
    if (i <= 0) setCreating(null); else setCreating({ ...creating, step: order[i - 1] });
  };
  const editingChat = editing ? store.chats.find((c) => c.id === editing.chatId) : null;
  const leaveOrDelete = (chat, own) => {
    if (!window.confirm(own ? t.deleteOwnedConfirm : t.leaveConfirm)) return;
    setProfileOpen(false);
    if (own) store.deleteChat(chat.id); else store.leaveChat(chat.id);
    store.closeChat();
  };

  const screenView = () => {
    switch (store.screen) {
      case "contacts":
        return <ContactsScreen store={store} isRtl={isRtl} t={t} onToast={setToast}
          onNewGroup={startGroup} onNewChannel={startChannel} />;
      case "settings":
        return <SettingsScreen store={store} name={name} isRtl={isRtl} t={t}
          onGoProfile={() => store.setScreen("profile")}
          onToast={setToast} onToggleLanguage={toggleLanguage} />;
      case "profile":
        return <ProfileScreen store={store} name={name} isRtl={isRtl} t={t}
          onBack={() => store.setScreen("settings")}
          onGoSettings={() => store.setScreen("settings")}
          onToast={setToast}
          onOpenChannel={() => { store.openChat("news"); store.setScreen("list"); }} />;
      default:
        return <ChatList store={store} isRtl={isRtl} t={t}
          onOpen={store.openChat}
          onOpenAt={openAt}
          onMenu={setMenuChat}
          onCompose={() => store.setScreen("contacts")}
          onOpenStory={openStory}
          people={addablePeople(store)}
          onOpenUser={(u) => store.openOrCreatePrivateChat(u)}
          onJoin={(c) => { store.joinChat(c); setToast(t.joinedToast(isRtl ? c.titleFa || c.title : c.title)); }} />;
    }
  };

  return (
    <div className="ui w-full min-h-[100dvh]" dir={isRtl ? "rtl" : "ltr"}>
      <AnimatePresence mode="wait">
        <motion.div key={open ? `chat-${open.id}` : store.screen}
          initial={{ opacity: 0, x: isRtl ? -16 : 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRtl ? -16 : 16 }}
          transition={{ duration: 0.15 }}>
          {open
            ? <ChatView store={store} chat={open} isRtl={isRtl} t={t} onBack={store.closeChat}
                onOpenProfile={() => setProfileOpen(true)}
                searching={searching} onSearchClose={() => setSearching(false)}
                onBotAction={(id) => botAction(id, open.id)}
                blocked={!!openPeer && store.blocked.includes(openPeer.id)}
                onUnblock={() => { store.unblockUser(openPeer.id); setToast(t.unblocked); }}
                onMention={openMention}
                jumpTo={jumpTo} onJumped={() => setJumpTo(null)} />
            : screenView()}
        </motion.div>
      </AnimatePresence>

      {!open && ROOT_SCREENS.includes(store.screen) && (
        <MessengerNav screen={store.screen} onScreen={store.setScreen} onBack={() => onExit?.()}
          unread={store.unreadTotal} isRtl={isRtl} t={t} />
      )}

      <AnimatePresence>
        {open && profileOpen && (
          <PeerProfileScreen store={store} chat={open} user={openPeer} isRtl={isRtl} t={t}
            onBack={() => setProfileOpen(false)}
            onToast={setToast}
            onSearch={() => { setProfileOpen(false); setSearching(true); }}
            onMore={() => setMenuChat(open)}
            onRequestReveal={() => requestReveal(open.id)}
            leaderboardRows={open.crew ? rowsFor(open.members) : null}
            challenge={progressOf(open)}
            blocked={!!openPeer && store.blocked.includes(openPeer.id)}
            onReport={() => setReporting(true)}
            onBlock={() => {
              const name = isRtl ? openPeer.nameFa || openPeer.name : openPeer.name;
              if (window.confirm(t.blockConfirm(name))) { store.blockUser(openPeer.id); setProfileOpen(false); }
            }}
            onUnblock={() => { store.unblockUser(openPeer.id); setToast(t.unblocked); }}
            onOpenChat={(id) => { setProfileOpen(false); if (id && id !== open.id) store.openChat(id); }}
            onEditInfo={() => setEditing({ chatId: open.id, screen: "details" })}
            onOpenSettings={() => setEditing({ chatId: open.id, screen: "type" })}
            onAddMembers={() => setAddingTo(open.id)}
            onMemberAction={setMemberAction}
            onLeave={() => leaveOrDelete(open, false)}
            onDeleteChat={() => leaveOrDelete(open, true)}
            onEditContact={() => setEditingContact(openPeer)}
            onDeleteContact={() => {
              const who = isRtl ? openPeer.nameFa || openPeer.name : openPeer.name;
              if (!window.confirm(t.deleteContactConfirm(who))) return;
              setProfileOpen(false);
              store.deleteContact(openPeer.id);
              setToast(t.contactDeleted);
            }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingContact && (
          <ContactSheet store={store} initial={editingContact} isRtl={isRtl} t={t}
            onSave={(patch) => { store.updateContact(editingContact.id, patch); setEditingContact(null); setToast(t.chatInfoSaved); }}
            onClose={() => setEditingContact(null)} />
        )}
      </AnimatePresence>

      {/* ── making a group or channel ── */}
      <AnimatePresence>
        {creating && creating.step === "members" && (
          <MemberPickerScreen key={`${creating.kind}-members`} store={store} isRtl={isRtl} t={t}
            title={creating.kind === "channel" ? t.addSubscribers : t.newGroup}
            placeholder={creating.kind === "channel" ? t.addPeopleChannelPh : t.addPeoplePh}
            initial={creating.draft.memberIds || []}
            doneIcon={creating.kind === "channel" ? Check : undefined} doneLabel={creating.kind === "channel" ? t.create : t.next}
            onBack={retreat} onDone={(memberIds) => advance({ memberIds })} />
        )}
        {creating && creating.step === "details" && (
          <ChatDetailsScreen key={`${creating.kind}-details`} kind={creating.kind} initial={creating.draft} isRtl={isRtl} t={t}
            title={creating.kind === "channel" ? t.newChannel : t.newGroup}
            nextIcon={creating.kind === "group" ? Check : undefined} nextLabel={creating.kind === "group" ? t.create : t.next}
            onBack={retreat} onNext={advance} />
        )}
        {creating && creating.step === "type" && (
          <ChatTypeScreen key="channel-type" kind="channel" draft={creating.draft} chats={store.chats} isRtl={isRtl} t={t}
            onBack={retreat} onDone={advance} onToast={setToast} />
        )}
      </AnimatePresence>

      {/* ── running one: edit info, change type / link, add people ── */}
      <AnimatePresence>
        {editingChat && editing.screen === "details" && (
          <ChatDetailsScreen key="edit-details" kind={editingChat.type} initial={editingChat} isRtl={isRtl} t={t}
            title={t.edit} nextIcon={Check} nextLabel={t.saveChanges}
            onBack={() => setEditing(null)}
            onNext={(patch) => { store.updateChatInfo(editingChat.id, patch); setEditing(null); setToast(t.chatInfoSaved); }} />
        )}
        {editingChat && editing.screen === "type" && (
          <ChatTypeScreen key="edit-type" kind={editingChat.type} draft={editingChat} chats={store.chats} selfId={editingChat.id} isRtl={isRtl} t={t}
            nextIcon={Check} nextLabel={t.saveChanges}
            onBack={() => setEditing(null)} onToast={setToast}
            onRevoke={() => { store.regenerateInviteLink(editingChat.id); setToast(t.linkRevoked); }}
            onDone={(patch) => { store.updateChatInfo(editingChat.id, patch); setEditing(null); setToast(t.chatInfoSaved); }} />
        )}
        {addingTo && open && (
          <MemberPickerScreen key="add-members" store={store} isRtl={isRtl} t={t}
            title={open.type === "channel" ? t.addSubscribers : t.addMembers}
            placeholder={open.type === "channel" ? t.addPeopleChannelPh : t.addPeoplePh}
            exclude={open.members} allowEmpty={false} doneIcon={Check} doneLabel={t.done}
            onBack={() => setAddingTo(null)}
            onDone={(ids) => { store.addMembers(open.id, ids); setAddingTo(null); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {memberAction && open && (
          <MemberActionsSheet user={memberAction} chat={open} isRtl={isRtl} t={t}
            onToggleAdmin={() => { store.toggleAdmin(open.id, memberAction.id); setMemberAction(null); }}
            onRemove={() => { store.removeMember(open.id, memberAction.id); setMemberAction(null); }}
            onClose={() => setMemberAction(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {discover && (
          <BuddyDiscoverScreen ranked={ranked} me={myCard} isRtl={isRtl} t={t}
            onLike={like} onPass={(c) => store.buddyPass(c.id)}
            onOpenPrefs={() => setPrefsOpen(true)}
            onOpenChat={(chatId) => { setDiscover(false); store.openChat(chatId); }}
            onClose={() => setDiscover(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {crewOpen && (
          <CrewSheet matches={store.buddy.matches} isRtl={isRtl} t={t}
            onCreate={({ name, memberIds }) => {
              const chatId = store.createCrew({ name, memberIds });
              store.botPost(botCrewCreated(name, memberIds.length), chatId);
              store.botPost(botLeaderboard(rowsFor([ME, ...memberIds]), chatId, isRtl), chatId);
              setCrewOpen(false);
              store.openChat(chatId);
            }}
            onClose={() => setCrewOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {challengeFor && (
          <ChallengeSheet isRtl={isRtl} t={t}
            onStart={(challenge) => {
              const chat = store.chats.find((c) => c.id === challengeFor);
              const full = { ...challenge, createdAt: new Date().toISOString() };
              store.setChallenge(challengeFor, full);
              if (chat) postProgress({ ...chat, challenge: full });
              setChallengeFor(null);
            }}
            onClose={() => setChallengeFor(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reporting && openPeer && (
          <ReportSheet name={isRtl ? openPeer.nameFa || openPeer.name : openPeer.name} isRtl={isRtl} t={t}
            onSend={() => { setReporting(false); setToast(t.reportSent); }}
            onClose={() => setReporting(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {prefsOpen && (
          <BuddyPrefsSheet prefs={store.buddy.prefs} isRtl={isRtl} t={t}
            onSave={(p) => { store.buddySetPrefs(p); setPrefsOpen(false); if (!discover) store.botPost(botPrefsSaved()); }}
            onClose={() => setPrefsOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {story && (
          <StoryViewer stories={story.list} index={story.index} isRtl={isRtl} t={t}
            onIndex={(i) => setStory((s) => ({ ...s, index: i }))} onClose={() => setStory(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuChat && (
          <ChatActionsSheet chat={menuChat} isRtl={isRtl} t={t}
            onPin={() => { store.togglePinned(menuChat.id); setMenuChat(null); }}
            onMute={() => { store.toggleMuted(menuChat.id); setMenuChat(null); }}
            onArchive={() => { store.toggleArchived(menuChat.id); setMenuChat(null); }}
            onRead={() => { store.markRead(menuChat.id); setMenuChat(null); }}
            onDelete={() => {
              if (window.confirm(t.deleteChatConfirm)) store.deleteChat(menuChat.id);
              setMenuChat(null);
            }}
            onClose={() => setMenuChat(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Flash key={toast}>{toast}</Flash>}
      </AnimatePresence>
    </div>
  );
}
