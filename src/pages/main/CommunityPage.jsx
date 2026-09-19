import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, MessageCircle, Settings, UserCircle2, X } from "lucide-react";
import { useChatT } from "../../lib/chat/chatI18n";
import { useChatStore } from "../../lib/chat/chatContext";
import { STORIES, findUser } from "../../lib/chat/chatStore";
import { TG } from "../../lib/chat/extras";
import { ME, relativeTime } from "../../lib/chat/chatModel";
import { localized } from "../../lib/checklistModel";
import ChatList from "../../components/chat/ChatList";
import ChatView from "../../components/chat/ChatView";
import ContactsScreen from "../../components/chat/ContactsScreen";
import CallsScreen from "../../components/chat/CallsScreen";
import SettingsScreen from "../../components/chat/SettingsScreen";
import ProfileScreen from "../../components/chat/ProfileScreen";
import PeerProfileScreen from "../../components/chat/PeerProfileScreen";
import BuddyDiscoverScreen, { BuddyPrefsSheet, CrewSheet } from "../../components/chat/BuddyScreens";
import { useBuddyT } from "../../lib/buddy/buddyI18n";
import {
  botAnon, botCrewCreated, botFallback, botLeaderboard, botMatched, botMatches, botMenu, botNeedTeammates, botNoOne,
  botPrefsSaved, botProfile, botSession, botTaskAdded, deriveMyProfile, findBuddy, leaderboard, likesBack, rankCandidates,
  suggestSession,
} from "../../lib/buddy/buddyModel";
import { useNutritionStore } from "../../lib/nutrition/nutritionContext";
import { useTrainingStore } from "../../lib/training/trainingContext";
import { useChecklistStore } from "../../lib/checklistContext";
import { Avatar } from "../../components/chat/ChatBits";
import { ChatActionsSheet } from "../../components/chat/ChatSheets";
import { loadSession } from "../../lib/session";

/** Screens that show the messenger's own tab bar; the rest are pushed on top. */
const ROOT_SCREENS = ["list", "contacts", "settings"];

/**
 * The floating pill the iOS client uses: Contacts · Chats · Settings, plus a
 * detached Back button beside it that leaves the messenger for the rest of
 * FitClub — the app's own tab bar is hidden while the messenger is open.
 */
