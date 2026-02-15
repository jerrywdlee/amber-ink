import React, { useState, useRef, useEffect } from 'react';
import { Gem, Sparkles, X, Key, Trash2, Download, AlertTriangle, ImageUp } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { sealMemory, unsealMemory, downloadKeyImage } from '../utils/jewelryBoxCrypto';

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
        'keyIcons/key_01.png',
        'keyIcons/key_02.png',
        'keyIcons/key_03.png',
        'keyIcons/key_04.png',
    ];

    const sequenceStarted = useRef(false);

    const startGreetingSequence = async (data, customMessages = null) => {
        const userName = data?.name || 'あなた';
        const jBox = data?.jewelryBox;

        let fullMessages = [];

        if (customMessages) {
            fullMessages = customMessages;
        } else if (jBox && jBox.lastEncryptedAt && jBox.keyImageName) {
            const date = new Date(jBox.lastEncryptedAt).toLocaleDateString('ja-JP', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            fullMessages = [
                `「琥珀の宝石箱」へようこそ、${userName}さん。`,
                `${date}に、以下の宝石箱へ大切な想いを封印した記録があります。`,
                'その輝きは、今もあなたが持つ「鍵」によって守られています。',
                '鍵をなくして再作成したい場合や、別の想いを封印し直したい時は、下の宝石箱をタップしてくださいね。'
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
                                    setSelectedIcon(`keyIcons/${userData.jewelryBox.keyImageName}`);
                                    setModalView('choice');
                                }}
                                className="w-[140px] p-2 flex flex-col items-center gap-2 border-white/60 shadow-amber-500/10 hover:bg-white/40 active:scale-95 transition-all cursor-pointer"
                            >
                                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-amber-50 shadow-inner">
                                    <img
                                        src={`keyIcons/${userData.jewelryBox.keyImageName}`}
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

                            <div className="text-center space-y-1 w-full">
                                <h3 className="text-lg font-bold text-amber-900 text-center">
                                    {modalView === 'choice' ? '琥珀の宝石箱' : modalView === 'open' ? '宝石箱の鍵を開ける' : '想いを鍵に注ぐ'}
                                </h3>
                                <div className="w-full px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                                    <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                                        宝石箱は<span className="text-amber-600 font-bold">強力な暗号化</span>で保護され、<br />
                                        「鍵」を託された人だけが、開けることができます。
                                    </p>
                                </div>
                            </div>

                            {modalView === 'choice' ? (
                                <div className="w-full space-y-3">
                                    <button
                                        onClick={() => {
                                            setModalView('open');
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
                                                text: '承知いたしました。以前の宝石箱を一度破棄し、新しい物語を始める準備を整えますね。'
                                            }]);
                                            await new Promise(r => setTimeout(r, 600));
                                            setMessages(prev => [...prev, {
                                                role: 'ai',
                                                text: '下の宝石箱の中からお好きなものを一つ選んでみてください。'
                                            }]);
                                            await new Promise(r => setTimeout(r, 600));
                                            setMessages(prev => [...prev, {
                                                role: 'ai',
                                                text: 'もし気が変わって再作成をやめる場合は、お手数ですが右上の「＜」ボタンで一度戻ってください。'
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
                            ) : modalView === 'open' ? (
                                <div className="w-full space-y-6">
                                    <div className="relative group mx-auto w-32 h-32 cursor-pointer" onClick={() => document.getElementById('key-file-input').click()}>
                                        <div className="absolute inset-0 bg-amber-500/20 rounded-2xl animate-pulse group-hover:hidden" />
                                        <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-amber-300 shadow-md transform rotate-3 transition-all duration-500 group-hover:rotate-0 group-hover:grayscale-0 grayscale opacity-80 group-hover:opacity-100 bg-amber-100">
                                            <img src={`keyIcons/${userData.jewelryBox.keyImageName}`} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-amber-600 text-white p-2 rounded-full shadow-lg transition-transform group-hover:scale-110">
                                            <ImageUp size={16} />
                                        </div>
                                    </div>

                                    <div className="text-center space-y-2">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full text-[10px] font-bold text-amber-600">
                                            <Sparkles size={10} />
                                            {new Date(userData.jewelryBox.lastEncryptedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} に作成
                                        </div>
                                        <p className="text-[11px] text-amber-900/70 leading-relaxed">
                                            上記の画像に「鍵」が埋め込まれています。<br />
                                            保存したときと同じ画像ファイルを選択してください。
                                        </p>
                                    </div>

                                    <input
                                        id="key-file-input"
                                        type="file"
                                        accept="image/png"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            setIsTyping(true);
                                            const result = await unsealMemory(file, userData.jewelryBox.memoryBundle);

                                            if (result.success) {
                                                setMemoryText(result.content);
                                                setModalView('input');

                                                // Optional: Add a brief signal that it succeeded in the background or just let the UI change speak for itself
                                                // The user said "additional messages... are unnecessary"
                                            } else {
                                                alert(result.error);
                                            }
                                            setIsTyping(false);
                                        }}
                                    />

                                    <button
                                        onClick={() => setModalView('choice')}
                                        className="w-full py-3 text-amber-900/60 font-medium hover:text-amber-900 transition-colors text-xs"
                                    >
                                        戻る
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="relative w-full">
                                        <textarea
                                            className={`w-full h-48 p-4 bg-white/50 border ${memoryText.length > 2000 ? 'border-red-400 focus:border-red-500' : 'border-white/40 focus:border-white/80'} rounded-2xl outline-none text-amber-900 text-sm placeholder-amber-700/40 font-medium resize-none shadow-inner transition-all`}
                                            placeholder="大切な言葉、パスワード、秘密の場所..."
                                            value={memoryText}
                                            onChange={(e) => setMemoryText(e.target.value)}
                                        />
                                        <div className={`absolute bottom-3 right-4 text-[10px] font-bold ${memoryText.length > 2000 ? 'text-red-500 animate-pulse' : 'text-amber-700/40'}`}>
                                            {memoryText.length.toLocaleString()} / 2,000
                                        </div>
                                    </div>

                                    {memoryText.length > 2000 && (
                                        <p className="px-2 text-[10px] text-red-500 font-bold flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                                            <AlertTriangle size={10} />
                                            2,000文字以内で入力してください。
                                        </p>
                                    )}

                                    <button
                                        onClick={async () => {
                                            if (!memoryText.trim() || memoryText.length > 2000) return;

                                            setIsTyping(true); // Show typing while "sealing"

                                            // Pass existing public key if available and not resetting
                                            const existingPublicKey = isResetting ? null : userData?.jewelryBox?.publicKey;

                                            const result = await sealMemory(
                                                memoryText,
                                                selectedIcon,
                                                userData?.name || 'Amber User',
                                                existingPublicKey
                                            );

                                            if (result.success) {
                                                const shortName = (userData?.name || 'User').substring(0, 8);
                                                const dateStr = new Date().toISOString().split('T')[0];
                                                const filename = `Amber-Key-${shortName}様_${dateStr}.png`;

                                                // Only download if a new image was generated (initial seal or reset)
                                                if (result.keyImageBlob) {
                                                    downloadKeyImage(result.keyImageBlob, filename);
                                                }

                                                // Persist to DB
                                                const savedInDb = await updateUserMetadata(result.persistenceData);
                                                console.log('Jewelry Box Persistence Status:', savedInDb);

                                                // Show custom success modal
                                                setSuccessData({
                                                    blob: result.keyImageBlob, // This will be null for updates
                                                    filename,
                                                    isUpdate: !result.keyImageBlob
                                                });

                                                setSelectedIcon(null);
                                                setMemoryText('');
                                                setModalView('input'); // Reset for next time
                                                setIsResetting(false); // Clear reset flag after success
                                            } else {
                                                alert('封印に失敗しました: ' + result.error);
                                            }
                                            setIsTyping(false);
                                        }}
                                        disabled={!memoryText.trim() || memoryText.length > 2000}
                                        className={`w-full py-3 bg-linear-to-br from-amber-500 to-amber-600 text-white rounded-full font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 ${(!memoryText.trim() || memoryText.length > 2000) ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:brightness-110 shadow-amber-500/30'}`}
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
                        <div className="w-24 h-24 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner overflow-hidden border-2 border-amber-200">
                            {successData.isUpdate && userData?.jewelryBox?.keyImageName ? (
                                <img src={`keyIcons/${userData.jewelryBox.keyImageName}`} className="w-full h-full object-cover" />
                            ) : (
                                <Gem size={40} className="text-amber-600 animate-pulse" />
                            )}
                        </div>

                        <h3 className="text-2xl font-bold text-amber-900 mb-2">
                            {successData.isUpdate ? '宝石箱を更新しました' : '想いが封印されました'}
                        </h3>
                        <p className="text-sm text-amber-800/80 mb-6 leading-relaxed whitespace-pre-line">
                            {successData.isUpdate
                                ? `${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}に想いを追記しました。\n手元の鍵を無くさないで下さい。`
                                : 'あなたの想いは強力に暗号化され、\n宝石箱の中に大切に守られました。'}
                        </p>

                        {!successData.isUpdate && (
                            <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 mb-6 text-left space-y-2">
                                <div className="flex items-start gap-2 text-orange-700">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                    <p className="text-[11px] font-bold leading-tight">
                                        鍵を紛失すると、他の方はもちろん、<br />
                                        琥珀やあなた自身も二度と宝石箱を開けることはできません。
                                    </p>
                                </div>
                                <div className="flex items-start gap-2 text-orange-700/80">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                    <p className="text-[10px] leading-tight">
                                        鍵画像を<span className="text-orange-900 font-extrabold underline decoration-orange-300">加工（リサイズや圧縮、SNS等での転送）</span>しないでください。データが破壊され、開けられなくなる恐れがあります。
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {!successData.isUpdate && (
                                <button
                                    onClick={() => downloadKeyImage(successData.blob, successData.filename)}
                                    className="w-full py-4 bg-linear-to-r from-amber-500 to-orange-400 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Download size={18} />
                                    鍵画像をダウンロード
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    const isUpdate = successData.isUpdate;
                                    setSuccessData(null);
                                    setMessages([]);
                                    setIsResetting(false);

                                    if (isUpdate) {
                                        startGreetingSequence(userData, [
                                            '手元の鍵で、あなたの想いを追記（保存）しました。',
                                            'この「鍵」は、あなたの物語を開くための唯一無二のものです。',
                                            'どうぞ、失くさないように大切に持っていてくださいね。'
                                        ]);
                                    } else {
                                        startGreetingSequence(userData);
                                    }
                                }}
                                className="w-full py-3 text-amber-900 font-bold hover:text-amber-950 transition-colors text-sm bg-white/40 rounded-2xl border border-white/50"
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
