import React from 'react';
import { Gem, MessageCircle, Send } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { StreakCalendar } from './StreakCalendar';

export const DashboardView = ({
    userData,
    startCompanionChat,
    triggerDeliveryTest
}) => {
    return (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-700 relative z-10">
            <GlassCard className="bg-gradient-to-br from-amber-400/80 to-amber-600/80 p-8 text-white border-white/40 shadow-amber-500/20">
                <p className="text-amber-100 text-xs font-bold uppercase tracking-widest mb-1">Welcome back</p>
                <h2 className="text-3xl font-bold mb-2 leading-tight">
                    {(() => {
                        const hour = new Date().getHours();
                        if (hour >= 5 && hour < 11) return 'おはよう、';
                        if (hour >= 11 && hour < 18) return 'こんにちは、';
                        return 'こんばんは、';
                    })()}
                    <br />
                    {userData?.name ? `${userData.name}さん` : 'あなた'}
                </h2>
                <p className="text-sm opacity-90 leading-relaxed font-medium">今日もあなたの「生きた証」を、<br />宝石のように輝かせましょう。</p>
            </GlassCard>

            <StreakCalendar userData={userData} />

            <div className="grid grid-cols-2 gap-4">
                <GlassCard className="p-6 flex flex-col items-center gap-3 active:scale-95 transition-transform">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                        <Gem className="w-7 h-7 text-amber-600" />
                    </div>
                    <span className="text-xs font-bold text-amber-900 uppercase">琥珀の宝石箱</span>
                </GlassCard>
                <GlassCard onClick={startCompanionChat} className="p-6 flex flex-col items-center gap-3 active:scale-95 transition-transform cursor-pointer">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                        <MessageCircle className="w-7 h-7 text-amber-600" />
                    </div>
                    <span className="text-xs font-bold text-amber-900 uppercase">琥珀との語らい</span>
                </GlassCard>
            </div>

            <div className="p-6 rounded-3xl border border-white/40 bg-white/20 backdrop-blur-sm italic text-amber-900/60 text-center text-xs font-medium">
                "どんなに小さな一滴も、いつか美しい琥珀になる。"
            </div>
        </div>
    );
};
