# Coach proxy

`api/coach.js` is a Vercel serverless function that lets athletes talk to the
AI coach without an Anthropic key of their own. It checks the caller's Supabase
sign-in, streams Claude's reply back as Server-Sent Events, and keeps the
Anthropic key on the server. The browser side lives in
`src/lib/coach/claudeClient.js`.

## English

### Vercel environment variables

Set these under Project Settings → Environment Variables, for Production and
Preview (and Development if you use `vercel dev`), then redeploy. Changes only
reach new deployments.

| Name | Where it's read | Value |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | function only | An Anthropic API key. Mark it Sensitive. Never prefix it with `REACT_APP_`. |
| `SUPABASE_URL` | function only | Supabase → Project Settings → API → Project URL. |
| `SUPABASE_ANON_KEY` | function only | The anon (public) key from the same page. Never the service_role key. |
| `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY` | build | The same two values. With them set, the app signs athletes in, and the coach uses the proxy for anyone without their own key. |
| `REACT_APP_COACH_PROXY` | build, optional | `1` sends every coach message through the proxy, even for athletes who saved their own key; the key field then disappears from coach settings. It still needs the Supabase variables, because the proxy needs a signed-in athlete. |

If `SUPABASE_URL` / `SUPABASE_ANON_KEY` are missing, the function falls back to
the `REACT_APP_` pair. If `ANTHROPIC_API_KEY` is missing, it answers
`500 {"error":"server"}` and logs which variable is missing.

Recommended, in `vercel.json` (owned by someone else, so not added here):

```json
{ "functions": { "api/coach.js": { "supportsCancellation": true } } }
```

`supportsCancellation` stops the Claude request, and its cost, when the athlete
taps Stop or closes the tab. Without it, a reply keeps running on the server
until it finishes.

### Testing locally with `vercel dev`

1. `npm install`, then `npx vercel link` once to connect the folder to the project.
2. Add the variables above to the project's **Development** environment
   (`npx vercel env add ANTHROPIC_API_KEY development`, and so on). `vercel dev`
   loads them itself; there's no need to run `vercel env pull`.
3. `npx vercel dev` serves the app and `/api/coach` together at
   http://localhost:3000. `npm start` alone has no `/api`.
4. Sign in, open Coach, then the settings sheet: it should say
   "Connected through FitClub". Send a message.
5. Quick checks from a terminal:
   - `curl -i localhost:3000/api/coach` gives `405`
   - `curl -i -X POST localhost:3000/api/coach` gives `401 {"error":"auth"}`
   - With a real token (in the browser's localStorage under
     `sb-<project-ref>-auth-token`, field `access_token`):
     ```sh
     curl -N localhost:3000/api/coach -H "Authorization: Bearer $TOKEN" \
       -H "Content-Type: application/json" \
       -d '{"messages":[{"role":"user","content":"One tip for today?"}]}'
     ```
     This streams `event: text` frames, then `event: done`.

The unit tests (`npm run test:unit`, file `tests/coach-proxy.test.mjs`) run the
handler with a fake Anthropic stream and a fake auth checker. They need no keys.

### Limits

At most 20 messages, 48,000 characters of system prompt plus messages, and a
256 KB body. The client drops the oldest turns to fit before it sends. Each
athlete gets 20 replies per 10 minutes. That limit is kept in memory per
function instance, so it's best effort: separate instances count separately,
and a cold start resets the count.

## فارسی

### متغیرهای محیطی در Vercel

این‌ها را در Project Settings ← Environment Variables برای Production و Preview
(و اگر از `vercel dev` استفاده می‌کنی، Development) بگذار و دوباره دیپلوی کن.
تغییرها فقط به دیپلوی‌های تازه می‌رسند.

