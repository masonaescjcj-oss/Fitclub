import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, Reorder, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, ChevronDown, Info, LayoutList, Plus, RotateCcw, Search, Settings2, Trophy, Users, X,
} from "lucide-react";
import { ME, itemDone, localized, progressOf } from "../../lib/checklistModel";
import { useChecklistT } from "../../lib/checklistI18n";
import { useChecklistStore } from "../../lib/checklistContext";
import { Button, Card, Chip, Empty, IconButton, Label, Screen, cx, num } from "../../components/ui/kit";
import { FlameIcon } from "../../components/ui/icons";
import { AvatarStack, ProgressRing, ResetCountdown, describeReset } from "../../components/checklist/ChecklistBits";
import ChecklistRow from "../../components/checklist/ChecklistRow";
import ListDrawer from "../../components/checklist/ListDrawer";
import ListEditorModal from "../../components/checklist/ListEditorModal";
import ItemDetailSheet from "../../components/checklist/ItemDetailSheet";
import HistoryStrip from "../../components/checklist/HistoryStrip";
import ActivityFeed from "../../components/checklist/ActivityFeed";

// The checklist sub-page, opened from Today's Checklist card: an ink hero
// with the ring and the streak, the active list's tasks as round-check rows,
// and the consistency heatmap. Other lists are one chip away.

/** The list editor as a sheet: undefined list = closed, null = a new list. */
const CLOSED = { list: undefined, open: false, n: 0 };

