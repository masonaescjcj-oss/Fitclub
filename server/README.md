# FitClub messenger server

A small Node service (no dependencies) behind the in-app messenger. It speaks
the same JSON the client keeps locally, so the client works the same way
offline and online.

```bash
npm run server          # http://localhost:4000, state in server/data/db.json
npm run server:test     # in-process check with two accounts
PORT=5000 FITCLUB_DATA_DIR=/var/fitclub npm run server
```

In the app: **Chat → Settings → Server**, enter the URL, **Connect**. The
device signs in with the profile's name and `@username`. Every device that
connects to the same server can find the others by `@username` or link and
message for real; without a server the messenger keeps running on the
device alone with simulated peers.

## Auth

`POST /api/auth {name, username, avatar?}` → `{token, user}`. The account is
created on first sight of the username; later calls with the same username
sign into it. This is development auth. Replace this one route with real
sign-in when accounts exist; everything else takes `Authorization: Bearer
<token>` (or `?token=` for the event stream).

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | liveness, counts |
| GET / PATCH | `/api/me` | my profile; PATCH validates `username` |
| GET | `/api/users?q=` | people by name or handle |
| GET | `/api/users/:username` | one person |
| GET | `/api/username/:slug` | `{available, problem}` |
| GET | `/api/sync?since=` | me, the people in my chats, my chats (with my read marker), recent messages |
| GET | `/api/chats/public?q=` | public groups and channels I am not in |
| GET | `/api/resolve?code=` | what a `@handle`, `fitclub.app/…` or `…#join=` link points at |
| POST | `/api/join {code}` | join by username or `+invite` token |
| POST | `/api/chats` | create a group or channel (`isPublic` + `username`, `memberIds` may be ids or usernames) |
| POST | `/api/private {userId \| username}` | the one-to-one chat with someone (created once) |
| PATCH | `/api/chats/:id` | title, description, picture, type/link, `revokeLink` (admins) |
| POST / DELETE | `/api/chats/:id/members[/:uid]` | add / remove members (admins; owner can't be removed) |
| POST | `/api/chats/:id/admins/:uid` | toggle admin (admins) |
| POST | `/api/chats/:id/leave` | leave; the last member deletes the chat |
| DELETE | `/api/chats/:id` | delete (owner) |
| GET / POST | `/api/chats/:id/messages` | history (`?before=`) / send (`text, kind, replyTo, media, poll, voice, clientId, silent`) |
| PATCH / DELETE | `/api/messages/:id` | edit own / delete own or as admin |
| POST | `/api/messages/:id/react {emoji}` | toggle a reaction |
| POST | `/api/messages/:id/vote {option}` | vote in a poll |
| POST | `/api/chats/:id/read` | move my read marker; others get a `read` event |
| POST | `/api/chats/:id/typing` | tell the others I am typing |
| GET | `/api/events` | Server-Sent Events stream |

Errors are `{error: code}` with the fitting status: `username_short|long|chars|start|taken`,
`title_required`, `admins_only`, `owner`, `owner_only`, `not_yours`,
`link_not_found`, `chat_not_found`, `user_not_found`, `unauthorized`.

## Events

Each frame is one JSON object:

- `hello {userId}` on connect
- `message {message, sender}` new, edited, deleted, reacted or voted
- `chat {chat, users}` created or changed, with its members
- `chat.removed {chatId}` I was removed or the chat was deleted
- `user {user}` someone in my chats came online, went offline or changed their profile
- `typing {chatId, userId}`
- `read {chatId, userId, at}` they read up to `at`

## Shapes

Chats and messages are the client's own shapes (`src/lib/chat/chatModel.js`).
Two differences on the wire: a chat carries `readAt` per member (the client
receives only its own `lastReadAt`), and the signed-in user is a real id, which
the client maps to `"me"` in `src/lib/chat/api.js`.
