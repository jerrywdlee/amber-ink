import React, { useEffect, useState } from 'react';
import { ShieldAlert, Clock, Heart, Sparkles, MapPin, Download } from 'lucide-react';

export function EmergencyStatusView({ userId, userData }) {
    const [lastCheckin, setLastCheckin] = useState(null);
    const [daysSince, setDaysSince] = useState(0);

    const handleDownloadMemorial = async () => {
        try {
            const resp = await fetch(`${import.meta.env.VITE_DOWNLOAD_MEMORIAL_URL}?uid=${userId}`);
            if (!resp.ok) throw new Error('Download failed');

            const html = await resp.text();
            const blob = new Blob([html], { type: 'text/html' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `memorial_${userData?.name || userId}.html`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Memorial download error:', error);
            alert('記念ページのダウンロードに失敗しました。');
        }
    };

    useEffect(() => {
        if (userData && userData.last_seen) {
            const last = new Date(userData.last_seen);
            setLastCheckin(last.toLocaleString('ja-JP'));
            const diff = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
            setDaysSince(diff);
        }
    }, [userData]);

    if (!userData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-4"></div>
                <p>状況を確認しています...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                    <Sparkles className="w-8 h-8 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">安否状況（見守りレポート）</h1>
                <p className="text-slate-500 italic">大切な方の今の「輝き」を、サポーターの皆様にお伝えしています</p>
            </div>

            {/* Main Status Card */}
            <div className={`bg-white rounded-3xl p-8 shadow-xl border-t-8 ${daysSince >= 3 ? 'border-rose-400' : 'border-emerald-400'} mb-8`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-700">{userData.name} 様の状況</h2>
                    <span className={`px-4 py-1 rounded-full text-sm font-bold ${daysSince >= 3 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {daysSince >= 3 ? '要確認' : '安全確認済み'}
                    </span>
                </div>

                <div className="space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 mb-1">最終アクティビティ</p>
                            <p className="text-lg font-semibold text-slate-700">{lastCheckin || 'データなし'}</p>
                            {daysSince > 0 && (
                                <p className={`text-sm mt-1 font-medium ${daysSince >= 3 ? 'text-rose-500' : 'text-slate-500'}`}>
                                    {daysSince}日前よりチェックインが途絶えています
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                            <Heart className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400 mb-1">琥珀（Amber）からのメッセージ</p>
                            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                                <p className="text-slate-700 leading-relaxed text-sm">
                                    {userData.personaSummary || '会員様はいつも穏やかにお過ごしです。'}
                                    <br />
                                    <span className="mt-2 block text-xs text-amber-600/70">
                                        ※これは会員様とAIの対話に基づいた、琥珀による最近の印象です。
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Memorial Export Option */}
            <div className="bg-amber-100/50 border border-amber-200 rounded-3xl p-6 mb-8 text-center">
                <h3 className="text-amber-800 font-bold mb-2 flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    生きた証を保存する
                </h3>
                <p className="text-sm text-amber-700/80 mb-4 px-4">
                    会員様とのこれまでの「輝き」を、スタンドアロンHTMLとしてお手元にダウンロードできます。
                    サーバー上のデータは無期限には保存されませんので、大切な記録として保管をお勧めします。
                </p>
                <button
                    onClick={handleDownloadMemorial}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all transform hover:scale-105"
                >
                    記念ページをダウンロード
                </button>
            </div>

            {/* Info Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-3">
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        見守りサポーターとは
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        会員様が毎日「チェックイン」を行うことで、その生存と心の輝きを見守る仕組みです。
                        一定期間反応がない場合のみ、こうしてサポーター（ご家族・ご友人等）へ通知を送ります。
                    </p>
                </div>
                <div className="bg-rose-50 rounded-2xl p-6 border border-rose-100">
                    <h3 className="font-bold text-rose-700 flex items-center gap-2 mb-3">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        緊急時の対応
                    </h3>
                    <p className="text-sm text-rose-600 leading-relaxed">
                        状況が深刻と思われる場合は、この通知を待たず、速やかに対象者様へ直接連絡を取るか、現地の公的機関（警察・消防等）へご相談ください。
                    </p>
                </div>
            </div>

            <p className="text-center text-xs text-slate-400">
                &copy; 2026 Amber Ink - 会員様の「生きた証」を大切に。
            </p>
        </div>
    );
}
