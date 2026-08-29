import React, { useState } from "react";
import { Wallet, ArrowLeft, Copy, Check, Gift } from "lucide-react";

export default function WalletPage({ onBack, isRtl }) {
  const [copied, setCopied] = useState(false);
  const referralCode = "FIT-ISAAC-2026";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full min-h-[100dvh] bg-black text-white px-4 pt-6 pb-28 space-y-6 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-[#141416] border border-white/10 flex items-center justify-center text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
          <h1 className="text-xl font-black text-white">{isRtl ? "کیف پول و امتیازها" : "Wallet & Rewards"}</h1>
        </div>
        <Wallet className="w-6 h-6 text-purple-400" />
      </div>

      {/* Balance Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-900/80 via-[#844783] to-purple-950 border border-white/20 text-center space-y-2 shadow-xl">
        <span className="text-xs text-purple-200 font-bold uppercase">{isRtl ? "موجودی امتیازهای شما" : "Your Reward Balance"}</span>
        <h2 className="text-4xl font-black text-white tracking-tight" dir="ltr">
          450 <span className="text-lg text-amber-300">XP</span>
        </h2>
        <p className="text-xs text-neutral-200 font-medium">
          {isRtl ? "معادل ۴۵,۰۰۰ تومان اعتبار تخفیف خرید اشتراک" : "Equivalent to $4.50 credit towards subscription"}
        </p>
      </div>

      {/* Referral Link Box */}
      <div className="p-5 rounded-3xl bg-[#141416] border border-white/10 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-black text-white">{isRtl ? "کد دعوت اختصاصی شما" : "Your Referral Code"}</h3>
        </div>
        <p className="text-xs text-neutral-400 font-medium">
          {isRtl ? "با دعوت هر دوست، ۱۰۰ امتیاز رایگان هدیه بگیرید!" : "Earn +100 bonus XP for every friend who joins!"}
        </p>

        <div className="flex items-center gap-2 pt-1" dir="ltr">
          <div className="flex-grow p-3 rounded-2xl bg-black border border-white/15 text-center font-mono font-black text-amber-300 tracking-wider text-sm">
            {referralCode}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="h-11 px-4 bg-[#844783] hover:bg-[#965595] text-white rounded-2xl font-black text-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? (isRtl ? "کپی شد" : "Copied") : (isRtl ? "کپی" : "Copy")}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
