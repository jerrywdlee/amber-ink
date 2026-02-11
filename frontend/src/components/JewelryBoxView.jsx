import React, { useState, useRef, useEffect } from 'react';
import { Gem, Sparkles, X, Key, Trash2, Download, AlertTriangle } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { sealMemory, downloadKeyImage } from '../utils/jewelryBoxCrypto';

export const JewelryBoxView = ({ userData, updateUserMetadata }) => {
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [selectedIcon, setSelectedIcon] = useState(null);
    const [memoryText, setMemoryText] = useState('');
    const [showGallery, setShowGallery] = useState(false);
    const [modalView, setModalView] = useState('input'); // 'input' or 'choice'
    const [isResetting, setIsResetting] = useState(false);
    const [successData, setSuccessData] = useState(null); // { blob, filename }
    const chatEndRef = useRef(null);

    const keyIcons = [
        '/keyIcons/key_01.png',
        '/keyIcons/key_02.png',
        '/keyIcons/key_03.png',
        '/keyIcons/key_04.png',
    ];

    const sequenceStarted = useRef(false);

    const startGreetingSequence = async (data) => {
        const userName = data?.name || 'あなた';
        const jBox = data?.jewelryBox;

        let fullMessages = [];

        if (jBox && jBox.lastEncryptedAt && jBox.keyImageName) {
            const date = new Date(jBox.lastEncryptedAt).toLocaleDateString('ja-JP', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            fullMessages = [
                `「琥珀の宝石箱」へようこそ、${userName}さん。`,
                `${date}に、以下の宝石箱へ大切な想いを封印した記録があります。`,
                'その輝きは、今もあなたが持つ「鍵」によって守られています。',
                '鍵をなくして再作成したい場合や、別の想いを封印し直したい時は、下の宝石をタップしてくださいね。'
            ];
        } else {
            fullMessages = [
                `「琥珀の宝石箱」へようこそ。ここでは、${userName}さんの日常に隠れた輝きを、宝石のように大切に保管していきます。`,
                `${userName}さんは、まだ宝石箱（生きた証）を保存していないようですね。`,
                'もし新しく作りたいのであれば、下の宝石箱の中からお好きなものを一つ選んでみてください。'
            ];
        }

        for (const text of fullMessages) {
            setIsTyping(true);
            await new Promise(r => setTimeout(r, 400));
            setMessages(prev => [...prev, { role: 'ai', text }]);
            setIsTyping(false);
            await new Promise(r => setTimeout(r, 400));
        }
        setShowGallery(true);
    };

    useEffect(() => {
        if (sequenceStarted.current) return;
        sequenceStarted.current = true;
        startGreetingSequence(userData);
    }, [userData]);

    useEffect(() => {
        const scrollToBottom = () => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        };
        // Small delay ensures content is rendered before scrolling
        const timer = setTimeout(scrollToBottom, 50);
        return () => clearTimeout(timer);
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

            {/* Icon Gallery Area - Condition based on whether a memory exists */}
            {showGallery && (
                <div className="mt-2 pb-0 px-1 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    {userData?.jewelryBox?.keyImageName && !isResetting ? (
                        <div className="flex justify-center">
                            <GlassCard
                                onClick={() => {
                                    setSelectedIcon(`/keyIcons/${userData.jewelryBox.keyImageName}`);
                                    setModalView('choice');
                                }}
                                className="w-[140px] p-2 flex flex-col items-center gap-2 border-white/60 shadow-amber-500/10 hover:bg-white/40 active:scale-95 transition-all cursor-pointer"
                            >
                                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-amber-50 shadow-inner">
                                    <img
                                        src={`/keyIcons/${userData.jewelryBox.keyImageName}`}
                                        alt="Sealed Memory"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <span className="text-[10px] font-bold text-amber-900/60 uppercase tracking-widest flex items-center gap-1">
                                    <Gem size={8} className="text-amber-500" />
                                    Sealed Jewel
                                </span>
                            </GlassCard>
                        </div>
                    ) : (
                        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                            {keyIcons.map((src, i) => (
                                <GlassCard
                                    key={i}
                                    onClick={() => {
                                        setSelectedIcon(src);
                                        setModalView('input');
                                    }}
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
                    )}
                </div>
            )}

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
                                <h3 className="text-lg font-bold text-amber-900">
                                    {modalView === 'choice' ? '琥珀の宝石箱' : '想いを鍵に注ぐ'}
                                </h3>
                                <div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                                    <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                                        入力された内容は<span className="text-amber-600 font-bold">強力な暗号化</span>で保護され、<br />
                                        「鍵」を託された人だけが、宝石箱を開けることができます。
                                    </p>
                                </div>
                            </div>

                            {modalView === 'choice' ? (
                                <div className="w-full space-y-3">
                                    <button
                                        onClick={() => {
                                            alert('「宝石箱を開ける」機能は現在準備中です。\nお手持ちの鍵画像で、いつでも想いを取り出せる機能を近日中に公開いたします。');
                                        }}
                                        className="w-full p-4 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-95 transition-all text-sm text-left relative overflow-hidden group hover:brightness-110"
                                    >
                                        <div className="relative z-10">
                                            <span className="flex items-center gap-2">
                                                <Key size={14} />
                                                現在の宝石箱を開ける
                                            </span>
                                            <p className="text-[10px] font-normal mt-1 opacity-90 leading-tight">
                                                {new Date(userData.jewelryBox.lastEncryptedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}に封印した宝石箱を開けて確認し、追加メッセージもできる、ただし上記画像のような鍵が必要です
                                            </p>
                                        </div>
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    </button>

                                    <button
                                        onClick={async () => {
                                            setSelectedIcon(null);
                                            setModalView('input');
                                            setIsResetting(true);
                                            setShowGallery(false);
                                            setMessages([]); // メッセージ履歴をクリア

                                            // Add Amber messages
                                            setIsTyping(true);
                                            await new Promise(r => setTimeout(r, 600));
                                            setMessages([{
                                                role: 'ai',
                                                text: '承知いたしました。これまでの封印を解き、新しい宝石箱を準備しますね。'
                                            }]);
                                            await new Promise(r => setTimeout(r, 600));
                                            setMessages(prev => [...prev, {
                                                role: 'ai',
                                                text: '下の宝石箱の中からお好きなものを一つ選んでみてください。'
                                            }]);
                                            setIsTyping(false);

                                            await new Promise(r => setTimeout(r, 400));
                                            setShowGallery(true);
                                        }}
                                        className="w-full p-4 bg-white border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-50/80 text-amber-900 rounded-2xl font-bold active:scale-95 hover:scale-[1.01] transition-all text-sm text-left group hover:shadow-md"
                                    >
                                        <span className="flex items-center gap-2 text-amber-600">
                                            <Trash2 size={14} />
                                            宝石箱を新しく作る
                                        </span>
                                        <p className="text-[10px] font-normal mt-1 text-amber-700/70 leading-tight">
                                            鍵が紛失しました、{new Date(userData.jewelryBox.lastEncryptedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}に封印した宝石箱を破棄し、新しく宝石箱を作る
                                        </p>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <textarea
                                        className="w-full h-32 p-4 bg-white/50 border border-white/40 rounded-2xl outline-none text-amber-900 text-sm placeholder-amber-700/40 font-medium resize-none shadow-inner focus:bg-white/80 transition-all"
                                        placeholder="大切な言葉、パスワード、秘密の場所..."
                                        value={memoryText}
                                        onChange={(e) => setMemoryText(e.target.value)}
                                    />

                                    <button
                                        onClick={async () => {
                                            if (!memoryText.trim()) return;

                                            setIsTyping(true); // Show typing while "sealing"
                                            const result = await sealMemory(memoryText, selectedIcon, userData?.name || 'Amber User');

                                            if (result.success) {
                                                const shortName = (userData?.name || 'User').substring(0, 8);
                                                const dateStr = new Date().toISOString().split('T')[0];
                                                const filename = `Amber-Key-${shortName}様_${dateStr}.png`;

                                                downloadKeyImage(result.keyImageBlob, filename);

                                                // Persist to DB
                                                const savedInDb = await updateUserMetadata(result.persistenceData);
                                                console.log('Jewelry Box Persistence Status:', savedInDb);

                                                // Show custom success modal instead of alert
                                                setSuccessData({
                                                    blob: result.keyImageBlob,
                                                    filename
                                                });

                                                setSelectedIcon(null);
                                                setMemoryText('');
                                                setModalView('input'); // Reset for next time
                                            } else {
                                                alert('封印に失敗しました: ' + result.error);
                                            }
                                            setIsTyping(false);
                                        }}
                                        className="w-full py-3 bg-linear-to-br from-amber-500 to-amber-600 text-white rounded-full font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                                    >
                                        <Gem size={18} />
                                        宝石箱に保存する
                                    </button>
                                </>
                            )}
                        </div>
                    </GlassCard>
                </div>
            )}
            {/* Success Modal */}
            {successData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-amber-900/40 backdrop-blur-md" />
                    <GlassCard className="relative w-full max-w-sm p-8 rounded-[2.5rem] border-white/60 shadow-2xl animate-in zoom-in-95 duration-300 text-center">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Gem size={40} className="text-amber-600 animate-pulse" />
                        </div>

                        <h3 className="text-2xl font-bold text-amber-900 mb-2">想いが封印されました</h3>
                        <p className="text-sm text-amber-800/80 mb-6 leading-relaxed">
                            あなたの想いは強力に暗号化され、<br />
                            宝石箱の中に大切に守られました。
                        </p>

                        <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 mb-6 text-left space-y-2">
                            <div className="flex items-start gap-2 text-orange-700">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                <p className="text-[11px] font-bold leading-tight">
                                    鍵を紛失すると、他の方はもちろん、<br />
                                    琥珀やあなた自身も二度と宝石箱を開けることはできません。
                                </p>
                            </div>
                            <div className="flex items-start gap-2 text-orange-700/80">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0 opacity-0" />
                                <p className="text-[10px] leading-tight">
                                    この「鍵」は一度だけ生成される特別なものです。作り直すことはできないため、大切に保管してください。
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => downloadKeyImage(successData.blob, successData.filename)}
                                className="w-full py-4 bg-linear-to-r from-amber-500 to-orange-400 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Download size={18} />
                                鍵画像を再ダウンロード
                            </button>

                            <button
                                onClick={() => {
                                    setSuccessData(null);
                                    setMessages([]);
                                    setIsResetting(false);
                                    startGreetingSequence(userData);
                                }}
                                className="w-full py-3 text-amber-900/60 font-bold hover:text-amber-900 transition-colors text-sm"
                            >
                                閉じる
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};
