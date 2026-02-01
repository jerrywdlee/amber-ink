import React from 'react';
import { Award } from 'lucide-react';
import { GlassCard } from './GlassCard';

export const StreakCalendar = ({ userData }) => {
    const rawCheckins = userData?.checkins || [];

    // 1. 各チェックイン（ISO文字列）を日付（YYYY-MM-DD）に変換し、重複を排除
    const checkins = [...new Set(rawCheckins.map(c => {
        try {
            return new Date(c).toISOString().split('T')[0];
        } catch (e) {
            return c.split('T')[0];
        }
    }))];

    // 2. カレンダーの開始日を決定
    // 直近5日間（今日を含む）の中で、最も古いチェックイン日を開始点にする
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 4); // 今日を含めて5日間
    const thresholdStr = thresholdDate.toISOString().split('T')[0];

    const recentInWindow = checkins
        .filter(d => d >= thresholdStr)
        .sort((a, b) => a.localeCompare(b));

    const startDate = recentInWindow.length > 0
        ? new Date(recentInWindow[0])
        : new Date();

    // 3. 開始日から順に28日分の日付を順次生成（未来に向かって表示）
    const days = Array.from({ length: 28 }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return date.toISOString().split('T')[0];
    });

    // 4. 今日から遡って連続しているチェックイン（現在のストリーク）を特定
    const todayStr = new Date().toISOString().split('T')[0];
    const currentStreakDays = [];
    if (checkins.includes(todayStr)) {
        let checkDate = new Date(todayStr);
        while (checkins.includes(checkDate.toISOString().split('T')[0])) {
            currentStreakDays.push(checkDate.toISOString().split('T')[0]);
            checkDate.setDate(checkDate.getDate() - 1);
        }
    }

    return (
        <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                    <Award className="w-5 h-5 text-amber-600" />
                    <span>継続ストリーク</span>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-200/50 px-3 py-1 rounded-full">
                    {checkins.length} DAYS
                </span>
            </div>
            <div className="grid grid-cols-7 gap-y-3 gap-x-0">
                {days.map((d, i) => {
                    const isChecked = checkins.some(c => c.startsWith(d));
                    const isToday = d === todayStr;
                    const isInCurrentStreak = currentStreakDays.some(c => c.startsWith(d));
                    const isDifferentMonth = new Date(d).getMonth() !== startDate.getMonth();

                    // 接続ロジック: 前後の日がチェックイン済みか (同じ週内かどうかも考慮するとより正確ですが、まずはシンプルに時系列で)
                    const prevChecked = i > 0 && checkins.includes(days[i - 1]) && (i % 7 !== 0);
                    const nextChecked = i < days.length - 1 && checkins.includes(days[i + 1]) && (i % 7 !== 6);

                    let borderClasses = "border border-white/20";
                    let roundedClass = "rounded-xl";

                    if (isChecked) {
                        borderClasses = "border-y border-amber-500/20";
                        if (!prevChecked) {
                            borderClasses += " border-l border-amber-500/20";
                            roundedClass = "rounded-l-xl";
                        } else {
                            roundedClass = "rounded-l-none";
                        }
                        if (!nextChecked) {
                            borderClasses += " border-r border-amber-500/20";
                            roundedClass += " rounded-r-xl";
                        } else {
                            roundedClass += " rounded-r-none";
                        }
                    }

                    return (
                        <div
                            key={d}
                            className={`relative h-10 flex items-center justify-center text-[10px] font-bold transition-all duration-500
                ${isDifferentMonth ? 'opacity-80' : 'opacity-100'}
                ${isChecked
                                    ? isToday
                                        ? 'bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-inner z-10'
                                        : 'bg-amber-400/20 text-amber-700 z-10'
                                    : 'bg-white/30 text-amber-300'}
                ${borderClasses}
                ${roundedClass}
                ${isToday ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-[#fff7e6] scale-110 z-20 shadow-lg shadow-amber-500/40 relative' : ''}
                ${isInCurrentStreak && !isToday ? 'ring-1 ring-amber-500/30' : ''}
              `}
                        >
                            {d.split('-')[2]}
                        </div>
                    );
                })}
            </div>
        </GlassCard>
    );
};
