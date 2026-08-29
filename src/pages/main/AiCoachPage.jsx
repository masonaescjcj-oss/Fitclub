import React, { useState } from "react";
import { Brain, Send, Sparkles, Bot, User } from "lucide-react";

export default function AiCoachPage({ isRtl }) {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "ai",
      textEn: "Hello! I am your personal AI Fitness & Nutrition Coach. How can I assist your workout today?",
      textFa: "سلام! من مربی هوشمند هوش مصنوعی شما هستم. چطور می‌توانم در تمرین یا رژیم امروز کمکتان کنم؟",
      time: "09:00 AM",
    },
    {
      id: 2,
      sender: "user",
      textEn: "What should I eat before my chest workout?",
      textFa: "قبل از تمرین سینه چه چیزی بخورم بهتر است؟",
      time: "09:02 AM",
    },
    {
      id: 3,
      sender: "ai",
      textEn: "For chest day, have a light complex carb meal like oats with 1/2 banana and 20g whey protein about 60 minutes before your workout!",
      textFa: "قبل از تمرین سینه، حدود ۶۰ دقیقه قبل از تمرین یک وعده سبک شامل اوتمیل با نصف موز و ۲۰ گرم پروتئین وی مصرف کنید!",
      time: "09:03 AM",
    },
  ]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      textEn: inputMessage,
      textFa: inputMessage,
      time: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          textEn: "Got it! I will analyze your input and update your custom plan accordingly.",
          textFa: "دریافت شد! اطلاعات شما آنالیز شد و برنامه بر اساس آن به‌روزرسانی گردید.",
          time: "Just now",
        },
      ]);
    }, 1000);
  };

  return (
    <div className="w-full min-h-[100dvh] bg-black text-white flex flex-col justify-between pt-6 pb-28 px-4">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#844783] to-[#a356a2] flex items-center justify-center text-white shadow-lg shadow-[#844783]/30">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white leading-tight">
              {isRtl ? "مربی هوشمند AI" : "AI Personal Coach"}
            </h1>
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {isRtl ? "آنلاین و پاسخگو" : "Online & Active"}
            </span>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-[#844783]/20 border border-[#844783]/40 text-[#844783] text-[10px] font-black uppercase flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          GPT-4o
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-grow space-y-4 py-4 overflow-y-auto max-h-[60dvh] my-auto pr-1">
        {messages.map((msg) => {
          const isAi = msg.sender === "ai";
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isAi ? "flex-row" : "flex-row-reverse"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  isAi ? "bg-[#844783] text-white" : "bg-neutral-800 text-neutral-300"
                }`}
              >
                {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[78%] p-3.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed ${
                  isAi
                    ? "bg-[#141416] border border-white/10 text-white rounded-tl-none rtl:rounded-tr-none rtl:rounded-tl-2xl"
                    : "bg-gradient-to-r from-[#844783] to-[#9b4f9a] text-white rounded-tr-none rtl:rounded-tl-none rtl:rounded-tr-2xl shadow-md"
                }`}
              >
                <p>{isRtl ? msg.textFa : msg.textEn}</p>
                <span className="text-[9px] text-neutral-400 block mt-1 text-right rtl:text-left">
                  {msg.time}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message Input Box */}
      <form onSubmit={handleSend} className="relative mt-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={isRtl ? "سوال خود را از مربی هوشمند بپرسید..." : "Ask your AI coach anything..."}
          className="w-full h-14 bg-[#141416] border border-white/15 rounded-full px-5 pr-14 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#844783] transition-colors"
        />
        <button
          type="submit"
          className="absolute right-2 top-2 bottom-2 w-10 bg-[#844783] hover:bg-[#965595] text-white rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 rtl:right-auto rtl:left-2"
        >
          <Send className="w-4 h-4 rtl:rotate-180" />
        </button>
      </form>

    </div>
  );
}
