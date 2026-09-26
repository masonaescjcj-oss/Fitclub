# Importing the liftmanual exercise library

FitClub reads an optional catalog, `public/exercises/catalog.json`, when the app starts. If the file is there, its exercises join the 51 built-ins: they show up in Train, in Exercises and in the program builder, with their GIFs, instructions and a "View on liftmanual" link. Without the file, the app works exactly as before. Adding the library takes no code changes.

## What you provide

1. **A data file**, as CSV (from a spreadsheet), TSV or JSON. Put one exercise on each row. Columns can come in any order and any case. The importer ignores columns it doesn't know.

   | Column (any of these names) | Example | Needed |
   |---|---|---|
   | `Name` | Heel Glute Bridge | yes |
   | `Muscle Group` | Glutes, Hamstrings | yes |
   | `Equipment Required` | Bodyweight | recommended |
   | `URL` or `Slug` | https://liftmanual.com/heel-glute-bridge/ | recommended |
   | `Type` | Strength / Cardio / Stretches | no; it is guessed |
   | `Instructions` | one step per line (numbers are removed) | no |
   | `Benefits`, `Muscles Worked` | one item per line | no |
   | `Variations & Alternatives` | Barbell Glute Bridge, Glute Bridge March | no |
   | `Description` | one paragraph | no |
   | `Name FA`, `Instructions FA`, `Benefits FA`, `Description FA` | Persian text | no; English is shown instead |
   | `Mode` | reps / time / distance | no; stretches and cardio default to time |
   | `GIF`, `WebP`, `MP4`, `Image` | a file name or a full URL | no; files are matched by slug |

   Muscle and equipment names must be one of liftmanual's 25 muscle groups and 19 equipment types. Case, spaces, hyphens and plurals don't matter, and common aliases work too: "Lats", "Quads", "Dumbbells", "EZ Bar", "TRX".

   The slug is taken from `Slug`, else from the URL, else from the name.

   `scripts/sample-exercises.csv` is a three-row example.

2. **A media folder** (optional), with files named by slug, in any sub-folders:
   - `heel-glute-bridge.gif`: the animation
   - `.webp` / `.mp4`: optional lighter formats
   - `.jpg` / `.png`: an optional still poster, shown while the animation loads and in list rows

   WordPress size copies such as `-300x300` are used only when there is no original.

## Running it

```sh
# 1. Check only: read everything, print the report, write nothing
node scripts/import-exercises.mjs ~/liftmanual/exercises.csv --media ~/liftmanual/gifs --dry-run

# 2. Fix what the report lists, then install into the app
node scripts/import-exercises.mjs ~/liftmanual/exercises.csv --media ~/liftmanual/gifs --out public/exercises
```

The report lists:
- **Errors.** The row is skipped. Examples: an unknown muscle or equipment name, a duplicate slug, a missing name.
- **Warnings.** The row is kept. Examples: an exercise with no GIF (the app draws a figure instead), and media files that match no exercise.

The exit code is 1 while any error remains. Add `--strict` if you want nothing written until the file is clean.

If you leave out `--out`, the importer writes to a temporary folder, so a trial run never touches the app.

The other options are `--no-copy`, `--media-base <url>` (to serve the media from a CDN) and `--report <file>`. Run `node scripts/import-exercises.mjs --help` for details.

Then commit `public/exercises/` and deploy.

**About size:** everything in `public/` ships with the build. If 1,500 GIFs make the build too heavy, upload the media folder to a CDN and run again with `--no-copy --media-base https://cdn.example.com/exercises/`.

## How the catalog merges

- An exercise whose slug matches a built-in's slug enriches that built-in. It gains the steps, GIF, muscles and link. It keeps its id, names and logging mode, so programs and history stay intact.
- Every other exercise is added, with `id` set to its slug.
- The record format is documented in `src/lib/training/liftmanual.js` (`CatalogExercise`). The merge is in `src/lib/training/catalog.js`.

---

<div dir="rtl">

# وارد کردن کتابخانه‌ی حرکات liftmanual

فیت‌کلاب هنگام باز شدن، اگر فایل `public/exercises/catalog.json` وجود داشته باشد آن را می‌خواند. حرکات این فایل به ۵۱ حرکت داخلی برنامه اضافه می‌شوند و همراه با گیف، روش اجرا و لینک «دیدن در liftmanual» در بخش «تمرین ← حرکات» و سازنده‌ی برنامه نمایش داده می‌شوند. اگر فایل نباشد، برنامه دقیقاً مثل قبل کار می‌کند. برای این کار هیچ تغییری در کد لازم نیست.

## آنچه شما آماده می‌کنید

