# راه‌اندازی Supabase و Vercel · Supabase and Vercel setup

Without these settings FitClub runs in **demo mode**: everything stays in the
browser, exactly as before. With them it gets real accounts, and one account
shows the same data on every device.

بدون این تنظیمات FitClub در **حالت نمایشی** اجرا می‌شود و همه‌چیز در مرورگر
می‌ماند. با آن‌ها حساب کاربری واقعی دارد و یک حساب روی همه‌ی دستگاه‌ها یکی است.

## 1. Supabase

FitClub can share a Supabase project with other apps. Everything it owns is
set apart and named after it, so the other apps are never touched:

- tables and functions live in the **`fitclub` schema**, never `public`;
- photos go to the **`fitclub-avatars`** bucket, and every storage policy is
  named `fitclub: …` and names that bucket;
- nothing is added to `auth.users` (no trigger). A FitClub account carries
  `app: "fitclub"` in its user metadata, and the app creates its own profile
  row on first sign-in;
- shared auth settings (email templates, Site URL, providers) are left alone.

FitClub می‌تواند با اپ‌های دیگر در یک پروژه‌ی Supabase باشد. همه‌چیزش در schema
جداگانه‌ی `fitclub` و bucket `fitclub-avatars` است و به تنظیمات مشترک ورود
دست نمی‌زند.

1. **Project Settings → API**: copy the **Project URL** and the **publishable
   (anon)** key. Never use the `service_role` / secret key in the app.
   آدرس پروژه و کلید publishable را بردارید. کلید secret/service_role هرگز در
   اپ قرار نگیرد.
2. **SQL Editor**: paste and run every file in `supabase/migrations/`, in
   order. They are safe to run again.
   فایل‌های پوشه‌ی `supabase/migrations/` را به ترتیب اجرا کنید؛ اجرای دوباره
   مشکلی ندارد.
3. **Project Settings → Data API → Exposed schemas**: add `fitclub`, keeping
   the schemas already listed.
   در Exposed schemas، `fitclub` را کنار بقیه اضافه کنید.
4. **Email confirmation** is a project-wide setting. With *Confirm email* off,
   sign-up opens the account at once. With it on, the app asks for the 6-digit
   code, so the **Confirm signup** template must contain `{{ .Token }}`. Other
   apps in the project get the same email.
5. **Authentication → URL Configuration**: add the FitClub domain (and
   `http://localhost:3000/**`) to *Redirect URLs* without removing the others.
   Password-reset links come back here. Leave *Site URL* as it is if another
   app owns it.
6. **Google sign-in** (optional): create an OAuth client in Google Cloud and
   paste its id and secret in **Providers → Google**. The authorised redirect
   URI is `https://<project-ref>.supabase.co/auth/v1/callback`. Then set
   `REACT_APP_AUTH_PROVIDERS=google`.
7. **Custom SMTP** (recommended before launch): Supabase's built-in mailer
   sends only a few emails an hour. Set your own under **Project Settings →
   Authentication → SMTP**.

## 2. Vercel

**Project Settings → Environment Variables**, for Production and Preview:

| Name | Value |
| --- | --- |
| `REACT_APP_SUPABASE_URL` | the Project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | the anon key |
| `REACT_APP_AUTH_PROVIDERS` | empty for email only, or `google` once Google is enabled in Supabase |

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
| `fitclub.profiles` | username, name, bio, photo, language, onboarded | signed-in people |
| `fitclub.user_state` | training, diary, nutrition profile, checklists, coach history, inbox read state (one JSON per key) | only its owner |
| `fitclub-avatars` bucket | profile photos, at `<user id>/…` | anyone; only the owner writes |

The coach's own API key, when someone uses one, never leaves their device.
The messenger and shared group checklists move to their own tables in a
following migration.

## 4. Checking it locally

```
cp .env.example .env.local   # fill in the two REACT_APP_SUPABASE_* values
npm start
npm run test:unit            # includes the schema's row-level-security tests
```
