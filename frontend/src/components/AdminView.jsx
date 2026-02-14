import React, { useState } from 'react';
import { Shield, Wand2, Send, Search, CheckCircle2, AlertCircle, Loader2, Bell } from 'lucide-react';
import { GlassCard } from './GlassCard';

export const AdminView = ({ userId }) => {
    const [targetId, setTargetId] = useState('');
    const [adminToken, setAdminToken] = useState('');
    const [status, setStatus] = useState({ type: null, message: '' });
    const [isProcessing, setIsProcessing] = useState(null); // null or endpoint name

    const callAdminApi = async (endpoint, body) => {
        setIsProcessing(endpoint);
        setStatus({ type: null, message: '' });
        try {
            let url = "";
            if (endpoint === 'runAiAnalyzer') url = import.meta.env.VITE_RUN_AI_ANALYZER_URL;
            else if (endpoint === 'runDeliveryEngine') url = import.meta.env.VITE_RUN_DELIVERY_ENGINE_URL;
            else if (endpoint === 'runEmergencyMonitor') url = import.meta.env.VITE_RUN_EMERGENCY_MONITOR_URL;

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer admin`,
                    'X-Amber-Ink-Admin-Token': adminToken
                },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                if (endpoint === 'runEmergencyMonitor') {
                    setStatus({ type: 'success', message: `判定完了: ${data.notified} 名に通知を送信しました` });
                } else {
                    setStatus({ type: 'success', message: '操作が正常に完了しました' });
                }
            } else {
                setStatus({ type: 'error', message: data.error || 'エラーが発生しました' });
            }
        } catch (e) {
            setStatus({ type: 'error', message: 'ネットワークエラーが発生しました' });
        } finally {
            setIsProcessing(null);
        }
    };

    return (
        <div className="relative z-10 flex flex-col space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-3 px-2">
                <div className="p-2 bg-slate-800 rounded-xl text-white">
                    <Shield className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Admin Dashboard</h1>
                    <p className="text-xs text-slate-500 font-mono">Status: Authorized (Admin Mode)</p>
                </div>
            </div>

            <GlassCard className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    <h2>認証設定</h2>
                </div>
                <div className="relative">
                    <input
                        type="password"
                        className="w-full p-4 pl-12 rounded-2xl bg-white/50 border border-white/50 focus:ring-2 ring-indigo-400 outline-none font-mono text-sm"
                        placeholder="Admin Tokenを入力"
                        value={adminToken}
                        onChange={(e) => setAdminToken(e.target.value)}
                    />
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
            </GlassCard>

            <GlassCard className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                    <Search className="w-5 h-5 text-amber-600" />
                    <h2>対象ユーザー指定</h2>
                </div>
                <div className="relative">
                    <input
                        className="w-full p-4 pl-12 rounded-2xl bg-white/50 border border-white/50 focus:ring-2 ring-slate-400 outline-none font-mono text-sm"
                        placeholder="ユーザーIDを入力 (例: user_xxxxxx)"
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-500 px-2 italic">
                    ※ 一部の操作はユーザーIDの指定が必須です。
                </p>
            </GlassCard>

            <div className="grid grid-cols-1 gap-4">
                <button
                    onClick={() => callAdminApi('runAiAnalyzer', { userId: targetId })}
                    disabled={!!isProcessing || !targetId}
                    className={`group relative overflow-hidden p-6 rounded-3xl bg-white/70 backdrop-blur-md border border-white/50 shadow-sm transition-all active:scale-95 text-left ${(!targetId || isProcessing) ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:shadow-md'
                        }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-amber-700 font-bold">
                                <Wand2 className="w-5 h-5" />
                                <span>AI 配信プラン作成</span>
                            </div>
                            <p className="text-xs text-slate-600">
                                {targetId ? '興味・関心に基づいてAIが配信内容を分析・生成します。' : '※ ユーザーIDを指定してください'}
                            </p>
                        </div>
                        {isProcessing === 'runAiAnalyzer' && <Loader2 className="w-5 h-5 animate-spin text-amber-500" />}
                    </div>
                </button>

                <button
                    onClick={() => callAdminApi('runDeliveryEngine', { userId: targetId, targetOverride: null })}
                    disabled={!!isProcessing || !targetId}
                    className={`group relative overflow-hidden p-6 rounded-3xl bg-white/70 backdrop-blur-md border border-white/50 shadow-sm transition-all active:scale-95 text-left ${(!targetId || isProcessing) ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:shadow-md'
                        }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-orange-700 font-bold">
                                <Send className="w-5 h-5" />
                                <span>配信スケジュール実行</span>
                            </div>
                            <p className="text-xs text-slate-600">
                                {targetId ? '作成済みのスケジュールに従い、実際にメッセージを送信します。' : '※ ユーザーIDを指定してください'}
                            </p>
                        </div>
                        {isProcessing === 'runDeliveryEngine' && <Loader2 className="w-5 h-5 animate-spin text-orange-500" />}
                    </div>
                </button>

                <button
                    onClick={() => callAdminApi('runEmergencyMonitor', { userId: targetId })}
                    disabled={!!isProcessing || !targetId}
                    className={`group relative overflow-hidden p-6 rounded-3xl bg-white/70 backdrop-blur-md border border-white/50 shadow-sm transition-all active:scale-95 text-left ${(!targetId || isProcessing) ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:shadow-md'
                        }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-red-700 font-bold">
                                <Bell className="w-5 h-5" />
                                <span>緊急監視手動トリガー</span>
                            </div>
                            <p className="text-xs text-slate-600">
                                {targetId ? '対象ユーザーの不活動状態を判定し、必要なら緊急メールを送信します。' : '※ ユーザーIDを指定してください'}
                            </p>
                        </div>
                        {isProcessing === 'runEmergencyMonitor' && <Loader2 className="w-5 h-5 animate-spin text-red-500" />}
                    </div>
                </button>
            </div>

            {status.type && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                    {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                    <span className="text-sm font-medium">{status.message}</span>
                </div>
            )}

            <div className="pt-10 text-center">
                <p className="text-[10px] text-slate-400 tracking-widest uppercase">Amber Ink Management System v1.0</p>
            </div>
        </div>
    );
};
