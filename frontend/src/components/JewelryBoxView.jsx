import React, { useState, useRef, useEffect } from 'react';
import { Gem, Sparkles, X } from 'lucide-react';
import { GlassCard } from './GlassCard';

export const JewelryBoxView = ({ userData }) => {
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [selectedIcon, setSelectedIcon] = useState(null);
    const [memoryText, setMemoryText] = useState('');
    const chatEndRef = useRef(null);

    const keyIcons = [
        '/keyIcons/key_01.png',
        '/keyIcons/key_02.png',
        '/keyIcons/key_03.png',
        '/keyIcons/key_04.png',
    ];

    const sequenceStarted = useRef(false);

    useEffect(() => {
        if (sequenceStarted.current) return;
        sequenceStarted.current = true;

        const sequence = async () => {
            const userName = userData?.name || 'あなた';
            const fullMessages = [
                `「琥珀の宝石箱」へようこそ。ここでは、${userName}さんの日常に隠れた輝きを、宝石のように大切に保管していきます。`,
                `${userName}さんは、まだ宝石箱（生きた証）を保存していないようですね。`,
                'もし新しく作りたいのであれば、下の宝石箱の中からお好きなものを一つ選んでみてください。'
            ];

            for (const text of fullMessages) {
                setIsTyping(true);
                await new Promise(r => setTimeout(r, 400)); // 琥珀が考え中...
                setMessages(prev => [...prev, { role: 'ai', text }]);
                setIsTyping(false);
                await new Promise(r => setTimeout(r, 400)); // 次のメッセージまでの間隔
            }
        };
        sequence();
    }, [userData]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    return (
        <div className="relative z-10 flex flex-col h-[78vh] animate-in slide-in-from-right duration-500">
            {/* Chat Area - Maximized */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-4 px-1 scrollbar-hide">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-3xl shadow-sm transition-all duration-300 whitespace-pre-wrap ${m.role === 'user'
                            ? 'bg-linear-to-br from-amber-500 to-amber-600 text-white rounded-tr-none'
                            : 'bg-white/70 backdrop-blur-md border border-white/50 rounded-tl-none text-amber-900 font-medium'
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
                            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-widest opacity-60">琥珀が宝石を磨いています...</span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Icon Gallery Area - Horizontal Scroll (One image height) */}
            <div className="mt-2 pb-0 px-1">
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    {keyIcons.map((src, i) => (
                        <GlassCard
                            key={i}
                            onClick={() => setSelectedIcon(src)}
                            className="flex-none w-[140px] group p-2 flex flex-col items-center gap-2 hover:bg-white/40 active:scale-95 transition-all cursor-pointer border-white/60"
                        >
                            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-amber-50 shadow-inner">
                                <img
                                    src={src}
                                    alt={`Memory ${i + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-linear-to-t from-amber-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-[10px] font-bold text-amber-900/60 uppercase tracking-widest flex items-center gap-1">
                                <Sparkles size={8} className="text-amber-500" />
                                Memory {String(i + 1).padStart(2, '0')}
                            </span>
                        </GlassCard>
                    ))}
                </div>
            </div>

            {/* Memory Input Modal */}
            {selectedIcon && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-amber-900/40 backdrop-blur-sm" onClick={() => setSelectedIcon(null)} />
                    <GlassCard className="relative w-full max-w-sm p-6 rounded-[2rem] border-white/40 shadow-2xl animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setSelectedIcon(null)}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/50 rounded-full text-amber-900"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex flex-col items-center gap-4">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-white/50">
                                <img src={selectedIcon} className="w-full h-full object-cover" />
                            </div>

                            <div className="text-center space-y-1">
                                <h3 className="text-lg font-bold text-amber-900">想いを鍵に注ぐ</h3>
                                <div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                                    <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                                        入力された内容は<span className="text-amber-600 font-bold">強力な暗号化</span>で保護され、<br />
                                        「鍵」を託された人のみが解凍できます。
                                    </p>
                                </div>
                            </div>

                            <textarea
                                className="w-full h-32 p-4 bg-white/50 border border-white/40 rounded-2xl outline-none text-amber-900 text-sm placeholder-amber-700/40 font-medium resize-none shadow-inner focus:bg-white/80 transition-all"
                                placeholder="大切な言葉、パスワード、秘密の場所..."
                                value={memoryText}
                                onChange={(e) => setMemoryText(e.target.value)}
                            />

                            <button
                                onClick={() => {
                                    alert('（現在はフロントエンドのみ）宝石箱に想いが封印されました。');
                                    setSelectedIcon(null);
                                    setMemoryText('');
                                }}
                                className="w-full py-3 bg-linear-to-br from-amber-500 to-amber-600 text-white rounded-full font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                            >
                                <Gem size={18} />
                                宝石箱に保存する
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};
