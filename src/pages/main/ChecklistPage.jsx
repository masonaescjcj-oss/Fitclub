import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, Reorder, motion } from "framer-motion";
import {
  ChevronDown, Flame, Info, Plus, RotateCcw, Search,
  Settings2, Trophy, Users, X,
} from "lucide-react";
import { ME, itemDone, localized, progressOf } from "../../lib/checklistModel";
import { useChecklistT } from "../../lib/checklistI18n";
import useChecklists from "../../hooks/useChecklists";
import { AvatarStack, ProgressRing, ResetCountdown, describeReset } from "../../components/checklist/ChecklistBits";
import ChecklistRow from "../../components/checklist/ChecklistRow";
import ListDrawer from "../../components/checklist/ListDrawer";
import ListEditorModal from "../../components/checklist/ListEditorModal";
import ItemDetailSheet from "../../components/checklist/ItemDetailSheet";

export default function ChecklistPage({ isRtl, onGoToStreak }) {
  const t = useChecklistT(isRtl);
  const store = useChecklists();
  const { lists, activeList: list } = store;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editorList, setEditorList] = useState(undefined); // undefined = closed, null = new
  const [detailId, setDetailId] = useState(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [showDone, setShowDone] = useState(true);
  const [composer, setComposer] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const composerRef = useRef(null);

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

  if (!list) {
    return (
      <div className="w-full min-h-[100dvh] bg-black text-white px-4 pt-20 flex flex-col items-center gap-4">
        <p className="text-sm font-bold text-neutral-500">{t.emptyTitle}</p>
        <button type="button" onClick={() => setEditorList(null)}
          className="px-5 h-11 rounded-2xl bg-[#844783] text-white font-black text-xs">
          {t.newList}
        </button>
        <AnimatePresence>
          {editorList !== undefined && (
            <ListEditorModal list={null} isRtl={isRtl} t={t}
              onSave={(patch) => { store.addList(patch); setEditorList(undefined); }}
              onClose={() => setEditorList(undefined)} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  const { done: doneCount, total, ratio } = progressOf(list);
  const isGroup = list.type === "group";
  const detailItem = list.items.find((i) => i.id === detailId) || null;
  const allDone = total > 0 && doneCount === total;

  const submitComposer = () => {
    const text = composer.trim();
    if (!text) return;
    store.addItem(list.id, { text });
    setComposer("");
    composerRef.current?.focus();
  };

  /* Reorder gives back only the visible slice, so splice it into the full list. */
  const applyReorder = (nextOpen) => {
    const rest = list.items.filter((i) => !nextOpen.some((n) => n.id === i.id));
    store.reorderItems(list.id, [...nextOpen, ...rest]);
  };

  return (
    <div className="w-full min-h-[100dvh] bg-black text-white pb-28">
      {/* ── List header ─────────────────────────────────────────── */}
      <div
        className="px-4 pt-6 pb-5 space-y-4"
        style={{ background: `linear-gradient(180deg, ${list.color}1f 0%, rgba(0,0,0,0) 100%)` }}
      >
        <div className="flex items-start justify-between gap-3">
          <button type="button" onClick={() => setDrawerOpen(true)} className="flex items-center gap-3 min-w-0 text-start group">
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: `${list.color}22`, border: `1px solid ${list.color}55` }}>
              {list.emoji}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="text-xl font-black text-white truncate">{localized(list, isRtl)}</span>
                <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0 group-hover:text-white transition-colors" />
              </span>
              <span className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 mt-0.5">
                <span className="inline-flex items-center gap-1">
                  {isGroup ? <Users className="w-3 h-3" /> : null}
                  {describeReset(list, t)}
                </span>
                <ResetCountdown list={list} t={t} />
              </span>
            </span>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={() => { setSearching((v) => !v); setQuery(""); }}
              aria-label={t.search}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                searching ? "bg-white/10 border-white/30 text-white" : "bg-[#141416] border-white/10 text-neutral-400 hover:text-white"
              }`}>
              <Search className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setEditorList(list)} aria-label={t.editList}
              className="w-9 h-9 rounded-xl bg-[#141416] border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-3 p-3 rounded-3xl bg-[#141416]/80 border border-white/10 backdrop-blur">
          <ProgressRing ratio={ratio} color={list.color}>
            <span className="text-sm font-black text-white tabular-nums">{Math.round(ratio * 100)}%</span>
          </ProgressRing>

          <div className="flex-1 min-w-0">
            <div className="text-xs font-black text-white">
              {doneCount} / {total} {t.completed}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <button type="button" onClick={onGoToStreak}
                className="flex items-center gap-1 text-[10px] font-black text-amber-400 hover:brightness-125 transition-all">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                {list.streak} {t.daysStreak}
              </button>
              <span className="flex items-center gap-1 text-[10px] font-black text-neutral-500">
                <Trophy className="w-3.5 h-3.5" /> {t.best} {list.bestStreak}
              </span>
            </div>
          </div>

          {isGroup
            ? <AvatarStack members={list.members} size={26} max={4} />
            : list.reset.mode !== "none" && (
                <button type="button" aria-label={t.resetNow}
                  onClick={() => { if (window.confirm(t.resetNowConfirm)) store.resetListNow(list.id); }}
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all">
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
        </div>

        {/* Group lists are local-only for now — say so rather than implying sync. */}
        {isGroup && (
          <AnimatePresence>
            {noteOpen ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden">
                <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="flex-1 text-[10px] font-medium text-amber-200/90 leading-relaxed">{t.localOnly}</p>
                  <button type="button" onClick={() => setNoteOpen(false)} aria-label={t.close}
                    className="text-amber-400/70 hover:text-amber-300 shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <button type="button" onClick={() => setNoteOpen(true)}
                className="flex items-center gap-1.5 text-[9px] font-black text-neutral-600 hover:text-amber-400 transition-colors">
                <Info className="w-3 h-3" /> {t.localOnlyTitle}
              </button>
            )}
          </AnimatePresence>
        )}

        {/* Search */}
        <AnimatePresence>
          {searching && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search}
                className="w-full h-11 px-4 rounded-2xl bg-[#141416] border border-white/10 text-sm font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Tasks ───────────────────────────────────────────────── */}
      <div className="px-4 space-y-2">
        {total === 0 && (
          <div className="py-12 text-center space-y-1">
            <p className="text-sm font-black text-neutral-400">{t.emptyTitle}</p>
            <p className="text-xs font-medium text-neutral-600">{t.emptySub}</p>
          </div>
        )}

        {total > 0 && open.length === 0 && done.length === 0 && (
          <p className="py-12 text-center text-xs font-bold text-neutral-600">{t.noResults}</p>
        )}

        {allDone && !query && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl border text-center space-y-0.5"
            style={{ background: `${list.color}18`, borderColor: `${list.color}44` }}>
            <p className="text-sm font-black text-white">{t.allDone}</p>
            <p className="text-[10px] font-medium text-neutral-400">{t.allDoneSub}</p>
          </motion.div>
        )}

        <Reorder.Group axis="y" values={open} onReorder={applyReorder} className="space-y-2">
          <AnimatePresence initial={false}>
            {open.map((item) => (
              <ChecklistRow key={item.id} item={item} list={list} isRtl={isRtl} t={t}
                onToggle={() => store.toggleItem(list.id, item.id, ME.id)}
                onOpen={() => setDetailId(item.id)} />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {/* Inline composer, Notion-style */}
        <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#0f0f11] border border-dashed border-white/10 focus-within:border-white/25 transition-colors">
          <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
            <Plus className="w-3.5 h-3.5 text-neutral-500" />
          </span>
          <input ref={composerRef} value={composer} onChange={(e) => setComposer(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitComposer(); }}
            placeholder={t.addTask}
            className="flex-1 bg-transparent text-sm font-bold text-white placeholder:text-neutral-600 focus:outline-none" />
          {composer.trim() && (
            <button type="button" onClick={submitComposer}
              className="px-3 h-8 rounded-lg text-[10px] font-black text-white shrink-0"
              style={{ background: list.color }}>
              {t.addTask}
            </button>
          )}
        </div>

        {/* Completed section */}
        {done.length > 0 && (
          <div className="pt-3 space-y-2">
            <button type="button" onClick={() => setShowDone((v) => !v)}
              className="flex items-center gap-1.5 text-[10px] font-black text-neutral-500 uppercase tracking-wider hover:text-neutral-300 transition-colors">
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDone ? "" : "-rotate-90"}`} />
              {t.completed} · {done.length}
            </button>

            <AnimatePresence initial={false}>
              {showDone && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                  <Reorder.Group axis="y" values={done} onReorder={() => {}} className="space-y-2">
                    {done.map((item) => (
                      <ChecklistRow key={item.id} item={item} list={list} isRtl={isRtl} t={t}
                        onToggle={() => store.toggleItem(list.id, item.id, ME.id)}
                        onOpen={() => setDetailId(item.id)} />
                    ))}
                  </Reorder.Group>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {hidden > 0 && query && (
          <p className="pt-2 text-center text-[10px] font-bold text-neutral-600">+{hidden}</p>
        )}
      </div>

      {/* ── Overlays ────────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <ListDrawer lists={lists} activeId={list.id} isRtl={isRtl} t={t}
            onPick={(id) => { store.setActiveList(id); setDrawerOpen(false); }}
            onCreate={() => { setDrawerOpen(false); setEditorList(null); }}
            onClose={() => setDrawerOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editorList !== undefined && (
          <ListEditorModal
            list={editorList} isRtl={isRtl} t={t}
            onSave={(patch) => {
              if (editorList) store.updateList(editorList.id, patch);
              else store.addList(patch);
              setEditorList(undefined);
            }}
            onDelete={() => {
              if (window.confirm(t.deleteListConfirm)) {
                store.removeList(editorList.id);
                setEditorList(undefined);
              }
            }}
            onClose={() => setEditorList(undefined)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailItem && (
          <ItemDetailSheet
            item={detailItem} list={list} isRtl={isRtl} t={t}
            onSave={(patch) => { store.updateItem(list.id, detailItem.id, patch); setDetailId(null); }}
            onDelete={() => { store.removeItem(list.id, detailItem.id); setDetailId(null); }}
            onClose={() => setDetailId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
