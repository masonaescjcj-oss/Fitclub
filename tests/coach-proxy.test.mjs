// The coach proxy: api/coach.js against a fake Anthropic stream and a fake
// auth checker, then the browser half (claudeClient.js) reading its stream.
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import Anthropic from '@anthropic-ai/sdk';

const require = createRequire(import.meta.url);
const coachApi = require('../api/coach.js');
// The function loads the SDK's CommonJS build and checks errors by class, so
// the fakes throw that build's classes; the browser half uses the ES build.
const { Anthropic: Sdk } = require('@anthropic-ai/sdk');
const { createCoachHandler, validateInput, sseFrame, LIMITS } = coachApi;

const client = await import('../src/lib/coach/claudeClient.js');
const { useCoachT } = await import('../src/lib/coach/coachI18n.js');

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log('✗', name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 400)})` : ''); };

// ── fakes ──
const SECRET = 'SECRET-BANANA-7731';
const TOKEN = 'good-token';
const verifyUser = async (token) => (token === TOKEN ? { id: 'u1' } : token === 'other-token' ? { id: 'u2' } : null);
const FINAL = { stop_reason: 'end_turn', model: 'claude-opus-5', usage: { input_tokens: 120, output_tokens: 9 } };

const textDelta = (text) => ({ type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text } });
const HAPPY = [
  { type: 'message_start', message: { id: 'msg_1', model: 'claude-opus-5' } },
  { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'private reasoning' } },
  { type: 'content_block_stop', index: 0 },
  { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
  textDelta('Eat '), textDelta('more protein.'),
  { type: 'content_block_stop', index: 1 },
  { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 9 } },
  { type: 'message_stop' },
];

/** A stand-in for `new Anthropic()`: `script(opts)` is an async generator of stream events. */
function fakeAnthropic(script, final = FINAL) {
  const calls = [];
  return {
    calls,
    beta: {
      messages: {
        stream(params, opts) {
          calls.push({ params, opts });
          const it = script(opts);
          return {
            [Symbol.asyncIterator]: () => it,
            finalMessage: async () => { if (final instanceof Error) throw final; return final; },
          };
        },
      },
    },
  };
}
const replay = (events) => async function* () { for (const e of events) yield e; };

function fakeReq({ method = 'POST', token = TOKEN, headers = {}, body } = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.headers = { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers };
  if (typeof body === 'function') Object.defineProperty(req, 'body', { get: body });
  else req.body = body;
  req.readableEnded = true;
  return req;
}

function fakeRes() {
  const res = new EventEmitter();
  Object.assign(res, { statusCode: 200, headers: {}, chunks: [], headersSent: false, writableEnded: false, writableFinished: false });
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.writeHead = (status, h = {}) => { res.statusCode = status; for (const [k, v] of Object.entries(h)) res.setHeader(k, v); res.headersSent = true; return res; };
  res.flushHeaders = () => {};
  res.write = (c) => { res.headersSent = true; res.chunks.push(String(c)); return true; };
  res.end = (c) => {
    if (c !== undefined) res.chunks.push(String(c));
    res.headersSent = true; res.writableEnded = true; res.writableFinished = true;
    res.emit('finish'); res.emit('close');
  };
  Object.defineProperty(res, 'body', { get: () => res.chunks.join('') });
  Object.defineProperty(res, 'json', { get: () => JSON.parse(res.body) });
  return res;
}

const logs = [];
const log = { error: (...a) => logs.push(a.map(String).join(' ')) };
const makeHandler = (anthropic, extra = {}) => createCoachHandler({ anthropic, verifyUser, log, ...extra });

const MSGS = [{ role: 'user', content: `How much protein today? ${SECRET}` }];
const SYSTEM = [
  { type: 'text', text: 'You are the coach.', cache_control: { type: 'ephemeral' } },
  { type: 'text', text: '# Athlete data\nkcal: 1800' },
];
const body = (extra = {}) => ({ system: SYSTEM, messages: MSGS, ...extra });

async function call(handler, req) {
  const res = fakeRes();
  await handler(req, res);
  return res;
}

// ── method and auth ──
{
  const fake = fakeAnthropic(replay(HAPPY));
  const h = makeHandler(fake);
  const get = await call(h, fakeReq({ method: 'GET' }));
  check('GET → 405', get.statusCode === 405, get.statusCode);
  check('405 names POST as allowed', get.headers.allow === 'POST', get.headers);
  check('405 body is an error kind', get.json.error === 'request', get.body);

  const none = await call(h, fakeReq({ token: null, body: body() }));
  check('no token → 401', none.statusCode === 401 && none.json.error === 'auth', [none.statusCode, none.body]);
  check('401 is JSON', String(none.headers['content-type']).startsWith('application/json'), none.headers);

  const basic = await call(h, fakeReq({ token: null, headers: { authorization: 'Basic abc' }, body: body() }));
  check('non-Bearer auth → 401', basic.statusCode === 401, basic.statusCode);

  const bad = await call(h, fakeReq({ token: 'expired', body: body() }));
  check('token the checker rejects → 401', bad.statusCode === 401 && bad.json.error === 'auth', bad.body);
  check('nothing reaches Anthropic without a valid user', fake.calls.length === 0, fake.calls.length);

  const down = await call(makeHandler(fake, { verifyUser: async () => { throw Object.assign(new Error('fetch failed'), { name: 'AuthRetryableFetchError', status: 0 }); } }),
    fakeReq({ body: body() }));
  check('auth service unreachable → 502 network, not 401', down.statusCode === 502 && down.json.error === 'network', [down.statusCode, down.body]);

  const noKey = await call(createCoachHandler({ anthropic: () => null, verifyUser, log }), fakeReq({ body: body() }));
  check('missing ANTHROPIC_API_KEY → 500 server', noKey.statusCode === 500 && noKey.json.error === 'server', [noKey.statusCode, noKey.body]);
  const noAuth = await call(createCoachHandler({ anthropic: fake, verifyUser: null, log }), fakeReq({ body: body() }));
  check('missing Supabase config → 500 server', noAuth.statusCode === 500 && noAuth.json.error === 'server', noAuth.body);
}

// ── input caps and shape ──
{
  const fake = fakeAnthropic(replay(HAPPY));
  const h = makeHandler(fake, { rate: { max: 1000, windowMs: 1000 } });
  const status = async (b, headers) => (await call(h, fakeReq({ body: b, headers }))).statusCode;

  // Alternating turns that open and close with the athlete.
  const turns = (n) => Array.from({ length: n }, (_, i) => ({ role: i % 2 && i < n - 1 ? 'assistant' : 'user', content: `m${i}` }));
  check('21 messages → 413', await status({ messages: turns(LIMITS.maxMessages + 1) }) === 413);
  check('20 messages are fine', await status({ messages: turns(LIMITS.maxMessages) }) === 200);
  check('over the character cap → 413', await status({ messages: [{ role: 'user', content: 'x'.repeat(LIMITS.maxChars + 1) }] }) === 413);
  check('system counts toward the cap', await status({ system: 'y'.repeat(LIMITS.maxChars), messages: [{ role: 'user', content: 'hi' }] }) === 413);
  check('declared body over the byte cap → 413', await status(body(), { 'content-length': String(LIMITS.maxBodyBytes + 1) }) === 413);
  check('raw string body over the byte cap → 413', await status(JSON.stringify({ messages: [{ role: 'user', content: 'é'.repeat(LIMITS.maxBodyBytes / 2) }] })) === 413);
  check('no body → 400', await status(undefined) === 400);
  check('malformed JSON string → 400', await status('{"messages": [') === 400);
  check('Vercel body getter throwing on bad JSON → 400', await status(() => { throw new SyntaxError('Invalid JSON'); }) === 400);
  check('JSON string body is parsed', await status(JSON.stringify(body())) === 200);
  check('unknown fields → 400 (no model or max_tokens from the client)', await status(body({ model: 'claude-haiku-4-5' })) === 400);
  check('empty messages → 400', await status({ messages: [] }) === 400);
  check('assistant first → 400', await status({ messages: [{ role: 'assistant', content: 'hi' }, { role: 'user', content: 'q' }] }) === 400);
  check('assistant last (prefill) → 400', await status({ messages: [{ role: 'user', content: 'q' }, { role: 'assistant', content: 'a' }] }) === 400);
  check('system role in messages → 400', await status({ messages: [{ role: 'system', content: 'x' }] }) === 400);
  check('non-text content → 400', await status({ messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'url', url: 'https://x' } }] }] }) === 400);
  check('blank content → 400', await status({ messages: [{ role: 'user', content: '   ' }] }) === 400);
  check('too many system blocks → 400', await status({ system: Array.from({ length: 5 }, () => ({ type: 'text', text: 's' })), messages: MSGS }) === 400);
  check('none of the refused requests reached Anthropic', fake.calls.length === 2, fake.calls.length);

  const clean = validateInput({
    system: [{ type: 'text', text: 'rules', cache_control: { type: 'ephemeral', ttl: '1h' }, extra: 1 }],
    messages: [{ role: 'user', content: [{ type: 'text', text: 'hi', citations: [] }], name: 'x' }],
  });
  check('validated input keeps only known fields', JSON.stringify(clean) === JSON.stringify({
    system: [{ type: 'text', text: 'rules', cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
  }), clean);
}

// ── SSE framing and the request that goes upstream ──
{
  const fake = fakeAnthropic(replay(HAPPY));
  const res = await call(makeHandler(fake), fakeReq({ body: body() }));
  check('stream → 200', res.statusCode === 200, res.statusCode);
  check('content type is text/event-stream', String(res.headers['content-type']).startsWith('text/event-stream'), res.headers);
  check('no caching of the stream', /no-cache/.test(res.headers['cache-control'] || ''), res.headers);
  const expected =
    'event: text\ndata: {"text":"Eat "}\n\n' +
    'event: text\ndata: {"text":"more protein."}\n\n' +
    'event: done\ndata: {"stop_reason":"end_turn","model":"claude-opus-5","usage":{"input_tokens":120,"output_tokens":9}}\n\n';
  check('frames: text deltas, then done with stop_reason, model and usage', res.body === expected, res.body);
  check('thinking never reaches the client', !res.body.includes('private reasoning'));
  check('the response is ended', res.writableEnded);
  check('sseFrame helper matches the wire format', sseFrame('text', { text: 'a\nb' }) === 'event: text\ndata: {"text":"a\\nb"}\n\n');

  const { params, opts } = fake.calls[0];
  check('model is the coach model', params.model === coachApi.COACH_MODEL && params.model === client.COACH_MODEL, params.model);
  check('max_tokens is the server cap', params.max_tokens === 4096, params.max_tokens);
  check('adaptive thinking', params.thinking && params.thinking.type === 'adaptive', params.thinking);
  check('server-side fallbacks on', params.fallbacks === 'default' && params.betas.includes('server-side-fallback-2026-07-01'), [params.fallbacks, params.betas]);
  check('system blocks pass through with their cache breakpoint', JSON.stringify(params.system) === JSON.stringify(SYSTEM), params.system);
  check('messages pass through', JSON.stringify(params.messages) === JSON.stringify(MSGS), params.messages);
  check('upstream call gets an abort signal', opts && opts.signal && typeof opts.signal.aborted === 'boolean');
}

// ── error mapping ──
{
  const apiErr = (status, type) => Sdk.APIError.generate(status, { type: 'error', error: { type, message: 'nope' } }, 'nope', new Headers());
  const cases = [
    ['rate limited upstream', apiErr(429, 'rate_limit_error'), 429, 'rate'],
    ['bad request upstream', apiErr(400, 'invalid_request_error'), 400, 'request'],
    ['operator key rejected is a server problem', apiErr(401, 'authentication_error'), 502, 'server'],
    ['permission denied is a server problem', apiErr(403, 'permission_error'), 502, 'server'],
    ['overloaded', apiErr(529, 'overloaded_error'), 502, 'server'],
    ['request too large upstream', apiErr(413, 'request_too_large'), 400, 'request'],
    ['connection failure', new Sdk.APIConnectionError({ message: 'socket hang up' }), 502, 'network'],
    ['anything else', new Error('boom'), 500, 'unknown'],
  ];
  for (const [name, err, status, kind] of cases) {
    const res = await call(makeHandler(fakeAnthropic(async function* () { throw err; })), fakeReq({ body: body() }));
    check(`before any output, ${name} → ${status} {error:"${kind}"}`, res.statusCode === status && res.json.error === kind, [res.statusCode, res.body]);
  }

  const mid = await call(makeHandler(fakeAnthropic(async function* () {
    yield HAPPY[0]; yield textDelta('Half an ans'); throw apiErr(529, 'overloaded_error');
  })), fakeReq({ body: body() }));
  check('mid-stream failure keeps 200 and the text so far', mid.statusCode === 200 && mid.body.startsWith('event: text\ndata: {"text":"Half an ans"}\n\n'), mid.body);
  check('mid-stream failure ends with an error event', mid.body.endsWith('event: error\ndata: {"error":"server"}\n\n') && !mid.body.includes('event: done'), mid.body);

  const late = await call(makeHandler(fakeAnthropic(replay(HAPPY.slice(0, 6)), apiErr(429, 'rate_limit_error'))), fakeReq({ body: body() }));
  check('error surfacing from finalMessage after output → error event', late.body.endsWith('event: error\ndata: {"error":"rate"}\n\n'), late.body);

  const cs = coachApi.classifyUpstream;
  check('abort maps to aborted', cs(new Sdk.APIUserAbortError()) === 'aborted' && cs(Object.assign(new Error('x'), { name: 'AbortError' })) === 'aborted');
  check('server kinds are exactly the client kinds', JSON.stringify(coachApi.ERROR_KINDS) === JSON.stringify(client.ERROR_KINDS), coachApi.ERROR_KINDS);
  for (const isRtl of [false, true]) {
    const t = useCoachT(isRtl);
    const missing = [...client.ERROR_KINDS, 'authProxy'].filter((k) => !t.errors[k]);
    check(`every error kind has a ${isRtl ? 'fa' : 'en'} message`, missing.length === 0, missing);
  }
}

// ── client disconnect ──
{
  let res;
  let seenSignal;
  const fake = fakeAnthropic(async function* (opts) {
    seenSignal = opts.signal;
    yield HAPPY[0];
    yield textDelta('Let me');
    res.emit('close'); // the athlete tapped Stop
    if (opts.signal.aborted) throw new Sdk.APIUserAbortError();
    yield textDelta(' never sent');
  });
  const h = makeHandler(fake);
  res = fakeRes();
  const before = logs.length;
  await h(fakeReq({ body: body() }), res);
  check('closing the connection aborts the upstream request', seenSignal && seenSignal.aborted);
  check('nothing after the disconnect is written', !res.body.includes('never sent') && !res.body.includes('event: error'), res.body);
  check('a disconnect is not logged as an error', logs.length === before, logs.slice(before));
}

// ── rate limit ──
{
  let clock = 1_000_000;
  const fake = fakeAnthropic(replay(HAPPY));
  const h = makeHandler(fake, { rate: { max: 2, windowMs: 60_000 }, now: () => clock });
  const s1 = (await call(h, fakeReq({ body: body() }))).statusCode;
  clock += 1000;
  const s2 = (await call(h, fakeReq({ body: body() }))).statusCode;
  clock += 1000;
  const r3 = await call(h, fakeReq({ body: body() }));
  check('two replies inside the window are allowed', s1 === 200 && s2 === 200, [s1, s2]);
  check('the third → 429 {error:"rate"}', r3.statusCode === 429 && r3.json.error === 'rate', [r3.statusCode, r3.body]);
  check('429 carries Retry-After in seconds', r3.headers['retry-after'] === '58', r3.headers);
  check('a rate-limited request never reaches Anthropic', fake.calls.length === 2, fake.calls.length);
  const other = await call(h, fakeReq({ token: 'other-token', body: body() }));
  check('the limit is per user', other.statusCode === 200, other.statusCode);
  const badInput = await call(h, fakeReq({ body: { messages: [] } }));
  check('bad input is refused before it counts against the limit', badInput.statusCode === 400, badInput.statusCode);
  clock += 60_000;
  const again = await call(h, fakeReq({ body: body() }));
  check('the window slides: allowed again later', again.statusCode === 200, again.statusCode);
}

// ── default export without configuration ──
{
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.YDC_API_KEY;
  const origError = console.error;
  const seen = [];
  console.error = (...a) => seen.push(a.join(' '));
  const get = fakeRes();
  await coachApi(fakeReq({ method: 'GET' }), get);
  const post = fakeRes();
  await coachApi(fakeReq({ body: body() }), post);
  console.error = origError;
  check('default handler: GET → 405', get.statusCode === 405);
  check('default handler without env → 500 server', post.statusCode === 500 && post.json.error === 'server', [post.statusCode, post.body]);
  check('the missing variable is named in the log', seen.some((l) => l.includes('ANTHROPIC_API_KEY')), seen);
}

// ── You.com's express agent, when there is no Anthropic key ──
{
  const { toYouInput, youReply, YOU_MODEL } = coachApi;
  // You.com frames end in CRLF.
  const sse = (frames) => frames.map((f, i) => `id: ${i}\r\nevent: ${f.type}\r\ndata: ${JSON.stringify(f)}\r\n\r\n`).join('');
  const answer = (delta) => ({ type: 'response.output_text.delta', response: { output_index: 0, type: 'message.answer', delta } });
  const youFrames = (...texts) => [
    { type: 'response.created' },
    { type: 'response.starting' },
    { type: 'response.output_item.added', response: { output_index: 0 } },
    ...texts.map(answer),
    { type: 'response.output_item.done', response: { output_index: 0 } },
    { type: 'response.done', response: { run_time_ms: '1.1', finished: true } },
  ];
  /** A fetch stand-in answering with `text` cut into `size`-byte chunks, so CRLFs and Persian letters split. */
  const fakeFetch = (text, { status = 200, size = 7 } = {}) => {
    const calls = [];
    const f = async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      const bytes = new TextEncoder().encode(text);
      const chunks = [];
      for (let i = 0; i < bytes.length; i += size) chunks.push(bytes.slice(i, i + size));
      return { ok: status >= 200 && status < 300, status, body: (async function* () { for (const c of chunks) yield c; })() };
    };
    f.calls = calls;
    return f;
  };
  const youHandler = (fetchImpl, extra = {}) =>
    createCoachHandler({ anthropic: () => null, youdotcom: () => ({ apiKey: 'ydc-test-key', fetchImpl }), verifyUser, log, ...extra });
  const convo = [...MSGS, { role: 'assistant', content: 'Hi!' }, { role: 'user', content: [{ type: 'text', text: 'And dinner?' }] }];

  const f = fakeFetch(sse(youFrames('سلام', ' سارا! ', 'شام: مرغ.')));
  const ok = await call(youHandler(f), fakeReq({ body: body({ messages: convo }) }));
  check('you.com: streams SSE', ok.statusCode === 200 && String(ok.headers['content-type']).startsWith('text/event-stream'), [ok.statusCode, ok.headers]);
  check('you.com: every delta arrives whole, across split chunks and CRLFs',
    ['سلام', ' سارا! ', 'شام: مرغ.'].every((t) => ok.body.includes(sseFrame('text', { text: t }))), ok.body);
  check('you.com: ends with done, naming the model', ok.body.endsWith(sseFrame('done', { stop_reason: 'end_turn', model: YOU_MODEL, usage: null })), ok.body);
  const sent = f.calls[0];
  check('you.com: the express agent, streaming, and nothing else in the body',
    sent.url === 'https://api.you.com/v1/agents/runs' && sent.body.agent === 'express' && sent.body.stream === true && Object.keys(sent.body).sort().join() === 'agent,input,stream', sent);
  check('you.com: the key goes only in the Authorization header', sent.init.headers.Authorization === 'Bearer ydc-test-key' && !sent.init.body.includes('ydc-test-key'), sent.init.headers);
  check('you.com: roles become user and agent', JSON.stringify(sent.body.input.map((m) => m.role)) === '["user","agent","user"]', sent.body.input);
  check('you.com: the coach rules and athlete data ride in the first message',
    ['You are the coach.', 'kcal: 1800', SECRET].every((t) => sent.body.input[0].content.includes(t)), sent.body.input[0]);
  check('you.com: later messages are plain text', sent.body.input[1].content === 'Hi!' && sent.body.input[2].content === 'And dinner?', sent.body.input);
  check('you.com: the abort signal is passed on', sent.init.signal instanceof AbortSignal);
  check('toYouInput without a system prompt leaves the first message as it is',
    toYouInput({ messages: [{ role: 'user', content: 'Hey' }] })[0].content === 'Hey');

  // Other output items (search results and the like) are not the answer.
  const mixed = sse([{ type: 'response.created' }, { type: 'response.output_text.delta', response: { type: 'web_search.results', delta: 'IGNORED' } }, answer('Only this.'), { type: 'response.done' }]);
  const onlyAnswer = await call(youHandler(fakeFetch(mixed)), fakeReq({ body: body() }));
  check('you.com: only answer text is forwarded', !onlyAnswer.body.includes('IGNORED') && onlyAnswer.body.includes('Only this.'), onlyAnswer.body);

  for (const [status, code, kind] of [[401, 502, 'server'], [402, 502, 'server'], [403, 502, 'server'], [429, 429, 'rate'], [422, 400, 'request'], [503, 502, 'server']]) {
    const r = await call(youHandler(fakeFetch('', { status })), fakeReq({ body: body() }));
    check(`you.com ${status} → ${code} ${kind}`, r.statusCode === code && r.json.error === kind, [r.statusCode, r.body]);
  }
  const unreachable = await call(youHandler(async () => { throw new TypeError('fetch failed'); }), fakeReq({ body: body() }));
  check('you.com unreachable → 502 network', unreachable.statusCode === 502 && unreachable.json.error === 'network', [unreachable.statusCode, unreachable.body]);
  const silent = await call(youHandler(fakeFetch(sse(youFrames()))), fakeReq({ body: body() }));
  check('you.com: a run that says nothing → 502 server', silent.statusCode === 502 && silent.json.error === 'server', [silent.statusCode, silent.body]);
  const failed = await call(youHandler(fakeFetch(sse([{ type: 'response.created' }, { type: 'response.failed' }]))), fakeReq({ body: body() }));
  check('you.com: a failed run → 502 server', failed.statusCode === 502 && failed.json.error === 'server', [failed.statusCode, failed.body]);
  const cut = sse(youFrames('Half an ')).split('id: 4')[0];
  const partial = await call(youHandler(fakeFetch(cut)), fakeReq({ body: body() }));
  check('you.com: a reply cut off mid-way keeps its text and ends with an error event',
    partial.statusCode === 200 && partial.body.includes(sseFrame('text', { text: 'Half an ' })) && partial.body.endsWith(sseFrame('error', { error: 'network' })), partial.body);

  const f2 = fakeFetch(sse(youFrames('x')));
  const refused = await call(youHandler(f2), fakeReq({ token: 'expired', body: body() }));
  check('you.com: a bad token never reaches You.com', refused.statusCode === 401 && f2.calls.length === 0, [refused.statusCode, f2.calls.length]);
  const junk = await call(youHandler(f2), fakeReq({ body: { messages: [{ role: 'system', content: 'x' }] } }));
  check('you.com: a malformed body never reaches You.com', junk.statusCode === 400 && f2.calls.length === 0, [junk.statusCode, f2.calls.length]);

  const both = fakeAnthropic(replay(HAPPY));
  const f3 = fakeFetch(sse(youFrames('x')));
  const claudeFirst = await call(createCoachHandler({ anthropic: both, youdotcom: { apiKey: 'k', fetchImpl: f3 }, verifyUser, log }), fakeReq({ body: body() }));
  check('with both keys set, Claude answers and You.com is not called', claudeFirst.statusCode === 200 && both.calls.length === 1 && f3.calls.length === 0, [both.calls.length, f3.calls.length]);
  const neither = await call(createCoachHandler({ anthropic: () => null, youdotcom: () => null, verifyUser, log }), fakeReq({ body: body() }));
  check('with neither key → 500 server', neither.statusCode === 500 && neither.json.error === 'server', [neither.statusCode, neither.body]);
  check('the log names both variables', logs.some((l) => l.includes('ANTHROPIC_API_KEY') && l.includes('YDC_API_KEY')), logs.slice(-3));

  // The athlete taps Stop: the connection closes and the upstream run is cancelled.
  let upstreamSignal;
  const hang = async (url, init) => {
    upstreamSignal = init.signal;
    return {
      ok: true, status: 200,
      body: (async function* () {
        yield new TextEncoder().encode(sse([{ type: 'response.created' }, answer('Thinking about ')]));
        await new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
      })(),
    };
  };
  const stopRes = fakeRes();
  const pending = youHandler(hang)(fakeReq({ body: body() }), stopRes);
  await new Promise((r) => setTimeout(r, 20));
  stopRes.emit('close');
  await pending;
  check('you.com: closing the connection cancels the run', upstreamSignal && upstreamSignal.aborted, upstreamSignal && upstreamSignal.aborted);
  check('you.com: a cancelled run writes no error', !stopRes.body.includes('event: error'), stopRes.body);

  // youReply on its own
  const pieces = [];
  for await (const t of youReply({ messages: MSGS }, { apiKey: 'k', fetchImpl: fakeFetch(sse(youFrames('a', 'b')), { size: 1 }) })) pieces.push(t);
  check('youReply yields the deltas in order, even one byte at a time', pieces.join('|') === 'a|b', pieces);
}

check('no log line carries message contents, tokens or keys', logs.every((l) => !l.includes(SECRET) && !l.includes(TOKEN) && !l.includes('ydc-test-key')), logs);
check('errors were logged with their kind', logs.some((l) => l.includes('upstream error') && l.includes('rate')), logs);

// ── the browser half ──
{
  check('proxy limits match the server', client.PROXY_LIMITS.maxMessages === LIMITS.maxMessages && client.PROXY_LIMITS.maxChars === LIMITS.maxChars, client.PROXY_LIMITS);
  const KEY = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz';
  check('no backend, no key → demo', client.coachMode('') === 'demo');
  check('own key → direct', client.coachMode(KEY) === 'key');
  check('proxy not offered without a backend', client.proxyAvailable === false && client.proxyForced === false);

  process.env.REACT_APP_COACH_PROXY = '1';
  const forced = await import('../src/lib/coach/claudeClient.js?forced');
  delete process.env.REACT_APP_COACH_PROXY;
  check('REACT_APP_COACH_PROXY=1 → proxy without a key', forced.coachMode('') === 'proxy');
  check('REACT_APP_COACH_PROXY=1 → proxy even with a key', forced.coachMode(KEY) === 'proxy');
  check('forced proxy is reported', forced.proxyForced === true && forced.proxyAvailable === true);

  // Trimming to the caps, oldest turns first, opening with the athlete.
  const long = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `turn ${i}` }));
  const fit = client.fitToLimits(SYSTEM, long);
  check('trimmed to 20 messages', fit.length <= 20 && fit[fit.length - 1].content === 'turn 29', fit.length);
  check('trimmed conversation opens with the athlete', fit[0].role === 'user', fit[0]);
  const big = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'z'.repeat(9000) }));
  big.push({ role: 'user', content: 'latest' });
  const fitBig = client.fitToLimits(SYSTEM, big);
  const chars = fitBig.reduce((n, m) => n + m.content.length, 0) + SYSTEM.reduce((n, b) => n + b.text.length, 0);
  check('trimmed under the character cap', chars <= LIMITS.maxChars && fitBig[0].role === 'user' && fitBig[fitBig.length - 1].content === 'latest', [chars, fitBig.length]);
  check('the newest question is always kept', client.fitToLimits(null, [{ role: 'user', content: 'q'.repeat(LIMITS.maxChars * 2) }]).length === 1);
  check('trimmed input passes the server', (() => { try { validateInput({ system: SYSTEM, messages: fitBig }); return true; } catch { return false; } })());

  // The SSE parser copes with any chunking.
  const wire = `: hello\n\n${sseFrame('text', { text: 'A' })}${sseFrame('text', { text: 'ß\nc' })}${sseFrame('done', FINAL)}`;
  for (const size of [1, 3, 7, wire.length]) {
    const push = client.createSseParser();
    const got = [];
    for (let i = 0; i < wire.length; i += size) got.push(...push(wire.slice(i, i + size)));
    check(`SSE parser, ${size}-char chunks`, got.length === 3 && got[0].event === 'text' && JSON.parse(got[1].data).text === 'ß\nc' && got[2].event === 'done', got);
  }
  const crlf = client.createSseParser()('event: text\r\ndata: {"text":"x"}\r\n\n');
  check('SSE parser tolerates CR before LF', crlf.length === 1 && crlf[0].event === 'text', crlf);

  // End to end over real HTTP: the handler behind a Node server, the client's fetch reader in front.
  let upstream = fakeAnthropic(replay(HAPPY));
  const h = createCoachHandler({ anthropic: () => upstream, verifyUser, log, rate: { max: 3, windowMs: 60_000 } });
  const server = http.createServer((req, res) => { h(req, res); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const fetchImpl = (url, init) => fetch(base + url, init);
  const deltas = [];
  const result = await client.streamViaProxy({ system: SYSTEM, messages: MSGS, token: TOKEN, fetchImpl, onText: (d, full) => deltas.push([d, full]) });
  check('client: onText gets each delta and the text so far', JSON.stringify(deltas) === JSON.stringify([['Eat ', 'Eat '], ['more protein.', 'Eat more protein.']]), deltas);
  check('client: same result shape as the direct call', result.text === 'Eat more protein.' && result.refused === false && result.truncated === false && result.model === 'claude-opus-5' && result.usage.output_tokens === 9, result);
  check('client: the body read off the wire reached Anthropic intact', JSON.stringify(upstream.calls[0].params.messages) === JSON.stringify(MSGS));

  upstream = fakeAnthropic(replay(HAPPY), { ...FINAL, stop_reason: 'refusal' });
  const refused = await client.streamViaProxy({ system: SYSTEM, messages: MSGS, token: TOKEN, fetchImpl });
  check('client: refusal flagged', refused.refused === true, refused);
  upstream = fakeAnthropic(replay(HAPPY), { ...FINAL, stop_reason: 'max_tokens' });
  const cut = await client.streamViaProxy({ system: SYSTEM, messages: MSGS, token: TOKEN, fetchImpl });
  check('client: truncation flagged', cut.truncated === true, cut);

  const kindOf = async (p) => { try { await p; return 'resolved'; } catch (err) { return client.classifyError(err); } };
  check('client: 4th reply in the window → rate', await kindOf(client.streamViaProxy({ system: SYSTEM, messages: MSGS, token: TOKEN, fetchImpl })) === 'rate');
  check('client: rejected token → auth', await kindOf(client.streamViaProxy({ system: SYSTEM, messages: MSGS, token: 'expired', fetchImpl })) === 'auth');
  check('client: not signed in → auth without a request', await kindOf(client.streamViaProxy({ system: SYSTEM, messages: MSGS, token: null, fetchImpl: () => { throw new Error('should not fetch'); } })) === 'auth');

  const h2 = createCoachHandler({ anthropic: () => upstream, verifyUser, log });
  server.removeAllListeners('request');
  server.on('request', (req, res) => { h2(req, res); });
  upstream = fakeAnthropic(async function* () { yield HAPPY[0]; yield textDelta('Par'); throw new Sdk.APIConnectionError({ message: 'reset' }); });
  const partial = [];
  check('client: mid-stream error event → its kind', await kindOf(client.streamViaProxy({ system: SYSTEM, messages: MSGS, token: TOKEN, fetchImpl, onText: (_d, full) => partial.push(full) })) === 'network');
  check('client: text before a mid-stream error was still delivered', partial.join() === 'Par', partial);
  upstream = fakeAnthropic(async function* () { throw Sdk.APIError.generate(529, { type: 'error', error: { type: 'overloaded_error', message: 'x' } }, 'x', new Headers()); });
  check('client: JSON error before the stream → its kind', await kindOf(client.streamViaProxy({ system: SYSTEM, messages: MSGS, token: TOKEN, fetchImpl })) === 'server');

  const ctrl = new AbortController();
  upstream = fakeAnthropic(async function* (opts) {
    yield HAPPY[0]; yield textDelta('Hold on');
    await new Promise((r) => { if (opts.signal.aborted) r(); else opts.signal.addEventListener('abort', r); });
    throw new Sdk.APIUserAbortError();
  });
  const stopped = await kindOf(client.streamViaProxy({ system: SYSTEM, messages: MSGS, token: TOKEN, fetchImpl, signal: ctrl.signal, onText: () => ctrl.abort() }));
  check('client: Stop mid-reply → aborted', stopped === 'aborted', stopped);
  await new Promise((r) => setTimeout(r, 50));
  check('client: Stop reaches the upstream request', upstream.calls[0].opts.signal.aborted === true);

  server.close();

  const fakeFetch = (status, text, type = 'application/json') => async () => new Response(text, { status, headers: { 'Content-Type': type } });
  check('client: 404 page (no function deployed) → server', await kindOf(client.streamViaProxy({ messages: MSGS, token: TOKEN, fetchImpl: fakeFetch(404, '<html>', 'text/html') })) === 'server');
  check('client: 413 {error:"request"} → request', await kindOf(client.streamViaProxy({ messages: MSGS, token: TOKEN, fetchImpl: fakeFetch(413, '{"error":"request"}') })) === 'request');
  check('client: unknown kind in the body → falls back to the status', await kindOf(client.streamViaProxy({ messages: MSGS, token: TOKEN, fetchImpl: fakeFetch(429, '{"error":"weird"}') })) === 'rate');
  check('client: stream that ends without done → network', await kindOf(client.streamViaProxy({ messages: MSGS, token: TOKEN, fetchImpl: fakeFetch(200, sseFrame('text', { text: 'a' }), 'text/event-stream') })) === 'network');
  check('client: fetch failing outright → network', await kindOf(client.streamViaProxy({ messages: MSGS, token: TOKEN, fetchImpl: async () => { throw new TypeError('Failed to fetch'); } })) === 'network');
  check('client: aborted fetch → aborted', await kindOf(client.streamViaProxy({ messages: MSGS, token: TOKEN, fetchImpl: async () => { throw new DOMException('The operation was aborted.', 'AbortError'); } })) === 'aborted');

  // The direct path's errors still classify as before.
  check('SDK errors still classify', client.classifyError(Anthropic.APIError.generate(401, {}, 'x', new Headers())) === 'auth' && client.classifyError(new Anthropic.APIConnectionError({ message: 'x' })) === 'network');
}

console.log(`coach-proxy: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
