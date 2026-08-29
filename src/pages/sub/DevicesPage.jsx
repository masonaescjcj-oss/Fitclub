import React, { useState } from "react";
import { Watch, ArrowLeft, RefreshCw } from "lucide-react";

export default function DevicesPage({ onBack, isRtl }) {
  const [devices, setDevices] = useState([
    { id: "apple_health", name: "Apple Health", category: "iOS Sync", connected: true, lastSync: "2 mins ago", icon: "🍎" },
    { id: "garmin", name: "Garmin Connect", category: "Smartwatch", connected: false, lastSync: "Never", icon: "⌚" },
    { id: "google_fit", name: "Google Fit", category: "Android Sync", connected: true, lastSync: "1 hour ago", icon: "🏃" },
    { id: "fitbit", name: "Fitbit Sense", category: "Fitness Tracker", connected: false, lastSync: "Never", icon: "⚡" },
  ]);

  const toggleConnect = (id) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, connected: !d.connected, lastSync: "Just now" } : d))
    );
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
          <h1 className="text-xl font-black text-white">{isRtl ? "دستگاه‌ها و ساعت‌های هوشمند" : "Connected Wearables"}</h1>
        </div>
        <Watch className="w-6 h-6 text-[#844783]" />
      </div>

      {/* Sync Status Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#844783]/20 via-[#703b6f]/20 to-neutral-900 border border-[#844783]/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#844783] flex items-center justify-center text-white shadow-lg">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: "8s" }} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{isRtl ? "همگام‌سازی خودکار ضربان و ضربان قلب" : "Auto-Sync Active"}</h3>
            <p className="text-xs text-neutral-400 font-medium">{isRtl ? "همگام‌سازی ضربان، گام‌ها و خواب" : "Syncing steps, heart rate & sleep"}</p>
          </div>
        </div>
      </div>

      {/* Devices List */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider px-1">
          {isRtl ? "ساعت‌ها و اپلیکیشن‌های پشتیبانی‌شده" : "Available Integrations"}
        </h3>

        {devices.map((device) => (
          <div
            key={device.id}
            className="p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <span className="text-2xl">{device.icon}</span>
              <div>
                <h4 className="text-sm font-black text-white">{device.name}</h4>
                <span className="text-xs text-neutral-400 font-medium">{device.category} • {device.lastSync}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleConnect(device.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                device.connected
                  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                  : "bg-[#844783] hover:bg-[#965595] text-white"
              }`}
            >
              {device.connected ? (isRtl ? "متصل شد ✓" : "Connected ✓") : (isRtl ? "اتصال" : "Connect")}
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
