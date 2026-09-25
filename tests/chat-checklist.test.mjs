// Checklist messages in the app (src/lib/chat/chatModel.js): the same rules
// the server applies (supabase/migrations/0007), so a tick that shows is a
// tick that holds.
const { ME, buildChecklist, canMarkTask, canAddTask, markTask, addTask, checklistDone, createMessage, previewOf, CHECKLIST_MAX } = await import("../src/lib/chat/chatModel.js");
const { toLocalMessage } = await import("../src/lib/chat/api.js");

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 300)})` : ""); };

const list = buildChecklist({ title: "  خرید خانه ", tasks: ["خرید چند کیلو سیب زمینی", " ", "چند کیلو روغن", "بار اضافی", ...Array.from({ length: 40 }, (_, i) => `x${i}`)], othersCanMark: true, othersCanAdd: false });
check("a checklist: its title, tasks without blanks, 30 at most", list.title === "خرید خانه" && list.items.length === CHECKLIST_MAX && list.items[1].text === "چند کیلو روغن" && list.items.every((i) => i.addedBy === ME && !i.doneBy));
const mine = createMessage({ kind: "checklist", text: list.title, checklist: list });
const theirs = createMessage({ kind: "checklist", senderId: "ben", checklist: buildChecklist({ title: "Gym bag", tasks: ["Shoes"], othersCanMark: false, othersCanAdd: true }, "ben") });

let m = markTask(mine, "t2", true);
check("I tick a task in my checklist", m.checklist.items[1].doneBy === ME && m.checklist.items[1].doneAt && checklistDone(m.checklist) === 1);
check("Ben can tick in mine: I allowed it", markTask(mine, "t1", true, "ben").checklist.items[0].doneBy === "ben");
check("…but can't untick my tick", markTask(m, "t2", false, "ben").checklist.items[1].doneBy === ME);
check("I can untick anyone's in my own checklist", markTask(markTask(mine, "t1", true, "ben"), "t1", false).checklist.items[0].doneBy === null);
check("I can't tick in Ben's: he didn't allow it", markTask(theirs, "t1", true) === theirs && !canMarkTask(theirs, theirs.checklist.items[0], true));
check("Ben ticks his own", markTask(theirs, "t1", true, "ben").checklist.items[0].doneBy === "ben");
check("I can add to Ben's: he allowed it", canAddTask(theirs) && addTask(theirs, "  Towel ").checklist.items[1].text === "Towel" && addTask(theirs, "Towel").checklist.items[1].id === "t2" && addTask(theirs, "Towel").checklist.items[1].addedBy === ME);
check("…nobody can add to mine but me, and a full one takes no more", !canAddTask(mine, "ben") && !canAddTask(mine) && addTask(mine, "one more") === mine);
check("an empty task isn't added", addTask(theirs, "   ") === theirs);
check("a deleted checklist can't be touched", !canAddTask({ ...theirs, deleted: true }) && markTask({ ...mine, deleted: true }, "t1", true).checklist.items[0].doneBy === null);
check("the chat list shows it with its title", previewOf(mine, false, { checklist: "Checklist" }) === "☑️ خرید خانه");

const server = { id: "m1", senderId: "me-uuid", kind: "checklist", checklist: { title: "T", othersCanMark: true, othersCanAdd: true, items: [{ id: "t1", text: "a", addedBy: "me-uuid", doneBy: "ben-uuid", doneAt: "2026-09-26T01:46:00.000Z" }, { id: "t2", text: "b", addedBy: "ben-uuid", doneBy: "me-uuid" }] } };
const local = toLocalMessage(server, "me-uuid");
check("from the server, my ticks and tasks come back as mine", local.senderId === ME && local.checklist.items[0].addedBy === ME && local.checklist.items[0].doneBy === "ben-uuid" && local.checklist.items[1].doneBy === ME && local.checklist.items[1].addedBy === "ben-uuid");

console.log(`chat checklist: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
