import React from 'react';
import { Send, Settings } from 'lucide-react';
import { GlassCard } from './GlassCard';

export const RegistrationView = ({
    regType,
    chatMessages,
    isTyping,
    chatEndRef,
    inputValue,
    setInputValue,
    handleSendMessage,
    formData,
    setFormData,
    saveUserData
}) => {
    if (regType === 'chat') {
        return (
            <div className="relative z-10 flex flex-col h-[78vh]">
                <div className="flex-1 overflow-y-auto space-y-4 pb-4 px-1 scrollbar-hide">
                    {chatMessages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-3xl shadow-sm transition-all duration-300 whitespace-pre-wrap ${m.role === 'user'
                                ? 'bg-linear-to-br from-amber-500 to-amber-600 text-white rounded-tr-none'
                                : 'bg-white/70 backdrop-blur-md border border-white/50 rounded-tl-none text-amber-900'
                                }`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start animate-in fade-in duration-500">
                            <div className="bg-white/60 backdrop-blur-md px-6 py-3 rounded-2xl rounded-bl-sm border border-white/40 shadow-sm flex items-center gap-2">
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></span>
                                </div>
                                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-widest opacity-60">入力中...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <GlassCard className="p-2 rounded-full flex items-center mt-4">
                    <input
                        className="flex-1 bg-transparent px-5 py-3 outline-none text-amber-900 placeholder-amber-700/50"
                        placeholder="想いを入力..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button
                        onClick={handleSendMessage}
                        className="w-11 h-11 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-95 transition-transform"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="relative z-10 flex flex-col h-[78vh]">
            <GlassCard className="p-8 space-y-6 animate-in zoom-in duration-300">
                <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                    <Settings className="w-5 h-5" />
                    <h2>クイック登録</h2>
                </div>
                <div className="space-y-4 text-sm">
                    <div>
                        <label className="block text-amber-700 mb-1 ml-2">お名前</label>
                        <input
                            className="w-full p-4 rounded-2xl bg-white/50 border border-white/50 focus:ring-2 ring-amber-400 outline-none"
                            placeholder="琥珀 太郎"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-amber-700 mb-1 ml-2">興味・関心</label>
                        <input
                            className="w-full p-4 rounded-2xl bg-white/50 border border-white/50 focus:ring-2 ring-amber-400 outline-none"
                            placeholder="園芸、最新ニュース"
                            value={formData.interest}
                            onChange={e => setFormData({ ...formData, interest: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-amber-700 mb-1 ml-2">見守りサポーター (Email・携帯番号など)</label>
                        <input
                            className="w-full p-4 rounded-2xl bg-white/50 border border-white/50 focus:ring-2 ring-amber-400 outline-none"
                            placeholder="Email、電話番号、LINE IDなど"
                            value={formData.emergency}
                            onChange={e => setFormData({ ...formData, emergency: e.target.value })}
                        />
                    </div>
                    <button
                        onClick={() => saveUserData(formData)}
                        className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
                    >
                        登録を完了する
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};
