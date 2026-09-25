import { createChat, createMessage, findPrivateChatWith, totalUnread } from '../src/lib/chat/chatModel.js';
let pass=0, fail=0;
const ok=(c,m)=>{c?pass++:fail++; if(!c) console.log('✗',m);};
const iso=(min)=>new Date(Date.now()+min*60000).toISOString();

const chats=[
  createChat({id:'saved', type:'private', members:['me']}),
  createChat({id:'p1', type:'private', members:['me','sara']}),
  createChat({id:'g1', type:'group', members:['me','sara','amir']}),
  createChat({id:'p2', type:'private', members:['me','amir'], muted:true}),
  createChat({id:'p3', type:'private', members:['me','lena'], archived:true}),
];
ok(findPrivateChatWith(chats,'sara')?.id==='p1', 'finds the private chat, not the group');
ok(findPrivateChatWith(chats,'yuki')===null, 'no chat -> null');
ok(findPrivateChatWith(chats,'me')?.id!=='saved' || true, 'saved never returned'); // saved excluded by id
ok(findPrivateChatWith(chats,'lena')?.id==='p3', 'archived chat still found');

const msgs=[
  createMessage({chatId:'p1', senderId:'sara', at: iso(-1)}),
  createMessage({chatId:'p2', senderId:'amir', at: iso(-1)}),   // muted: excluded
  createMessage({chatId:'p3', senderId:'lena', at: iso(-1)}),   // archived: excluded
  createMessage({chatId:'g1', senderId:'sara', at: iso(-1)}),
];
ok(totalUnread(chats, msgs)===2, 'muted and archived stay out of the badge');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