۱. **فایل داده**: از نوع CSV (خروجی اکسل یا گوگل‌شیت)، TSV یا JSON، با یک حرکت در هر ردیف.
- ترتیب و بزرگی و کوچکی حروف نام ستون‌ها مهم نیست.
- ستون‌های ناشناخته نادیده گرفته می‌شوند.
- نام ستون‌ها همان عنوان‌های سایت است:
  - `Name` (الزامی)
  - `Muscle Group` (الزامی)
  - `Equipment Required`
  - `URL` یا `Slug`
  - `Type`
  - `Instructions` (هر مرحله در یک خط)
  - `Benefits`
  - `Muscles Worked`
  - `Variations & Alternatives`
  - `Description`
  - `Mode`
  - `GIF`
- برای متن فارسی این ستون‌ها را اضافه کنید: `Name FA`، `Instructions FA`، `Benefits FA` و `Description FA`. اگر نباشند، متن انگلیسی نمایش داده می‌شود.
- نام عضله و تجهیزات باید یکی از ۲۵ گروه عضلانی و ۱۹ نوع تجهیزات liftmanual باشد. بزرگی و کوچکی حروف، فاصله و جمع بودن نام مهم نیست.
- فایل نمونه: `scripts/sample-exercises.csv`

۲. **پوشه‌ی رسانه** (اختیاری):
- هر فایل به نام slug همان حرکت است، مثلاً `heel-glute-bridge.gif`.
- فرمت‌های سبک‌تر `.webp` و `.mp4` هم پذیرفته می‌شوند.
- `.jpg` یا `.png` به‌عنوان تصویر ثابت (پوستر) استفاده می‌شود.

## اجرا

```sh
# ۱. فقط بررسی: همه چیز خوانده و گزارش می‌شود، چیزی نوشته نمی‌شود
node scripts/import-exercises.mjs ~/liftmanual/exercises.csv --media ~/liftmanual/gifs --dry-run

# ۲. پس از رفع خطاها، نصب در برنامه
node scripts/import-exercises.mjs ~/liftmanual/exercises.csv --media ~/liftmanual/gifs --out public/exercises
```

گزارش دو بخش دارد:
- **خطاها**: ردیف کنار گذاشته می‌شود. نمونه‌ها: عضله یا تجهیزات ناشناخته، slug تکراری، نبودن نام.
- **هشدارها**: ردیف حفظ می‌شود. نمونه‌ها: حرکت بدون گیف (برنامه به جای آن یک طرح می‌کشد) و گیف‌هایی که حرکتی ندارند.

اگر `--out` را ندهید، خروجی در یک پوشه‌ی موقت نوشته می‌شود و برنامه دست نمی‌خورد.

پس از نصب، پوشه‌ی `public/exercises/` را commit و منتشر کنید. اگر حجم ۱۵۰۰ گیف برای build زیاد است، آن‌ها را روی CDN بگذارید و این‌طور اجرا کنید:

```sh
node scripts/import-exercises.mjs ~/liftmanual/exercises.csv --media ~/liftmanual/gifs --no-copy --media-base https://cdn.example.com/exercises/ --out public/exercises
```

## قاعده‌ی ادغام

- حرکتی که slug آن با یک حرکت داخلی یکی است، اطلاعات همان حرکت را کامل می‌کند. شناسه، نام‌ها و نوع ثبت آن حرکت حفظ می‌شود، پس برنامه‌ها و سابقه‌ی تمرین سالم می‌مانند.
- بقیه‌ی حرکات با شناسه‌ای برابر slug اضافه می‌شوند.

</div>

## The whole liftmanual.com library

The app's library is liftmanual.com itself: every strength, cardio and stretching exercise on the site (3,432 in September 2026), with its animation, steps, benefits, muscles worked and alternatives, and a Persian name for each. Refreshing it after the site changes takes four steps:

```sh
# 1. Read the site (the REST API for the list, each page for its text). Resumable.
node scripts/crawl-liftmanual.mjs data/liftmanual

# 2. Turn each animation into a small MP4 and a still poster (needs sharp and ffmpeg)
npm i --no-save sharp
FFMPEG=/path/to/ffmpeg node scripts/liftmanual-media.mjs data/liftmanual/exercises.json --out data/liftmanual

# 3. Upload data/liftmanual/media/ to the public fitclub-exercises bucket
#    (supabase/migrations/0013). Only an account listed in fitclub_media_uploaders may
#    upload; add the import account there for the upload and take it off afterwards.

# 4. Build the app's catalog from it
node scripts/build-liftmanual.mjs data/liftmanual/exercises.json --media data/liftmanual/media \
  --media-base https://<project>.supabase.co/storage/v1/object/public/fitclub-exercises/ \
  --names-fa scripts/data/liftmanual-names-fa.json
```

Step 4 writes `public/exercises/catalog.json`, the list the app loads at start-up (about 75 KB compressed), and `public/exercises/details/00.json` to `63.json`, the long text, which the app fetches only when an exercise is opened. Commit both and deploy. `data/liftmanual/` stays out of git.

An animated WebP of about 180 KB becomes an MP4 of about 25 KB that looks the same, so the whole library's media is about 90 MB.

`scripts/data/liftmanual-names-fa.json` holds the Persian names, by slug. A new exercise on the site shows its English name until it gets a line there.
