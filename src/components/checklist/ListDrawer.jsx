import React from "react";
import { Check as CheckIcon, Plus } from "lucide-react";
import { localized, progressOf } from "../../lib/checklistModel";
import { Button, Label, List, Row, Sheet, num } from "../ui/kit";
import { AvatarStack, ProgressRing, describeReset } from "./ChecklistBits";

/**
 * The list's own mark: its icon, small, on a soft well, with the list's
 * colour as a dot in the corner. Both are the athlete's data.
 */
function ListMark({ list }) {
  return (
    <span className="relative shrink-0 w-10 h-10 rounded-full bg-sunk flex items-center justify-center text-base leading-none">
      <span aria-hidden="true">{list.emoji}</span>
      {list.color && (
        <span aria-hidden="true" className="absolute bottom-0 end-0 w-2.5 h-2.5 rounded-full ring-2 ring-card"
          style={{ background: list.color }} />
      )}
    </span>
  );
}

function ListRow({ list, isRtl, t, active, onPick }) {
  const n = (v) => num(v, isRtl);
  const { done, total, ratio } = progressOf(list);
  const right = (
    <span className="flex items-center gap-2.5">
      {list.type === "group"
        ? <AvatarStack members={list.members} size={24} max={3} />
        : <ProgressRing ratio={ratio} size={28} stroke={4} />}
      {active && (
        <span className="w-6 h-6 rounded-full bg-jet text-accent dark:bg-accent dark:text-on-accent flex items-center justify-center">
          <CheckIcon className="w-3.5 h-3.5" strokeWidth={3} aria-label={t.activeList} />
        </span>
      )}
    </span>
  );
  return (
    <Row onClick={onPick} isRtl={isRtl} aria-current={active ? "true" : undefined}
      icon={<ListMark list={list} />}
      title={localized(list, isRtl)}
      subtitle={`${describeReset(list, t)}${t.sep}${n(done)}/${n(total)}`}
      right={right} />
  );
}

/** Bottom-sheet list switcher, split by personal vs shared. */
export default function ListDrawer({ lists, activeId, isRtl, t, onPick, onCreate, onClose, open = true }) {
  const personal = lists.filter((l) => l.type !== "group");
  const group = lists.filter((l) => l.type === "group");

  return (
    <Sheet open={open} title={t.myLists} onClose={onClose} isRtl={isRtl} closeLabel={t.close}
      footer={(
        <Button tone="ink" size="lg" block onClick={onCreate}
          icon={<Plus className="w-5 h-5 text-accent dark:text-on-inv" strokeWidth={2.4} />}>
          {t.newList}
        </Button>
      )}>
      <section className="flex flex-col gap-2">
        <Label as="h3" className="m-0 px-1">{t.personal}</Label>
        {personal.length > 0 && (
          <List>
            {personal.map((l) => (
              <ListRow key={l.id} list={l} isRtl={isRtl} t={t} active={l.id === activeId} onPick={() => onPick(l.id)} />
            ))}
          </List>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <Label as="h3" className="m-0 px-1">{t.groupLists}</Label>
        {group.length === 0 ? (
          <p className="m-0 px-1 text-sm text-muted">{t.groupDesc}</p>
        ) : (
          <List>
            {group.map((l) => (
              <ListRow key={l.id} list={l} isRtl={isRtl} t={t} active={l.id === activeId} onPick={() => onPick(l.id)} />
            ))}
          </List>
        )}
      </section>
    </Sheet>
  );
}