| نام | کجا خوانده می‌شود | مقدار |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | فقط تابع سرور | کلید API آنتروپیک. آن را Sensitive علامت بزن و هرگز پیشوند `REACT_APP_` به آن نده. |
| `SUPABASE_URL` | فقط تابع سرور | Supabase ← Project Settings ← API ← Project URL |
| `SUPABASE_ANON_KEY` | فقط تابع سرور | کلید anon (عمومی) از همان صفحه. هرگز کلید service_role. |
| `REACT_APP_SUPABASE_URL` و `REACT_APP_SUPABASE_ANON_KEY` | زمان build | همان دو مقدار. با این‌ها ورود ورزشکار فعال می‌شود و مربی برای هر کسی که کلید خودش را ندارد از پروکسی استفاده می‌کند. |
| `REACT_APP_COACH_PROXY` | زمان build، اختیاری | مقدار `1` همه‌ی پیام‌های مربی را از پروکسی می‌فرستد، حتی برای کسی که کلید خودش را ذخیره کرده، و فیلد کلید از تنظیمات مربی حذف می‌شود. باز هم به متغیرهای Supabase نیاز دارد، چون پروکسی ورزشکارِ واردشده می‌خواهد. |

اگر `SUPABASE_URL` یا `SUPABASE_ANON_KEY` نباشد، تابع از جفت `REACT_APP_` استفاده
می‌کند. اگر `ANTHROPIC_API_KEY` نباشد، پاسخ `500 {"error":"server"}` می‌دهد و در
لاگ می‌نویسد کدام متغیر کم است.

پیشنهاد برای `vercel.json` (فایلش مال کس دیگری است، برای همین این‌جا اضافه نشد):

```json
{ "functions": { "api/coach.js": { "supportsCancellation": true } } }
```

با `supportsCancellation`، وقتی ورزشکار «توقف» را می‌زند یا تب را می‌بندد،
درخواست Claude و هزینه‌اش هم متوقف می‌شود. بدون آن، پاسخ روی سرور تا آخر ادامه
پیدا می‌کند.

### آزمایش محلی با `vercel dev`

۱. `npm install` و یک بار `npx vercel link` تا پوشه به پروژه وصل شود.

۲. متغیرهای بالا را به محیط **Development** پروژه اضافه کن
(`npx vercel env add ANTHROPIC_API_KEY development` و بقیه). خود `vercel dev`
آن‌ها را بارگذاری می‌کند و به `vercel env pull` نیازی نیست.

۳. `npx vercel dev` برنامه و `/api/coach` را با هم روی http://localhost:3000
بالا می‌آورد. `npm start` به‌تنهایی `/api` ندارد.

۴. وارد شو، به «مربی» برو و تنظیمات را باز کن. باید «متصل از طریق فیت‌کلاب»
را ببینی. یک پیام بفرست.

۵. بررسی سریع از ترمینال:
   - `curl -i localhost:3000/api/coach` پاسخ `405` می‌دهد.
   - `curl -i -X POST localhost:3000/api/coach` پاسخ `401 {"error":"auth"}` می‌دهد.
   - با توکن واقعی (در localStorage مرورگر زیر `sb-<project-ref>-auth-token`،
     فیلد `access_token`)، دستور `curl -N` بخش انگلیسی چند فریم `event: text`
     و در پایان `event: done` برمی‌گرداند.

تست‌های واحد (`npm run test:unit`، فایل `tests/coach-proxy.test.mjs`) تابع را با
یک استریم ساختگی آنتروپیک و یک بررسی‌کننده‌ی ساختگی ورود اجرا می‌کنند و به هیچ
کلیدی نیاز ندارند.

### محدودیت‌ها

حداکثر ۲۰ پیام، ۴۸٬۰۰۰ نویسه برای پرامپت سیستم و پیام‌ها روی هم، و بدنه‌ی ۲۵۶
کیلوبایتی. کلاینت پیش از ارسال، قدیمی‌ترین نوبت‌ها را کنار می‌گذارد تا در این
سقف جا شود. هر ورزشکار در هر ۱۰ دقیقه ۲۰ پاسخ می‌گیرد. این شمارش در حافظه‌ی هر
نمونه‌ی تابع نگه داشته می‌شود، پس دقیق نیست: نمونه‌های جدا جداگانه می‌شمارند و
شروع سرد شمارش را صفر می‌کند.
