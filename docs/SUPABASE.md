# راه‌اندازی Supabase و Vercel · Supabase and Vercel setup

Without these settings FitClub runs in **demo mode**: everything stays in the
browser, exactly as before. With them it gets real accounts, and one account
shows the same data on every device.

بدون این تنظیمات FitClub در **حالت نمایشی** اجرا می‌شود و همه‌چیز در مرورگر
می‌ماند. با آن‌ها حساب کاربری واقعی دارد و یک حساب روی همه‌ی دستگاه‌ها یکی است.

## 1. Supabase

1. **Project Settings → API**: copy the **Project URL** and the **anon public**
   key. Never use the `service_role` key in the app.
   آدرس پروژه و کلید anon را بردارید. کلید service_role هرگز در اپ قرار نگیرد.
2. **SQL Editor**: paste and run every file in `supabase/migrations/`, in
   order. They are safe to run again.
   فایل‌های پوشه‌ی `supabase/migrations/` را به ترتیب اجرا کنید؛ اجرای دوباره
   مشکلی ندارد.
3. **Authentication → Providers → Email**: keep *Confirm email* on.
4. **Authentication → Email Templates → Confirm signup**: the app asks for the
   6-digit code, so the email must show it. Put `{{ .Token }}` in the body,
   e.g. `کد تأیید FitClub: {{ .Token }}` / `Your FitClub code: {{ .Token }}`.
   اپ کد ۶ رقمی را می‌خواهد؛ در قالب ایمیل تأیید `{{ .Token }}` را بگذارید.
5. **Authentication → URL Configuration**: *Site URL* = your Vercel domain;
   add it and `http://localhost:3000` to *Redirect URLs*. Password-reset and
   Google sign-in come back here.
6. **Google sign-in** (optional): create an OAuth client in Google Cloud and
   paste its id and secret in **Providers → Google**. The authorised redirect
   URI is `https://<project-ref>.supabase.co/auth/v1/callback`.
7. **Custom SMTP** (recommended before launch): Supabase's built-in mailer
   sends only a few emails an hour. Set your own under **Project Settings →
   Authentication → SMTP**.

## 2. Vercel

**Project Settings → Environment Variables**, for Production and Preview:

| Name | Value |
| --- | --- |
| `REACT_APP_SUPABASE_URL` | the Project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | the anon key |
| `REACT_APP_AUTH_PROVIDERS` | `google` (or empty for email only) |

The coach proxy's server-side variables are listed in `docs/COACH-PROXY.md`.
`vercel.json` already sets the build (`npm run build` → `build/`), the
offline worker's headers, and the `/api` functions.

After changing a `REACT_APP_` variable, redeploy: they are baked in at
build time.
بعد از تغییر هر متغیر `REACT_APP_` دوباره deploy کنید؛ این مقادیر هنگام build
داخل اپ قرار می‌گیرند.

## 3. What's stored where · چه چیزی کجا ذخیره می‌شود

| Table | Holds | Who can read it |
| --- | --- | --- |
| `profiles` | username, name, bio, photo, language, onboarded | signed-in people |
| `user_state` | training, diary, nutrition profile, checklists, coach history, inbox read state (one JSON per key) | only its owner |
| `storage.avatars` | profile photos, at `avatars/<user id>/…` | anyone; only the owner writes |

The coach's own API key, when someone uses one, never leaves their device.
The messenger and shared group checklists move to their own tables in a
following migration.

## 4. Checking it locally

```
cp .env.example .env.local   # fill in the two REACT_APP_SUPABASE_* values
npm start
npm run test:unit            # includes the schema's row-level-security tests
```
