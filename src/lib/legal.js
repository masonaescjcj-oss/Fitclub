// The privacy policy and terms of use, in English and Persian. They describe
// what the app actually does today; update them in the same change as any
// feature that alters what is collected, where it goes, or who sees it.
// Both are drafts until reviewed by a lawyer; the page says so.

export const LEGAL_UPDATED = { en: "25 September 2026", fa: "۳ مهر ۱۴۰۵" };

// Filled in before launch; the pages say so where they would be used.
const CONTACT = {
  en: "the support address published on this page before launch",
  fa: "نشانی پشتیبانی که پیش از راه‌اندازی در همین صفحه منتشر می‌شود",
};

export const LEGAL = {
  privacy: {
    en: {
      title: "Privacy policy",
      lead: "FitClub keeps your fitness data so the app, your devices and your coach can use it. It is not sold, and it is not used for advertising.",
      sections: [
        {
          h: "What we keep",
          p: [
            "Your account: your email address and a password. The password is handled by our sign-in provider and stored only as a secure hash; we never see it.",
            "Your profile: name, username, bio, photo and app language.",
            "What you enter: workouts and sets, your food diary, water and weigh-ins, your nutrition profile (age, sex, height, weight, goal, activity), checklists, and your conversations with the coach.",
            "A random ID for each device you use, so your devices can stay in sync.",
            "What you share with others: messages and photos you send in chats, the groups and channels you are in, shared checklists and your ticks in them, when you were last online, and for the leaderboards a daily count of your workouts, records, perfect checklist days and days with food logged, with your streak.",
            "Error reports: when the app hits an error it didn't expect, it sends the error message, the page, your browser and the app version, with your account ID if you are signed in. Email addresses and sign-in links are removed first, and reports are deleted after 30 days.",
          ],
        },
        {
          h: "How we use it",
          p: [
            "To run the app for you: show your plan and progress, keep one account the same on every device, and let the coach answer about your real day.",
            "To keep the service safe and working: stopping abuse, fixing errors, and limiting how often the coach can be called.",
          ],
        },
        {
          h: "The AI coach",
          p: [
            "When you message the coach, your message, the recent conversation and the areas you chose to share (nutrition, training, habits) are sent to an AI provider to write the reply. Today that is You.com; it may be Anthropic. You can switch any area off in the coach's settings.",
            "If you add your own Anthropic API key, your messages go straight from your device to Anthropic, and the key stays on your device.",
            "The coach can be wrong. It is not medical advice.",
          ],
        },
        {
          h: "Who we share it with",
          p: [
            "Only the services that run FitClub: Supabase (sign-in, database and photo storage), Vercel (hosting and the coach's server), and the AI provider above for coach replies. They process data for us under their own terms and security; their servers may be outside your country. When you scan a barcode, only its number goes to Open Food Facts (openfoodfacts.org) to find the product; the camera picture never leaves your phone.",
            "Other FitClub members can see your name, username, bio and photo once they are signed in. Messages and photos you send in a chat are seen by that chat's members, and a shared checklist, its tasks and everyone's ticks by the people in it; people you chat with see when you were last online. On the leaderboards, people you share a chat or a list with see your XP, workout count and streak, and so does everyone signed in if you join the global board; challenges show your count to the chat they are in. Everything else you enter is visible only to you.",
            "We share data with authorities only when the law requires it.",
          ],
        },
        {
          h: "On your device",
          p: ["The app keeps a copy of your data in your browser so it opens fast and works offline. Signing out removes it from that device."],
        },
        {
          h: "Keeping and deleting",
          p: [
            "Your data is kept while your account exists. You can delete entries, lists, coach conversations, the messages and photos you sent, and the chats and lists you own in the app at any time.",
            `To delete your account and everything in it, write to ${CONTACT.en}. We delete it within 30 days.`,
          ],
        },
        {
          h: "Security",
          p: ["Connections are encrypted (HTTPS). The database only lets each account read its own data and what others shared with it, and provider keys stay on the server."],
        },
        {
          h: "Children",
          p: ["FitClub is not meant for children under 13."],
        },
        {
          h: "Changes and contact",
          p: [
            "When this policy changes, the date above changes too, and we tell you in the app about anything important.",
            `Questions or requests: ${CONTACT.en}.`,
          ],
        },
      ],
    },
    fa: {
      title: "حریم خصوصی",
      lead: "فیت‌کلاب داده‌های ورزشی‌ات را نگه می‌دارد تا اپ، دستگاه‌هایت و مربی بتوانند از آن استفاده کنند. این داده‌ها فروخته نمی‌شوند و برای تبلیغات به کار نمی‌روند.",
      sections: [
        {
          h: "چه چیزهایی نگه می‌داریم",
          p: [
            "حساب کاربری: نشانی ایمیل و رمز عبور. رمز را سرویس ورود ما فقط به شکل رمزنگاری‌شده نگه می‌دارد و ما هرگز آن را نمی‌بینیم.",
            "پروفایل: نام، نام کاربری، بیو، عکس و زبان اپ.",
            "چیزهایی که خودت وارد می‌کنی: تمرین‌ها و ست‌ها، دفتر غذا، آب و وزن، پروفایل تغذیه (سن، جنسیت، قد، وزن، هدف، میزان فعالیت)، چک‌لیست‌ها و گفتگوهایت با مربی.",
            "یک شناسه‌ی تصادفی برای هر دستگاهی که استفاده می‌کنی، تا دستگاه‌هایت با هم هماهنگ بمانند.",
            "چیزهایی که با دیگران به اشتراک می‌گذاری: پیام‌ها و عکس‌هایی که در چت‌ها می‌فرستی، گروه‌ها و کانال‌هایی که عضوشان هستی، چک‌لیست‌های مشترک و تیک‌هایت در آن‌ها، آخرین زمانی که آنلاین بوده‌ای، و برای جدول رتبه‌بندی شمار روزانه‌ی تمرین‌ها، رکوردها، روزهای کامل چک‌لیست و روزهای ثبت غذا به همراه استریکت.",
            "گزارش خطا: وقتی اپ به خطای پیش‌بینی‌نشده‌ای بخورد، متن خطا، صفحه، مرورگر و نسخه‌ی اپ را می‌فرستد و اگر وارد حساب شده باشی شناسه‌ی حسابت را. نشانی‌های ایمیل و لینک‌های ورود پیش از فرستادن پاک می‌شوند و گزارش‌ها بعد از ۳۰ روز حذف می‌شوند.",
          ],
        },
        {
          h: "برای چه استفاده می‌کنیم",
          p: [
            "برای کار کردن اپ: نشان دادن برنامه و پیشرفتت، یکی نگه داشتن حساب روی همه‌ی دستگاه‌ها، و این‌که مربی درباره‌ی روز واقعی‌ات جواب بدهد.",
            "برای امن و سالم نگه داشتن سرویس: جلوگیری از سوءاستفاده، رفع خطاها، و محدود کردن تعداد درخواست‌ها به مربی.",
          ],
        },
        {
          h: "مربی هوش مصنوعی",
          p: [
            "وقتی به مربی پیام می‌دهی، پیامت، گفتگوی اخیر و بخش‌هایی که اجازه داده‌ای (تغذیه، تمرین، عادت‌ها) برای نوشتن جواب به یک سرویس هوش مصنوعی فرستاده می‌شود. الان این سرویس You.com است و ممکن است Anthropic باشد. هر بخش را می‌توانی در تنظیمات مربی خاموش کنی.",
            "اگر کلید API آنتروپیک خودت را وارد کنی، پیام‌ها مستقیم از دستگاهت به آنتروپیک می‌رود و کلید روی دستگاهت می‌ماند.",
            "مربی ممکن است اشتباه کند. حرف‌هایش توصیه‌ی پزشکی نیست.",
          ],
        },
        {
          h: "با چه کسانی به اشتراک می‌گذاریم",
          p: [
            "فقط با سرویس‌هایی که فیت‌کلاب روی آن‌ها کار می‌کند: Supabase (ورود، دیتابیس و نگهداری عکس)، Vercel (میزبانی اپ و سرور مربی) و سرویس هوش مصنوعی بالا برای جواب‌های مربی. این سرویس‌ها طبق شرایط و امنیت خودشان داده را برای ما پردازش می‌کنند و ممکن است سرورهایشان خارج از کشور تو باشد. وقتی بارکدی را اسکن می‌کنی، فقط شماره‌اش برای پیدا کردن محصول به Open Food Facts (openfoodfacts.org) فرستاده می‌شود؛ تصویر دوربین هرگز از گوشی‌ات بیرون نمی‌رود.
            "اعضای دیگر فیت‌کلاب بعد از ورود، نام، نام کاربری، بیو و عکست را می‌بینند. پیام‌ها و عکس‌هایی که در یک چت می‌فرستی را اعضای همان چت می‌بینند، و یک چک‌لیست مشترک، کارهایش و تیک همه را اعضای همان چک‌لیست؛ کسانی که با آن‌ها چت می‌کنی آخرین زمان آنلاین بودنت را می‌بینند. در جدول رتبه‌بندی، کسانی که با آن‌ها چت یا چک‌لیست مشترک داری امتیاز، شمار تمرین و استریکت را می‌بینند، و اگر به جدول جهانی بپیوندی همه‌ی کاربران وارد شده هم؛ چالش‌ها شمار تو را به اعضای همان چت نشان می‌دهند. بقیه‌ی چیزهایی که وارد می‌کنی فقط برای خودت دیده می‌شود.",
            "داده را فقط وقتی قانون ملزم کند در اختیار مراجع قانونی می‌گذاریم.",
          ],
        },
        {
          h: "روی دستگاه خودت",
          p: ["اپ یک نسخه از داده‌هایت را در مرورگرت نگه می‌دارد تا سریع باز شود و بدون اینترنت هم کار کند. با خروج از حساب، این نسخه از آن دستگاه پاک می‌شود."],
        },
        {
          h: "نگهداری و پاک کردن",
          p: [
            "داده‌هایت تا وقتی حسابت هست نگه داشته می‌شود. هر وقت بخواهی می‌توانی ثبت‌ها، لیست‌ها، گفتگوهای مربی، پیام‌ها و عکس‌هایی که فرستاده‌ای، و چت‌ها و لیست‌هایی که ساخته‌ای را در خود اپ پاک کنی.",
            `برای پاک کردن کامل حساب و همه‌ی داده‌هایش به ${CONTACT.fa} پیام بده. ظرف ۳۰ روز پاک می‌شود.`,
          ],
        },
        {
          h: "امنیت",
          p: ["ارتباط‌ها رمزنگاری‌شده‌اند (HTTPS). دیتابیس به هر حساب فقط اجازه‌ی خواندن داده‌ی خودش و چیزهایی که دیگران با او به اشتراک گذاشته‌اند را می‌دهد و کلیدهای سرویس‌ها روی سرور می‌ماند."],
        },
        {
          h: "کودکان",
          p: ["فیت‌کلاب برای کودکان زیر ۱۳ سال نیست."],
        },
        {
          h: "تغییرات و تماس",
          p: [
            "هر وقت این متن تغییر کند، تاریخ بالای صفحه هم عوض می‌شود و تغییرات مهم را در اپ اطلاع می‌دهیم.",
            `سؤال یا درخواست: ${CONTACT.fa}.`,
          ],
        },
      ],
    },
  },
  terms: {
    en: {
      title: "Terms of use",
      lead: "By using FitClub you agree to these terms. Please read the health notice first.",
      sections: [
        {
          h: "Health notice",
          p: [
            "FitClub, its plans and its AI coach give general fitness and nutrition guidance. They are not medical advice and don't replace a doctor, dietitian or physiotherapist.",
            "Check with a doctor before starting a new program, especially if you are pregnant, injured, have a medical condition or take medication. Stop if something hurts.",
            "You train at your own risk.",
          ],
        },
        {
          h: "Your account",
          p: ["You need to be 13 or older. Give accurate details, keep your password to yourself, and use one account per person. Your username must not pretend to be someone else."],
        },
        {
          h: "Using FitClub fairly",
          p: ["Don't harass or threaten anyone, post illegal, hateful or sexual content, spam, or try to break, overload or get around the app's security. We may remove content or suspend accounts that do."],
        },
        {
          h: "Your content",
          p: ["What you create stays yours. You let FitClub store and process it only to run the service for you, and to show your public profile (name, username, bio, photo) to other members."],
        },
        {
          h: "The AI coach",
          p: ["The coach's answers are written by an AI model from your data. They can be incomplete or wrong. Use your own judgement, and never rely on them for a medical decision."],
        },
        {
          h: "Exercise library",
          p: ["Exercise guides come from Lift Manual (liftmanual.com), used with permission. Don't copy them out of the app."],
        },
        {
          h: "Paid plans",
          p: ["FitClub Pro isn't on sale yet. Its price, billing, renewal and refund terms will be added here before anyone can pay."],
        },
        {
          h: "The service",
          p: ["FitClub is being built and may change. Features can be added, changed or removed, and the service may sometimes be unavailable. We try hard not to lose your data, but keep your own copy of anything you can't lose."],
        },
        {
          h: "Ending",
          p: [`You can stop using FitClub at any time and ask us to delete your account at ${CONTACT.en}. We may close accounts that break these terms.`],
        },
        {
          h: "Liability",
          p: ["As far as the law allows, FitClub is provided as it is, and we are not liable for injuries, losses or damages that come from using it."],
        },
        {
          h: "Changes",
          p: ["When these terms change, the date above changes too. Using FitClub after that means you accept the new terms."],
        },
      ],
    },
    fa: {
      title: "شرایط استفاده",
      lead: "با استفاده از فیت‌کلاب این شرایط را می‌پذیری. لطفاً اول بخش هشدار سلامت را بخوان.",
      sections: [
        {
          h: "هشدار سلامت",
          p: [
            "فیت‌کلاب، برنامه‌هایش و مربی هوش مصنوعی راهنمایی عمومی ورزش و تغذیه می‌دهند. این راهنمایی توصیه‌ی پزشکی نیست و جای پزشک، متخصص تغذیه یا فیزیوتراپ را نمی‌گیرد.",
            "پیش از شروع برنامه‌ی تازه با پزشک مشورت کن، به‌خصوص اگر باردار هستی، آسیب‌دیدگی یا بیماری داری یا دارو مصرف می‌کنی. اگر جایی درد گرفت، دست نگه دار.",
            "مسئولیت تمرین با خودت است.",
          ],
        },
        {
          h: "حساب کاربری",
          p: ["باید دست‌کم ۱۳ سال داشته باشی. اطلاعات درست وارد کن، رمزت را به کسی نده و برای هر نفر فقط یک حساب بساز. نام کاربری‌ات نباید خودش را جای کس دیگری جا بزند."],
        },
        {
          h: "استفاده‌ی منصفانه",
          p: ["کسی را آزار نده یا تهدید نکن، محتوای غیرقانونی، نفرت‌پراکن یا جنسی نفرست، اسپم نکن و برای خراب کردن، بیش از حد بار گذاشتن یا دور زدن امنیت اپ تلاش نکن. ممکن است چنین محتوایی را پاک کنیم یا حساب را معلق کنیم."],
        },
        {
          h: "محتوای تو",
          p: ["هر چه می‌سازی مال خودت است. فقط به فیت‌کلاب اجازه می‌دهی آن را برای ارائه‌ی سرویس به تو نگه دارد و پردازش کند، و پروفایل عمومی‌ات (نام، نام کاربری، بیو، عکس) را به اعضای دیگر نشان دهد."],
        },
        {
          h: "مربی هوش مصنوعی",
          p: ["جواب‌های مربی را یک مدل هوش مصنوعی از روی داده‌هایت می‌نویسد. ممکن است ناقص یا نادرست باشند. قضاوت خودت را به کار ببر و هرگز برای تصمیم پزشکی به آن‌ها تکیه نکن."],
        },
        {
          h: "کتابخانه‌ی حرکات",
          p: ["راهنمای حرکات از Lift Manual (liftmanual.com) و با اجازه‌ی آن آمده است. آن‌ها را از اپ بیرون کپی نکن."],
        },
        {
          h: "اشتراک پولی",
          p: ["فیت‌کلاب پرو هنوز فروخته نمی‌شود. قیمت، پرداخت، تمدید و شرایط بازگشت پول پیش از این‌که کسی بتواند پرداخت کند در همین‌جا اضافه می‌شود."],
        },
        {
          h: "سرویس",
          p: ["فیت‌کلاب در حال ساخت است و ممکن است تغییر کند. امکانات ممکن است اضافه، عوض یا حذف شوند و سرویس گاهی در دسترس نباشد. همه‌ی تلاشمان را می‌کنیم داده‌ای از دست نرود، اما از چیزهایی که از دست دادنشان برایت مهم است نسخه‌ی خودت را هم نگه دار."],
        },
        {
          h: "پایان استفاده",
          p: [`هر وقت بخواهی می‌توانی استفاده از فیت‌کلاب را کنار بگذاری و با ${CONTACT.fa} پاک شدن حسابت را بخواهی. ممکن است حساب‌هایی را که این شرایط را زیر پا بگذارند ببندیم.`],
        },
        {
          h: "مسئولیت",
          p: ["تا جایی که قانون اجازه می‌دهد، فیت‌کلاب همان‌طور که هست ارائه می‌شود و ما مسئول آسیب، زیان یا خسارتی که از استفاده‌ی آن پیش بیاید نیستیم."],
        },
        {
          h: "تغییرات",
          p: ["هر وقت این شرایط تغییر کند، تاریخ بالای صفحه هم عوض می‌شود. ادامه‌ی استفاده از فیت‌کلاب بعد از آن یعنی شرایط تازه را پذیرفته‌ای."],
        },
      ],
    },
  },
};

/** The legal page a URL path asks for: "/privacy" or "/terms", otherwise null. */
export function legalFromPath(path) {
  const clean = String(path || "").replace(/\/+$/, "").toLowerCase();
  if (clean === "/privacy") return "privacy";
  if (clean === "/terms") return "terms";
  return null;
}