function TabBar({ screen, unread, isRtl, t, onGo, onExit }) {
  const tabs = [
    { id: "contacts", icon: UserCircle2, label: t.contactsTab },
    { id: "list", icon: MessageCircle, label: t.chats },
    { id: "settings", icon: Settings, label: t.settingsTab },
  ];
  const shadow = `0 8px 28px rgba(0,0,0,.14), 0 0 0 0.5px ${TG.sep}`;
  return (
    <div className="fixed inset-x-0 z-40 flex justify-center items-center gap-2.5 pointer-events-none"
      style={{ bottom: "max(14px, env(safe-area-inset-bottom))" }}>
      <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-full backdrop-blur-2xl"
        style={{ background: TG.pill, boxShadow: shadow }}>
        {tabs.map((tab) => {
          const active = screen === tab.id;
          const Icon = tab.icon;
          return (
            <button key={tab.id} type="button" onClick={() => onGo(tab.id)} aria-label={tab.label} aria-current={active ? "page" : undefined}
              className="relative flex flex-col items-center justify-center w-[80px] h-[54px] rounded-full transition-colors"
              style={{ background: active ? TG.pillActive : "transparent", color: active ? TG.accent : TG.muted }}>
              <Icon className="w-[26px] h-[26px]" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.2 : 0} />
              <span className="text-[10px] font-semibold mt-0.5">{tab.label}</span>
              {tab.id === "list" && unread > 0 && !active && (
                <span className="absolute top-1.5 end-6 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold text-white flex items-center justify-center on-accent"
                  style={{ background: TG.accentDeep }}>
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onExit} aria-label={t.backToApp}
        className="pointer-events-auto flex flex-col items-center justify-center w-[66px] h-[66px] rounded-full backdrop-blur-2xl active:scale-95 transition-transform"
        style={{ background: TG.pill, boxShadow: shadow, color: TG.muted }}>
        <ArrowLeft className={`w-[24px] h-[24px] ${isRtl ? "rotate-180" : ""}`} />
        <span className="text-[10px] font-semibold mt-0.5">{t.backToApp}</span>
      </button>
    </div>
  );
}

/** Full-screen story viewer: one friend's story, auto-advancing through the rail. */
function StoryViewer({ stories, index, isRtl, t, onIndex, onClose }) {
  const story = stories[index];
  const user = findUser(story.userId);
  useEffect(() => {
    const id = setTimeout(() => (index + 1 < stories.length ? onIndex(index + 1) : onClose()), 5000);
    return () => clearTimeout(id);
  }, [index, stories.length, onIndex, onClose]);

  const tap = (e) => {
    const x = e.nativeEvent.offsetX / e.currentTarget.clientWidth;
    const forward = isRtl ? x < 0.35 : x > 0.65;
    const back = isRtl ? x > 0.65 : x < 0.35;
    if (forward) { if (index + 1 < stories.length) onIndex(index + 1); else onClose(); }
    else if (back && index > 0) onIndex(index - 1);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black on-accent">
      <div className="relative w-full h-full md:max-w-lg md:h-[92dvh] md:rounded-3xl overflow-hidden text-white" style={{ background: story.bg }} onClick={tap}>
        <div className="absolute top-3 inset-x-3 flex gap-1 z-10">
          {stories.map((s, i) => (
            <span key={s.id} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
              {i === index && <motion.span key={story.id} className="block h-full bg-white" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 5, ease: "linear" }} />}
              {i < index && <span className="block h-full bg-white" />}
            </span>
          ))}
        </div>
        <div className="absolute top-7 inset-x-3 flex items-center gap-2.5 z-10">
          <Avatar user={user} size={36} showStatus={false} ring="transparent" />
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold text-white truncate">{isRtl ? user.nameFa || user.name : user.name}</span>
            <span className="block text-[12px] text-white/70">{relativeTime(story.at, t)}</span>
          </span>
          <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label={t.close}
            className="w-9 h-9 rounded-full bg-black/25 flex items-center justify-center text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 text-center pointer-events-none">
          <span className="text-[112px] leading-none drop-shadow-2xl">{story.emoji}</span>
          <p className="text-2xl font-bold text-white leading-snug">{isRtl ? story.captionFa : story.captionEn}</p>
        </div>
      </div>
    </motion.div>
  );
}

/** The messenger: chat list plus the Telegram-style shell around it. */
export default function CommunityPage({ isRtl, onExit }) {
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
  const [prefsOpen, setPrefsOpen] = useState(false);
  const pending = useRef([]); // timers for teammates who answer later

  // The athlete's match card, rebuilt from live data whenever it changes.
  const myCard = useMemo(
    () => deriveMyProfile({ profile: nutrition.profile, sessions: training.sessions, lists, prefs: store.buddy.prefs }),
    [nutrition.profile, training.sessions, lists, store.buddy.prefs]
  );
  const ranked = useMemo(
    () => rankCandidates(myCard, { liked: store.buddy.liked, passed: store.buddy.passed, matched: store.buddy.matches.map((m) => m.buddyId) }),
    [myCard, store.buddy]
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
    const list = [...STORIES].sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)));
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

  const botAction = (id, fromChatId = null) => {
    if (id.startsWith("open:")) { store.openChat(id.slice(5)); return; }
    const target = (raw) => (raw === "self" ? fromChatId : raw);
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

  const screenView = () => {
    switch (store.screen) {
      case "contacts":
        return <ContactsScreen store={store} isRtl={isRtl} t={t}
          onBack={() => store.setScreen("list")} onGoCalls={() => store.setScreen("calls")} />;
      case "calls":
        return <CallsScreen isRtl={isRtl} t={t}
          onBack={() => store.setScreen("list")} onToast={setToast} />;
      case "settings":
        return <SettingsScreen store={store} name={name} isRtl={isRtl} t={t}
          onBack={() => store.setScreen("list")}
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
          onMenu={setMenuChat}
          onCompose={() => store.setScreen("contacts")}
          onOpenStory={openStory}
          onAddStory={() => setToast(t.storiesSoon)} />;
    }
  };

  return (
    <div className="w-full" dir={isRtl ? "rtl" : "ltr"}>
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
                onBotAction={(id) => botAction(id, open.id)} />
            : screenView()}
        </motion.div>
      </AnimatePresence>

      {!open && ROOT_SCREENS.includes(store.screen) && (
        <TabBar screen={store.screen} unread={store.unreadTotal} isRtl={isRtl} t={t} onGo={(s) => store.setScreen(s)} onExit={onExit} />
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
            onOpenChat={(id) => { setProfileOpen(false); if (id && id !== open.id) store.openChat(id); }} />
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

      {toast && (
        <div className="fixed bottom-24 inset-x-0 flex justify-center z-[80] pointer-events-none">
          <span className="px-4 py-2 rounded-full bg-neutral-900/90 backdrop-blur text-xs font-bold text-white max-w-[85%] text-center">
            {toast}
          </span>
        </div>
      )}
    </div>
  );
}
