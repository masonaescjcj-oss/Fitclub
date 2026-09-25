// What each account error code from account.js says to the athlete.

const MESSAGES = {
  en: {
    exists: "An account with this email already exists. Log in instead.",
    invalid: "Email or password is wrong.",
    unconfirmed: "Confirm your email first: enter the code we sent.",
    weak: "Pick a stronger password.",
    code: "That code is wrong or has expired. Ask for a new one.",
    rate: "Too many tries. Wait a minute and try again.",
    network: "No connection. Check the internet and try again.",
    taken: "That username is taken.",
    offline: "Accounts aren't connected in this build.",
    unknown: "Something went wrong. Try again.",
  },
  fa: {
    exists: "حسابی با این ایمیل وجود دارد. وارد شوید.",
    invalid: "ایمیل یا رمز عبور اشتباه است.",
    unconfirmed: "اول ایمیل را تأیید کنید: کدی را که فرستادیم وارد کنید.",
    weak: "رمز قوی‌تری انتخاب کنید.",
    code: "کد اشتباه است یا منقضی شده. کد تازه بگیرید.",
    rate: "تلاش‌ها زیاد شد. یک دقیقه صبر کنید و دوباره امتحان کنید.",
    network: "اتصال برقرار نیست. اینترنت را بررسی کنید.",
    taken: "این نام کاربری گرفته شده است.",
    offline: "حساب‌های کاربری در این نسخه وصل نیستند.",
    unknown: "مشکلی پیش آمد. دوباره امتحان کنید.",
  },
};

export const authMessage = (code, isRtl) => {
  const lang = MESSAGES[isRtl ? "fa" : "en"];
  return lang[code] || lang.unknown;
};
