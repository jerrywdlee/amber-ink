import React from 'react';
import { Send, Trash2, Plus, X, User } from 'lucide-react';
import { GlassCard } from './GlassCard';

export const CompanionChatView = ({
    companionMessages,
    isTypingCompanion,
    companionChatEndRef,
    isMenuOpen,
    setIsMenuOpen,
    clearCompanionHistory,
    handleSendCompanionMessage,
    triggerDeliveryTest,
    companionSuggestions,
    inputValue,
    setInputValue
}) => {
    // 画面遷移時にメニューが必ず閉じている状態にする
    React.useEffect(() => {
        setIsMenuOpen(false);
    }, [setIsMenuOpen]);

    return (
        <div className="relative z-10 flex flex-col h-[78vh]">
            <div className="flex-1 overflow-y-auto space-y-4 pb-4 px-1 scrollbar-hide">
                {companionMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-3xl shadow-sm transition-all duration-300 whitespace-pre-wrap ${m.role === 'user'
                            ? 'bg-linear-to-br from-amber-500 to-amber-600 text-white rounded-tr-none'
                            : 'bg-white/70 backdrop-blur-md border border-white/50 rounded-tl-none text-amber-900 font-medium'
                            }`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {isTypingCompanion && (
                    <div className="flex justify-start animate-in fade-in duration-500">
                        <div className="bg-white/60 backdrop-blur-md px-6 py-3 rounded-2xl rounded-bl-sm border border-white/40 shadow-sm flex items-center gap-2">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></span>
                            </div>
                            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-widest opacity-60">琥珀が入力中...</span>
                        </div>
                    </div>
                )}
                <div ref={companionChatEndRef} />
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-2 mt-2 mb-1 px-1">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 ${isMenuOpen ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-amber-500 text-white shadow-md shadow-amber-500/20 rotate-0'} border active:scale-90`}
                >
                    {isMenuOpen ? <X size={16} /> : <Plus size={18} />}
                </button>

                <div className={`flex items-center gap-2 overflow-hidden transition-all duration-500 ease-in-out ${isMenuOpen ? 'max-w-xs opacity-100 translate-x-0' : 'max-w-0 opacity-0 -translate-x-4 pointer-events-none'}`}>
                    <button
                        onClick={clearCompanionHistory}
                        className="px-3 py-1.5 bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-full text-[10px] font-bold text-red-700 shadow-xs active:scale-95 transition-transform flex items-center gap-1 whitespace-nowrap"
                    >
                        <Trash2 size={10} />
                        履歴消去
                    </button>
                    <button
                        onClick={triggerDeliveryTest}
                        className="px-3 py-1.5 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-700 shadow-xs active:scale-95 transition-transform flex items-center gap-1 whitespace-nowrap"
                    >
                        <Send size={10} />
                        テスト配信
                    </button>
                    <button
                        onClick={() => handleSendCompanionMessage("自分のプロフィール（名前や興味関心）を確認したい")}
                        className="px-3 py-1.5 bg-blue-500/10 backdrop-blur-md border border-blue-500/20 rounded-full text-[10px] font-bold text-blue-700 shadow-xs active:scale-95 transition-transform flex items-center gap-1 whitespace-nowrap"
                    >
                        <User size={10} />
                        プロフィール
                    </button>
                </div>

                <button
                    onClick={() => handleSendCompanionMessage("前回届いた配信の内容を教えて")}
                    className="px-3 py-1.5 bg-white/60 backdrop-blur-md border border-white/50 rounded-full text-[10px] font-bold text-amber-800 shadow-xs active:scale-95 transition-transform"
                >
                    前回の配信
                </button>
                {companionSuggestions.map((s, i) => (
                    <button
                        key={i}
                        onClick={() => handleSendCompanionMessage(s.value || s)}
                        className="px-3 py-1.5 bg-amber-500/10 backdrop-blur-md border border-amber-500/20 rounded-full text-[10px] font-bold text-amber-700 shadow-xs active:scale-95 transition-transform"
                    >
                        {s.label || s}
                    </button>
                ))}
            </div>

            <GlassCard className="p-2 rounded-full flex items-center mt-4 border-amber-200/50 shadow-amber-500/10">
                <input
                    className="flex-1 bg-transparent px-5 py-3 outline-none text-amber-900 placeholder-amber-700/50 font-medium"
                    placeholder="琥珀に話しかける..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendCompanionMessage()}
                />
                <button
                    onClick={handleSendCompanionMessage}
                    className="w-11 h-11 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-95 transition-transform"
                >
                    <Send className="w-5 h-5" />
                </button>
            </GlassCard>
        </div>
    );
};