export default function ChecklistPage({ isRtl, onBack, onGoToStreak }) {
  const t = useChecklistT(isRtl);
  const n = (v) => num(v, isRtl);
  const store = useChecklistStore();
  const { lists, activeList: list } = store;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editor, setEditor] = useState(CLOSED);
  const [detail, setDetail] = useState({ id: null, open: false, n: 0 });
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [showDone, setShowDone] = useState(true);
  const [composer, setComposer] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const composerRef = useRef(null);
  const switcherRef = useRef(null);

  // Keep the active list's chip in view when the list changes from the drawer.
  const activeId = list?.id;
  useEffect(() => {
    const chip = switcherRef.current?.querySelector('[aria-current="true"]');
    chip?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [activeId]);

  const { open, done, hidden } = useMemo(() => {
    if (!list) return { open: [], done: [], hidden: 0 };
    const q = query.trim().toLowerCase();
    const match = (i) => !q || localized(i, isRtl, "text").toLowerCase().includes(q);
    const visible = list.items.filter(match);
    return {
      open: visible.filter((i) => !itemDone(i, list)),
      done: visible.filter((i) => itemDone(i, list)),
      hidden: list.items.length - visible.length,
    };
  }, [list, query, isRtl]);

  const openEditor = (target) => setEditor((e) => ({ list: target, open: true, n: e.n + 1 }));
  const closeEditor = () => setEditor((e) => ({ ...e, open: false }));

  const Back = isRtl ? ArrowRight : ArrowLeft;
  const backButton = onBack && (
    <IconButton label={t.back} onClick={onBack} tone="card">
      <Back className="w-5 h-5" strokeWidth={2} />
    </IconButton>
  );

  const editorSheet = editor.list !== undefined && (
    <ListEditorModal key={editor.n} open={editor.open}
      list={editor.list} isRtl={isRtl} t={t}
      onSave={(patch) => {
        if (editor.list) store.updateList(editor.list.id, patch);
        else store.addList(patch);
        closeEditor();
      }}
      onDelete={() => {
        if (window.confirm(t.deleteListConfirm)) {
          store.removeList(editor.list.id);
          closeEditor();
        }
      }}
      onClose={closeEditor}
    />
  );

  if (!list) {
    return (
      <Screen isRtl={isRtl}>
        <div className="flex items-center">{backButton}</div>
        <div className="flex flex-col gap-1.5 pt-3">
          <h1 className="m-0 font-display font-extrabold text-[38px] leading-[0.95] tracking-[-0.04em] text-ink">{t.title}</h1>
        </div>
        <Card className="mt-2">
          <Empty icon={<LayoutList className="w-6 h-6" strokeWidth={2} />} title={t.emptyTitle} body={t.noListsBody}
            action={<Button tone="ink" onClick={() => openEditor(null)} icon={<Plus className="w-4 h-4 text-accent dark:text-on-inv" strokeWidth={2.4} />}>{t.newList}</Button>} />
        </Card>
        {editorSheet}
      </Screen>
    );
  }

  const { done: doneCount, total, ratio } = progressOf(list);
  const isGroup = list.type === "group";
  const mode = list.reset?.mode || "none";
  const detailItem = detail.id ? list.items.find((i) => i.id === detail.id) || null : null;
  const allDone = total > 0 && doneCount === total;
  const left = total - doneCount;
  const eyebrow = `${isGroup ? t.group : t.personal}${t.sep}${mode === "none" ? t.noReset : describeReset(list, t)}`;

  const headline = total === 0 ? t.emptyTitle : allDone ? t.allDone : t.leftHeadline(left, mode, n);
  const subline = total === 0 ? t.emptySub
    : allDone ? t.allDoneSub
    : mode === "none" ? t.resetNoneHint
    : list.streak > 0 ? t.keepStreak(list.streak, mode, left, n)
    : t.noStreakYet;

  const submitComposer = () => {
    const text = composer.trim();
    if (!text) return;
    store.addItem(list.id, { text });
    setComposer("");
    composerRef.current?.focus();
  };

  const focusComposer = () => {
    setSearching(false);
    setQuery("");
    const el = composerRef.current;
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
  };

  /* Reorder gives back only the visible slice, so splice it into the full list. */
  const applyReorder = (nextOpen) => {
    const rest = list.items.filter((i) => !nextOpen.some((o) => o.id === i.id));
    store.reorderItems(list.id, [...nextOpen, ...rest]);
  };

  const openDetail = (id) => setDetail((d) => ({ id, open: true, n: d.n + 1 }));
  const closeDetail = () => setDetail((d) => ({ ...d, open: false }));

  const rowProps = (item) => ({
    item, list, isRtl, t,
    onToggle: () => store.toggleItem(list.id, item.id, ME.id),
    onOpen: () => openDetail(item.id),
  });

  return (
    <Screen isRtl={isRtl}>
      {/* ── Bar: back, search, list settings, New ─────────────────── */}
      <div className="flex items-center justify-between gap-2">
        {backButton || <span />}
        <div className="flex items-center gap-2">
          <IconButton label={t.search} tone={searching ? "inv" : "card"} aria-pressed={searching}
            onClick={() => { setSearching((v) => !v); setQuery(""); }}>
            <Search className="w-5 h-5" strokeWidth={2} />
          </IconButton>
          <IconButton label={t.editList} tone="card" onClick={() => openEditor(list)}>
            <Settings2 className="w-5 h-5" strokeWidth={2} />
          </IconButton>
          <Button tone="ink" className="h-11 ps-3 pe-4 text-sm" onClick={focusComposer} aria-label={t.newTaskHint}
            icon={<Plus className="w-[18px] h-[18px] text-accent dark:text-on-inv" strokeWidth={2.4} />}>
            {t.newItem}
          </Button>
        </div>
      </div>

      <header className="flex flex-col gap-1.5">
        <Label>{eyebrow}</Label>
        <h1 className="m-0 font-display font-extrabold text-[38px] leading-[0.95] tracking-[-0.04em] text-ink">{t.title}</h1>
      </header>

      {/* ── List switcher: every list one tap away, the drawer for the overview ── */}
      <nav ref={switcherRef} aria-label={t.switchList} className="-mx-5 px-5 flex gap-2 overflow-x-auto scrollbar-hide">
        <Chip onClick={() => setDrawerOpen(true)} className="h-11 shrink-0" aria-label={t.myLists}>
          <LayoutList className="w-4 h-4" strokeWidth={2} />{t.allLists}
        </Chip>
        {lists.map((l) => (
          <Chip key={l.id} active={l.id === list.id} className="h-11 shrink-0"
            onClick={() => store.setActiveList(l.id)} aria-current={l.id === list.id ? "true" : undefined}>
            {l.type === "group" && <Users className="w-4 h-4" strokeWidth={2} />}
            {localized(l, isRtl)}
          </Chip>
        ))}
      </nav>

      {/* ── Progress hero ─────────────────────────────────────────── */}
      <Card tone="hero" className="flex flex-col gap-4 !py-4" aria-label={t.progress}>
        <div className="flex items-center gap-4">
          <ProgressRing ratio={ratio} size={84} stroke={10} color="rgb(var(--ui-accent))" track="rgb(var(--ui-hero-2))">
            <span className="font-display font-extrabold text-[22px] leading-none tracking-[-0.02em]">{n(doneCount)}/{n(total)}</span>
          </ProgressRing>
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <span className="text-xl font-bold leading-tight tracking-[-0.01em]">{headline}</span>
            <span className="text-sm leading-[1.4] text-hero-muted">{subline}</span>
            {isGroup && (
              <span className="mt-1 flex items-center gap-2 text-[13px] text-hero-muted">
                <AvatarStack members={list.members} size={24} max={4} ring="ring-hero" />
                {n(list.members.length)} {t.memberCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-hero-fg/85">
          <button type="button" onClick={onGoToStreak}
            className="h-9 ps-2.5 pe-3.5 rounded-full bg-accent text-on-accent inline-flex items-center gap-1.5 text-sm font-bold border-0 cursor-pointer active:scale-[0.98] transition-transform">
            <FlameIcon size={16} />{t.streakCount(list.streak || 0, mode, n)}
          </button>
          <span className="inline-flex items-center gap-1.5">
            <Trophy className="w-4 h-4" strokeWidth={2} />{t.best} {n(list.bestStreak || 0)}
          </span>
          <ResetCountdown list={list} t={t} />
        </div>
      </Card>

      {/* ── Search ───────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {searching && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden -mb-1">
            <label className="h-[52px] rounded-2xl bg-card flex items-center gap-2.5 px-4 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ink">
              <Search className="w-[18px] h-[18px] text-muted shrink-0" strokeWidth={2} />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search}
                className="flex-1 min-w-0 h-full border-0 bg-transparent text-base text-ink !outline-none placeholder:text-muted/70" />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label={t.clear}
                  className="w-8 h-8 -me-2 rounded-full bg-sunk text-muted flex items-center justify-center border-0 cursor-pointer">
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              )}
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tasks ────────────────────────────────────────────────── */}
      <section aria-label={t.tasks} className="rounded-3xl bg-card px-4 py-1">
        {total > 0 && open.length === 0 && done.length === 0 && (
          <p className="m-0 py-4 text-sm text-muted">{t.noResults}</p>
        )}

        <Reorder.Group as="ul" axis="y" values={open} onReorder={applyReorder} className="m-0 p-0 list-none">
          <AnimatePresence initial={false}>
            {open.map((item) => <ChecklistRow key={item.id} {...rowProps(item)} />)}
          </AnimatePresence>
        </Reorder.Group>

        {/* Inline composer */}
        <div className={cx("group/composer flex items-center gap-2.5 min-h-[54px]", open.length > 0 && "border-t border-hair")}>
          <span aria-hidden="true" className="w-11 h-11 -ms-2 shrink-0 flex items-center justify-center">
            <span className="w-[26px] h-[26px] rounded-full bg-sunk text-muted flex items-center justify-center transition-colors group-focus-within/composer:bg-inv group-focus-within/composer:text-on-inv">
              <Plus className="w-4 h-4" strokeWidth={2.4} />
            </span>
          </span>
          <input ref={composerRef} value={composer} onChange={(e) => setComposer(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitComposer(); }}
            placeholder={t.addTask} aria-label={t.addTask}
            className="flex-1 min-w-0 h-11 border-0 bg-transparent text-[15px] text-ink !outline-none placeholder:text-muted" />
          {composer.trim() && (
            <Button tone="ink" size="sm" onClick={submitComposer} className="shrink-0">{t.add}</Button>
          )}
        </div>

        {/* Completed */}
        {done.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-3 border-t border-hair">
              <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}
                className="h-11 inline-flex items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer text-muted">
                <Label className="!text-[10px]">{t.completed}{t.sep}{n(done.length)}</Label>
                <ChevronDown className={cx("w-3.5 h-3.5 transition-transform", !showDone && (isRtl ? "rotate-90" : "-rotate-90"))} strokeWidth={2} />
              </button>
              {!isGroup && mode !== "none" && (
                <button type="button" onClick={() => { if (window.confirm(t.resetNowConfirm)) store.resetListNow(list.id); }}
                  className="h-11 -me-1 px-1 inline-flex items-center gap-1.5 bg-transparent border-0 cursor-pointer text-[13px] font-semibold text-ink">
                  <RotateCcw className="w-4 h-4" strokeWidth={2} />{t.resetNow}
                </button>
              )}
            </div>

            <AnimatePresence initial={false}>
              {showDone && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }} className="overflow-hidden">
                  <Reorder.Group as="ul" axis="y" values={done} onReorder={() => {}} className="m-0 p-0 list-none">
                    {done.map((item) => <ChecklistRow key={item.id} {...rowProps(item)} />)}
                  </Reorder.Group>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {hidden > 0 && query && (
          <p className="m-0 py-3 border-t border-hair text-[13px] text-muted">{t.hiddenBySearch(hidden, n)}</p>
        )}
      </section>

      {/* ── Consistency ─────────────────────────────────────────── */}
      {mode !== "none" && <HistoryStrip list={list} t={t} isRtl={isRtl} />}

      {isGroup && (
        <ActivityFeed list={list} isRtl={isRtl} t={t} open={feedOpen} onToggle={() => setFeedOpen((v) => !v)} />
      )}

      {/* Group lists are local-only for now: say so rather than implying sync. */}
      {isGroup && (
        <div className="px-1">
          <button type="button" onClick={() => setNoteOpen((v) => !v)} aria-expanded={noteOpen}
            className="min-h-[44px] inline-flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer text-[13px] font-medium text-muted">
            <Info className="w-4 h-4 shrink-0" strokeWidth={2} />{t.localOnlyTitle}
          </button>
          <AnimatePresence initial={false}>
            {noteOpen && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="m-0 overflow-hidden text-[13px] leading-relaxed text-muted ps-6">
                {t.localOnly}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Overlays ────────────────────────────────────────────── */}
      <ListDrawer open={drawerOpen} lists={lists} activeId={list.id} isRtl={isRtl} t={t}
        onPick={(id) => { store.setActiveList(id); setDrawerOpen(false); }}
        onCreate={() => { setDrawerOpen(false); openEditor(null); }}
        onClose={() => setDrawerOpen(false)} />

      {editorSheet}

      {detailItem && (
        <ItemDetailSheet key={detail.n} open={detail.open}
          item={detailItem} list={list} isRtl={isRtl} t={t}
          onSave={(patch) => { store.updateItem(list.id, detailItem.id, patch); closeDetail(); }}
          onDelete={() => { store.removeItem(list.id, detailItem.id); setDetail((d) => ({ ...d, id: null, open: false })); }}
          onClose={closeDetail}
        />
      )}
    </Screen>
  );
}
