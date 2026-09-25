import React, { useState } from "react";
import { Check, Copy, Gift } from "lucide-react";
import { Button, Card, IconWell, Label, Screen, TopBar, num } from "../../components/ui/kit";

// Wallet: the XP balance on the ink hero, then the referral code to share.

const COPY = {
  en: {
    title: "Wallet & Rewards", balance: "Your Reward Balance", xp: "XP", worth: "Equivalent to $4.50 credit towards subscription",
    referral: "Your Referral Code", referralBody: "Earn +100 bonus XP for every friend who joins!", copy: "Copy", copied: "Copied",
  },
  fa: {
    title: "کیف پول و امتیازها", balance: "موجودی امتیازهای شما", xp: "امتیاز", worth: "معادل ۴۵,۰۰۰ تومان اعتبار تخفیف خرید اشتراک",
    referral: "کد دعوت اختصاصی شما", referralBody: "با دعوت هر دوست، ۱۰۰ امتیاز رایگان هدیه بگیرید!", copy: "کپی", copied: "کپی شد",
  },
};

export default function WalletPage({ onBack, isRtl }) {
  const [copied, setCopied] = useState(false);
  const referralCode = "FIT-ISAAC-2026";
  const c = COPY[isRtl ? "fa" : "en"];

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Screen isRtl={isRtl}>
      <TopBar isRtl={isRtl} onBack={onBack} title={c.title} />

      <Card tone="hero" className="flex flex-col gap-3">
        <Label className="!text-hero-muted">{c.balance}</Label>
        <span className="flex items-baseline gap-2">
          <span className="font-display font-extrabold text-[64px] leading-[0.85] tracking-[-0.05em]">{num(450, isRtl)}</span>
          <span className="text-lg font-bold text-accent">{c.xp}</span>
        </span>
        <p className="m-0 text-sm text-hero-muted">{c.worth}</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <IconWell tone="accent" size={40}><Gift className="w-5 h-5" strokeWidth={2} /></IconWell>
          <h2 className="m-0 text-[17px] font-bold">{c.referral}</h2>
        </div>
        <p className="m-0 text-sm text-muted">{c.referralBody}</p>
        <div className="flex items-center gap-2 pt-1" dir="ltr">
          <span className="flex-1 min-w-0 h-12 rounded-2xl bg-sunk flex items-center justify-center font-mono font-semibold text-[15px] tracking-[0.06em] text-ink truncate">
            {referralCode}
          </span>
          <Button tone="ink" onClick={handleCopy} className="min-w-[104px]"
            icon={copied ? <Check className="w-4 h-4 text-accent dark:text-on-inv" strokeWidth={2.6} /> : <Copy className="w-4 h-4" strokeWidth={2} />}>
            <span dir={isRtl ? "rtl" : "ltr"}>{copied ? c.copied : c.copy}</span>
          </Button>
        </div>
      </Card>
    </Screen>
  );
}
