import React, { useMemo, useState } from "react";
import { Check as CheckIcon, ChevronDown, Infinity as InfinityIcon, Plus, Repeat, Trash2, X } from "lucide-react";
import { LIST_COLORS, ME, localized } from "../../lib/checklistModel";
import { FRIEND_POOL } from "../../lib/checklistStore";
import { Button, Field, IconButton, Label, Segmented, Sheet, cx, num } from "../ui/kit";
import { Avatar } from "./ChecklistBits";
import { Tick } from "./ItemDetailSheet";

const EMOJI = ["✅", "🔥", "🎯", "💪", "🥗", "🧘", "🏃", "⚡", "🎒", "📚", "💧", "🌙", "🏆", "📅", "🧠", "❤️"];

const MODES = [
  { id: "none", icon: InfinityIcon, label: "resetNone", hint: "resetNoneHint" },
  { id: "daily", icon: Repeat, label: "resetDaily", hint: "resetDailyHint" },
  { id: "weekly", icon: Repeat, label: "resetWeekly", hint: "resetWeeklyHint" },
  { id: "monthly", icon: Repeat, label: "resetMonthly", hint: "resetMonthlyHint" },
  { id: "interval", icon: Repeat, label: "resetInterval", hint: "resetIntervalHint" },
];

/** A labelled group of controls inside the sheet. */
function Group({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex flex-col gap-1 px-1">
        <Label>{label}</Label>
        {hint && <span className="text-[13px] text-muted">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

/** A white card of rows, like the kit's List, for rows with their own buttons. */
function Rows({ children }) {
  return <ul className="m-0 p-0 py-1 list-none rounded-3xl bg-card divide-y divide-hair">{children}</ul>;
}

/** A native select on the kit's field well. */
function Select({ label, value, onChange, children }) {
  return (
    <label className="flex items-center justify-between gap-3 min-h-[56px] px-4">
      <span className="text-[15px] font-semibold text-ink">{label}</span>
      <span className="relative">
        <select value={value} onChange={onChange}
          className="h-10 ps-4 pe-9 rounded-full bg-sunk border-0 text-[15px] font-semibold text-ink appearance-none !outline-none focus:ring-2 focus:ring-inset focus:ring-ink cursor-pointer">
          {children}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
      </span>
    </label>
  );
}

/** A number stepper field for the reset detail. */
function NumberRow({ label, suffix, value, min, max, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 min-h-[56px] px-4">
      <span className="text-[15px] font-semibold text-ink">{label}</span>
      <span className="inline-flex items-center gap-2">
        <input type="number" inputMode="numeric" min={min} max={max} value={value} dir="ltr"
          onChange={(e) => onChange(Math.min(Math.max(+e.target.value || min, min), max))}
          className="w-20 h-10 px-3 rounded-full bg-sunk border-0 text-[15px] font-semibold text-ink text-center !outline-none focus:ring-2 focus:ring-inset focus:ring-ink" />
        {suffix && <span className="text-sm text-muted">{suffix}</span>}
      </span>
    </label>
  );
}

/** Create or edit a list: identity, sharing, and the reset schedule. */
export default function ListEditorModal({ list, isRtl, t, onSave, onDelete, onClose, open = true }) {
  const isNew = !list;
  const n = (v) => num(v, isRtl);
  const sep = t.sep || " · ";
  const [draft, setDraft] = useState(() => ({
    name: list ? localized(list, isRtl) : "",
    emoji: list?.emoji ?? "✅",
    color: list?.color ?? LIST_COLORS[0],
    type: list?.type ?? "personal",
    groupRule: list?.groupRule ?? "everyone",
    members: list?.members ?? [ME],
    reset: { mode: "daily", resetHour: 0, weekStart: 6, monthDay: 1, every: 2, ...(list?.reset || {}) },
  }));

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setReset = (patch) => setDraft((d) => ({ ...d, reset: { ...d.reset, ...patch } }));

  const available = useMemo(
    () => FRIEND_POOL.filter((f) => !draft.members.some((m) => m.id === f.id)),
    [draft.members]
  );

  const toggleFriend = (friend) =>
    set({
      members: draft.members.some((m) => m.id === friend.id)
        ? draft.members.filter((m) => m.id !== friend.id)
        : [...draft.members, friend],
    });

  const submit = () => {
    const name = draft.name.trim();
    if (!name) return;
    onSave({
      ...draft,
      name,
      // Switching back to personal drops everyone but you.
      members: draft.type === "group" ? draft.members : [ME],
    });
  };

  const typeHint = draft.type === "group" ? t.groupDesc : t.personalDesc;
  const ruleHint = draft.groupRule === "anyone" ? t.ruleAnyoneHint : t.ruleEveryoneHint;

  return (
    <Sheet open={open} title={isNew ? t.newList : t.editList} onClose={onClose} isRtl={isRtl} closeLabel={t.close} tall
      footer={(
        <>
          <Button tone="card" size="lg" className="flex-1" onClick={onClose}>{t.cancel}</Button>
          <Button tone="ink" size="lg" className="flex-1" onClick={submit} disabled={!draft.name.trim()}>
            {isNew ? t.createList : t.save}
          </Button>
        </>
      )}>
      {/* Name */}
      <Group label={t.listName}>
        <Field value={draft.name} autoFocus={isNew} aria-label={t.listName} inputClass="!outline-none"
          onChange={(e) => set({ name: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={t.listNamePlaceholder}
          prefix={<span aria-hidden="true" className="text-base leading-none">{draft.emoji}</span>} />
      </Group>

      {/* Icon: the list's own emoji, a piece of the athlete's data. */}
      <Group label={t.emoji}>
        <div className="grid grid-cols-8 p-1.5 rounded-3xl bg-card">
          {EMOJI.map((e) => {
            const on = draft.emoji === e;
            return (
              <button key={e} type="button" onClick={() => set({ emoji: e })} aria-pressed={on} aria-label={e}
                className={cx("h-11 rounded-full text-lg leading-none flex items-center justify-center border-0 cursor-pointer transition-colors",
                  on ? "bg-sunk ring-2 ring-inset ring-ink" : "bg-transparent")}>
                {e}
              </button>
            );
          })}
        </div>
      </Group>

      <Group label={t.color}>
        <div className="grid grid-cols-8 p-1.5 rounded-3xl bg-card">
          {LIST_COLORS.map((c) => {
            const on = draft.color === c;
            return (
              <button key={c} type="button" onClick={() => set({ color: c })} aria-pressed={on} aria-label={c}
                className="h-11 rounded-full flex items-center justify-center bg-transparent border-0 cursor-pointer">
                <span className={cx("w-7 h-7 rounded-full flex items-center justify-center", on && "ring-2 ring-ink ring-offset-2 ring-offset-card")}
                  style={{ background: c }}>
                  {on && <CheckIcon className="w-4 h-4 text-hero-fg" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </Group>

      {/* Personal vs group */}
      <Group label={t.listType}>
        <Segmented value={draft.type} onChange={(id) => set({ type: id })}
          options={[{ id: "personal", label: t.personal }, { id: "group", label: t.group }]} />
        <p className="m-0 px-1 text-[13px] text-muted">{typeHint}</p>
      </Group>

      {/* Group-only settings */}
      {draft.type === "group" && (
        <>
          <Group label={t.groupRule}>
            <Segmented value={draft.groupRule} onChange={(id) => set({ groupRule: id })}
              options={[{ id: "everyone", label: t.ruleEveryone }, { id: "anyone", label: t.ruleAnyone }]} />
            <p className="m-0 px-1 text-[13px] text-muted">{ruleHint}</p>
          </Group>

          <Group label={`${t.members}${sep}${n(draft.members.length)}`}>
            <Rows>
              {draft.members.map((m) => (
                <li key={m.id} className="list-none flex items-center gap-3.5 min-h-[56px] px-4 py-1.5">
                  <Avatar member={m} size={36} ring="" />
                  <span className="flex-1 min-w-0 text-[15px] font-semibold text-ink truncate">
                    {m.id === ME.id ? t.you : localized(m, isRtl)}
                  </span>
                  {m.id !== ME.id && (
                    <IconButton label={`${t.removeMember} ${localized(m, isRtl)}`} tone="soft" size={36} className="-me-1"
                      onClick={() => toggleFriend(m)}>
                      <X className="w-4 h-4" strokeWidth={2} />
                    </IconButton>
                  )}
                </li>
              ))}
            </Rows>
          </Group>

          <Group label={t.addFriends}>
            {available.length > 0 ? (
              <Rows>
                {available.map((f) => (
                  <li key={f.id} className="list-none">
                    <button type="button" onClick={() => toggleFriend(f)}
                      className="w-full min-h-[56px] flex items-center gap-3.5 px-4 py-1.5 text-start bg-transparent border-0 cursor-pointer active:bg-sunk transition-colors">
                      <Avatar member={f} size={36} ring="" />
                      <span className="flex-1 min-w-0 text-[15px] font-semibold text-ink truncate">{localized(f, isRtl)}</span>
                      <span className="w-9 h-9 -me-1 rounded-full bg-sunk text-ink flex items-center justify-center">
                        <Plus className="w-4 h-4" strokeWidth={2.4} />
                      </span>
                    </button>
                  </li>
                ))}
              </Rows>
            ) : (
              <p className="m-0 px-1 text-sm text-muted">{t.noFriendsLeft}</p>
            )}
          </Group>
        </>
      )}

      {/* Reset schedule */}
      <Group label={t.resetTitle} hint={t.resetDesc}>
        <Rows>
          {MODES.map((m) => {
            const Icon = m.icon;
            const on = draft.reset.mode === m.id;
            return (
              <li key={m.id} className="list-none">
                <button type="button" role="radio" aria-checked={on} onClick={() => setReset({ mode: m.id, anchor: Date.now() })}
                  className="w-full min-h-[60px] flex items-center gap-3.5 px-4 py-2 text-start bg-transparent border-0 cursor-pointer active:bg-sunk transition-colors">
                  <span className={cx("w-9 h-9 shrink-0 rounded-full flex items-center justify-center", on ? "bg-jet text-accent dark:bg-accent dark:text-on-accent" : "bg-sunk text-ink")}>
                    <Icon className="w-4 h-4" strokeWidth={2} />
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold text-ink">{t[m.label]}</span>
                    <span className="text-[13px] text-muted">{t[m.hint]}</span>
                  </span>
                  <Tick on={on} />
                </button>
              </li>
            );
          })}
        </Rows>

        {/* Mode-specific detail */}
        {draft.reset.mode === "weekly" && (
          <div role="radiogroup" aria-label={t.resetsOn} className="grid grid-cols-7 gap-1 p-1.5 rounded-3xl bg-card">
            {t.weekDays.map((d, i) => {
              const on = draft.reset.weekStart === i;
              return (
                <button key={i} type="button" role="radio" aria-checked={on} aria-label={d} onClick={() => setReset({ weekStart: i })}
                  className={cx("h-11 rounded-full border-0 cursor-pointer text-sm transition-colors",
                    on ? "bg-inv text-on-inv font-semibold" : "bg-transparent text-ink font-medium")}>
                  {isRtl ? [...d][0] : d.slice(0, 3)}
                </button>
              );
            })}
          </div>
        )}

        {draft.reset.mode !== "none" && (
          <Rows>
            {draft.reset.mode === "monthly" && (
              <li className="list-none">
                <NumberRow label={t.dayOfMonth} value={draft.reset.monthDay} min={1} max={28}
                  onChange={(v) => setReset({ monthDay: v })} />
              </li>
            )}
            {draft.reset.mode === "interval" && (
              <li className="list-none">
                <NumberRow label={t.everyNDays} suffix={t.days} value={draft.reset.every} min={1} max={90}
                  onChange={(v) => setReset({ every: v })} />
              </li>
            )}
            <li className="list-none">
              <Select label={t.resetHour} value={draft.reset.resetHour} onChange={(e) => setReset({ resetHour: +e.target.value })}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{n(String(h).padStart(2, "0"))}:{n("00")}</option>
                ))}
              </Select>
            </li>
          </Rows>
        )}
      </Group>

      {!isNew && (
        <Button tone="danger" size="md" className="self-start -ms-1 px-1" onClick={onDelete}
          icon={<Trash2 className="w-[18px] h-[18px]" strokeWidth={2} />}>
          {t.deleteList}
        </Button>
      )}
    </Sheet>
  );
}
