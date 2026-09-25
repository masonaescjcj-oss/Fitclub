import {
  ME, createChat, createMessage, createUser, visibleMessages, scheduledMessages,
  lastMessage, unreadCount, sortChats, toggleReaction, reactionList, allReactions,
  votePoll, pollTotals, hasVoted, groupByDay, isGroupedWith, previewOf,
} from '../src/lib/chat/chatModel.js';
let pass=0, fail=0;
const ok=(c,m,got)=>{c?pass++:fail++; if(!c) console.log('✗',m, got!==undefined?`(got ${JSON.stringify(got)})`:'');};
const iso=(min)=>new Date(Date.now()+min*60000).toISOString();

// ── ordering & scheduling ──
const msgs = [
  createMessage({id:'a', chatId:'c1', at: iso(-30), senderId:'sara'}),
  createMessage({id:'b', chatId:'c1', at: iso(-10), senderId: ME}),
  createMessage({id:'c', chatId:'c1', at: iso(60), scheduledFor: iso(60), senderId: ME}),
  createMessage({id:'d', chatId:'c2', at: iso(-5), senderId:'sara'}),
];
ok(visibleMessages(msgs,'c1').map(m=>m.id).join(',')==='a,b', 'scheduled message stays hidden', visibleMessages(msgs,'c1').map(m=>m.id));
ok(scheduledMessages(msgs,'c1').length===1, 'scheduled list');
ok(lastMessage(msgs,'c1').id==='b', 'last message ignores scheduled');
ok(lastMessage(msgs,'empty')===null, 'no messages -> null');

// ── unread ──
const chat = createChat({id:'c1', lastReadAt: iso(-20)});
ok(unreadCount(msgs, chat)===0, 'my own later message is not unread', unreadCount(msgs, chat));
const chat2 = createChat({id:'c1', lastReadAt: iso(-40)});
ok(unreadCount(msgs, chat2)===1, 'incoming after marker counts', unreadCount(msgs, chat2));
ok(unreadCount(msgs, createChat({id:'c1'}))===1, 'never-read chat counts incoming only');

// ── chat ordering: pinned first, then recency ──
const chats = [
  createChat({id:'c1', title:'older'}),
  createChat({id:'c2', title:'newer'}),
  createChat({id:'c3', title:'pinned', pinned:true}),
];
const order = sortChats(chats, msgs).map(c=>c.title);
ok(order[0]==='pinned', 'pinned chat leads', order);
ok(order.indexOf('newer') < order.indexOf('older'), 'newer before older', order);

// ── reactions ──
let m = createMessage({});
m = toggleReaction(m, '🔥');
ok(m.reactions['🔥'].includes(ME), 'reaction added');
ok(reactionList(m)[0].mine === true, 'reaction marked as mine');
m = toggleReaction(m, '🔥');
ok(m.reactions['🔥'] === undefined, 'toggling off removes the key entirely');
m = toggleReaction(m, '👍', 'sara');
m = toggleReaction(m, '👍', ME);
m = toggleReaction(m, '❤️', 'sara');
const list = reactionList(m);
ok(list[0].emoji==='👍' && list[0].count===2, 'reactions sorted by count', list);
ok(list.find(r=>r.emoji==='❤️').mine===false, 'someone else\'s reaction is not mine');
ok(allReactions(false).length < allReactions(true).length, 'premium unlocks more reactions');

// ── polls ──
const mk = (multiple) => createMessage({kind:'poll', poll:{question:'Q', multiple, options:[
  {text:'A', votes:[]},{text:'B', votes:[]},{text:'C', votes:['sara']}]}});
let p = mk(false);
ok(!hasVoted(p.poll), 'not voted yet');
p = votePoll(p, 0);
ok(p.poll.options[0].votes.includes(ME) && hasVoted(p.poll), 'single vote registered');
p = votePoll(p, 1);
ok(!p.poll.options[0].votes.includes(ME) && p.poll.options[1].votes.includes(ME), 'single-choice moves the vote');
ok(p.poll.options[2].votes.includes('sara'), 'other voters untouched');
let pm = mk(true);
pm = votePoll(pm, 0); pm = votePoll(pm, 1);
ok(pm.poll.options[0].votes.includes(ME) && pm.poll.options[1].votes.includes(ME), 'multiple choice keeps both');
pm = votePoll(pm, 0);
ok(!pm.poll.options[0].votes.includes(ME), 'multiple choice un-votes');
const totals = pollTotals(pm.poll);
ok(totals.voters===2, 'distinct voters counted once', totals);

// ── day grouping ──
const dayA = new Date(); dayA.setDate(dayA.getDate()-1);
const grouped = groupByDay([
  createMessage({id:'1', at: dayA.toISOString(), senderId:'sara'}),
  createMessage({id:'2', at: new Date().toISOString(), senderId:'sara'}),
]);
ok(grouped.filter(x=>x.separator).length===2, 'a separator per day', grouped.length);
ok(grouped[0].separator===true, 'day starts with a separator');

// ── bubble grouping ──
const base = createMessage({senderId:'sara', at: iso(-10)});
ok(isGroupedWith(base, createMessage({senderId:'sara', at: iso(-9)}))===true, 'same sender within 5 min groups');
ok(isGroupedWith(base, createMessage({senderId:'sara', at: iso(0)}))===false, 'a long gap breaks the group');
ok(isGroupedWith(base, createMessage({senderId:'amir', at: iso(-9)}))===false, 'different sender breaks the group');
ok(isGroupedWith({separator:true}, base)===false, 'separator breaks the group');
ok(isGroupedWith(null, base)===false, 'first message is never grouped');

// ── previews ──
const t = {deletedMessage:'Deleted', photo:'Photo', voiceMessage:'Voice', sticker:'Sticker', poll:'Poll', file:'File'};
ok(previewOf(createMessage({text:'hi'}), false, t)==='hi', 'text preview');
ok(previewOf(createMessage({kind:'photo'}), false, t).includes('Photo'), 'photo preview');
ok(previewOf(createMessage({kind:'poll', poll:{question:'Leg day?'}}), false, t).includes('Leg day?'), 'poll preview uses the question');
ok(previewOf(createMessage({deleted:true, text:'x'}), false, t)==='Deleted', 'deleted preview wins over text');
ok(previewOf(null, false, t)==='', 'no message -> empty preview');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
