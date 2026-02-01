import React, { useState, useEffect, useRef } from 'react';
import { Heart, Send, Calendar as CalendarIcon, ShieldCheck, User, MessageCircle, Award, Settings, Zap, Info, Gem, Trash2, ChevronLeft, Plus, X } from 'lucide-react';

// --- Configuration ---
const appId = import.meta.env.VITE_APP_ID || 'amber-ink';

// --- Local Utils ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getOrCreateUserId = () => {
  let userId = localStorage.getItem('amber_ink_userId');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('amber_ink_userId', userId);
  }
  return userId;
};

const GlassCard = ({ children, className = "", ...props }) => (
  <div className={`backdrop-blur-xl bg-white/40 border border-white/30 shadow-xl rounded-[2.5rem] ${className}`} {...props}>
    {children}
  </div>
);

const LoadingScreen = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#fff7e6] to-[#ffedcc] animate-in fade-in duration-500">
    <div className="relative mb-8">
      <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-amber-500/40 animate-pulse">
        <Heart className="w-12 h-12 fill-current" />
      </div>
      <div className="absolute -top-4 -right-4 w-8 h-8 bg-amber-200 rounded-full blur-xl animate-bounce" />
    </div>
    <div className="text-center space-y-3">
      <h2 className="text-2xl font-bold text-amber-900 tracking-tight">琥珀の輝きを集めています...</h2>
      <p className="text-amber-700/60 text-sm font-medium animate-pulse">あなたの「生きた証」を準備中</p>
    </div>
    <div className="mt-12 flex gap-2">
      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
    </div>
  </div>
);

const StreakCalendar = ({ userData }) => {
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

export default function App() {
  const [userId, setUserId] = useState(getOrCreateUserId());
  const [userData, setUserData] = useState(null);
  const [mode, setMode] = useState('registration'); // 'registration', 'dashboard'
  const [regType, setRegType] = useState('chat'); // 'chat' or 'form'
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState(() => {
    const saved = localStorage.getItem('amber_ink_chat_history');
    if (saved) return JSON.parse(saved);
    return [
      { role: 'ai', text: 'こんにちは。Amber Inkへようこそ。私はあなたの「生きた証」を宝石のように守るお手伝いをします。' },
      { role: 'ai', text: 'まずは、あなたのお名前（ニックネームでも構いません）を教えていただけますか？' },
    ];
  });
  const [companionMessages, setCompanionMessages] = useState(() => {
    const saved = localStorage.getItem(`amber_ink_companion_history_${userId}`);
    if (saved) return JSON.parse(saved);
    return [];
  });
  const [isTypingCompanion, setIsTypingCompanion] = useState(false);
  const [companionSuggestions, setCompanionSuggestions] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // 5 turn (10 messages) limit
    const lastTurns = chatMessages.slice(-10);
    localStorage.setItem('amber_ink_chat_history', JSON.stringify(lastTurns));
  }, [chatMessages]);
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`amber_ink_companion_history_${userId}`, JSON.stringify(companionMessages));
    }
    // Sync suggestions from the latest AI message
    const lastMsg = companionMessages[companionMessages.length - 1];
    if (lastMsg && lastMsg.role === 'ai' && lastMsg.suggestions) {
      setCompanionSuggestions(lastMsg.suggestions);
    } else if (lastMsg && lastMsg.role === 'user') {
      setCompanionSuggestions([]);
    }
  }, [companionMessages, userId]);

  const [inputValue, setInputValue] = useState('');
  const [formData, setFormData] = useState({ name: '', interest: '', emergency: '' });
  const chatEndRef = useRef(null);
  const companionChatEndRef = useRef(null);

  // 初回データ読込
  useEffect(() => {
    // Check for uid in URL (Auto-login from email)
    const urlParams = new URLSearchParams(window.location.search);
    const uidFromUrl = urlParams.get('uid');

    if (uidFromUrl && uidFromUrl !== userId) {
      console.log('Detecting UID from URL:', uidFromUrl);
      localStorage.setItem('amber_ink_userId', uidFromUrl);
      setUserId(uidFromUrl);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return; // Wait for next effect with updated userId
    }

    const fetchUserData = async () => {
      if (!userId) return;
      try {
        let response = await fetch(`${import.meta.env.VITE_GET_USER_DATA_URL}?userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${userId}`
          }
        });
        if (response.ok) {
          let data = await response.json();
          setUserData(data);

          // Trigger Check-in before showing dashboard ONLY if not already checked in today
          const todayStr = new Date().toISOString().split('T')[0];
          const lastCheckin = localStorage.getItem(`amber_ink_last_checkin_${userId}`);

          if (lastCheckin !== todayStr && !data.checkins.some(c => c.startsWith(todayStr))) {
            try {
              console.log("Triggering daily auto-checkin...");
              await fetch(import.meta.env.VITE_CHECKIN_URL, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${userId}`
                },
                body: JSON.stringify({ userId })
              });
              localStorage.setItem(`amber_ink_last_checkin_${userId}`, todayStr);
              console.log("Auto-Checkin successful");

              // Update user data
              response = await fetch(`${import.meta.env.VITE_GET_USER_DATA_URL}?userId=${userId}`, {
                headers: {
                  'Authorization': `Bearer ${userId}`
                }
              });
              data = await response.json();
              setUserData(data);
            } catch (checkinError) {
              console.error("Auto-Checkin failed:", checkinError);
            }
          } else {
            console.log("Already checked in today, skipping auto-checkin.");
            // Sync local storage if the server already had today's checkin
            if (data.checkins.some(c => c.startsWith(todayStr))) {
              localStorage.setItem(`amber_ink_last_checkin_${userId}`, todayStr);
            }
          }

          setMode('dashboard');
        }
      } catch (error) {
        console.error("Load error:", error);
      } finally {
        setTimeout(() => setIsLoading(false), 1500); // 演出のためのディレイ
      }
    };
    fetchUserData();
  }, [userId]);

  // 定期的なデータ更新 (プロトタイプ用の簡易的なポーリング)
  useEffect(() => {
    if (mode === 'dashboard') {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_GET_USER_DATA_URL}?userId=${userId}`, {
            headers: { 'Authorization': `Bearer ${userId}` }
          });
          if (response.ok) {
            const data = await response.json();
            setUserData(data);
          }
        } catch (e) { }
      }, 30 * 1000);
      return () => clearInterval(interval);
    }
  }, [mode, userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    const scrollToBottom = () => {
      companionChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    if (mode === 'companion') {
      // Small delay ensures content is rendered before scrolling
      const timer = setTimeout(scrollToBottom, 50);
      return () => clearTimeout(timer);
    }
  }, [mode, companionMessages, isTypingCompanion]);

  const saveUserData = async (data) => {
    try {
      const response = await fetch(import.meta.env.VITE_REGISTER_USER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`
        },
        body: JSON.stringify({
          userId: userId,
          name: data.name,
          interest: data.interest,
          emergency_contact: data.emergency
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const result = await response.json();
      console.log('User registered:', result);

      // 再取得してダッシュボードへ
      setIsLoading(true);
      setTimeout(() => setMode('dashboard'), 800);
    } catch (error) {
      console.error('Registration error:', error);
      alert(`登録に失敗しました: ${error.message}`);
    } finally {
      setTimeout(() => setIsLoading(false), 2000);
    }
  };

  const initiateCompanionGreeting = async () => {
    setIsTypingCompanion(true);
    setCompanionSuggestions([]);

    const hour = new Date().getHours();
    let greeting = "こんにちは。";
    if (hour >= 5 && hour < 11) greeting = "おはよう。今日も話かけてくれて、とても嬉しいです。";
    else if (hour >= 18 || hour < 5) greeting = "こんばんは。今日も一日お疲れ様。夜はゆっくり心身を休めてくださいね。";
    else greeting = "こんにちは。少し一息つかない？あなたのこと、もっと聞かせて。";

    // 1. Start fetching AI proactive comment in parallel
    const aiPromise = fetch(import.meta.env.VITE_COMPANION_AGENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`
      },
      body: JSON.stringify({ userId, isInitial: true })
    }).then(r => r.json()).catch(e => {
      console.error("Companion AI error:", e);
      return null;
    });

    // 2. Immediate greeting animation
    await delay(1200);
    setCompanionMessages([{ role: 'ai', text: greeting }]);
    setIsTypingCompanion(false);

    // 3. Wait for AI response
    setIsTypingCompanion(true);
    const data = await aiPromise;

    if (data && data.text) {
      const messages = data.text.split('[SPLIT]').filter(t => t.trim());
      let currentMessages = [{ role: 'ai', text: greeting }];

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        setIsTypingCompanion(true);
        const waitTime = Math.max(1500, msg.length * 50);
        await delay(waitTime);

        const msgObj = { role: 'ai', text: msg.trim() };
        if (i === messages.length - 1) {
          msgObj.suggestions = data.suggestions || [];
        }
        currentMessages = [...currentMessages, msgObj];
        setCompanionMessages(currentMessages);
        setIsTypingCompanion(false);
      }
    } else {
      setIsTypingCompanion(false);
    }
  };

  const clearCompanionHistory = async () => {
    if (window.confirm('これまでの琥珀との会話履歴を消去しますか？（この操作は取り消せません）')) {
      setCompanionMessages([]);
      setCompanionSuggestions([]);
      setIsMenuOpen(false);
      localStorage.removeItem(`amber_ink_companion_history_${userId}`);
      // 履歴消去後、再び挨拶を実行
      await initiateCompanionGreeting();
    }
  };

  const startCompanionChat = async () => {
    setMode('companion');
    if (companionMessages.length === 0) {
      await initiateCompanionGreeting();
    }
  };

  const handleSendCompanionMessage = async (overrideMsg = null) => {
    if (!overrideMsg && (!inputValue.trim() || isTypingCompanion)) return;
    const userMsg = overrideMsg || inputValue.trim();
    if (!overrideMsg) setInputValue('');

    const newMessages = [...companionMessages, { role: 'user', text: userMsg }];
    setCompanionMessages(newMessages);
    setIsTypingCompanion(true);

    // 特殊対応: プロフィール確認をローカルで処理 (LLMを通さず機械的に出力)
    if (userMsg === "自分のプロフィール（名前や興味関心）を確認したい") {
      await delay(1000);
      const profileText = `現在の登録内容は以下の通りです：\n\n` +
        `・お名前: ${userData.name}\n` +
        `・興味・関心: ${userData.interest}\n` +
        `・現在の連絡先: ${userData.contact} (${userData.contact_method})\n` +
        `・緊急連絡先: ${userData.emergency_contact} (${userData.emergency_method})\n\n` +
        `内容に変更はありますか？（「名前を○○に変えて」などと伝えていただければ修正します）`;

      const suggestions = [
        { label: "変更なし", value: "特に変更はありません。ありがとう。" },
        { label: "変更したい", value: "内容を少し修正してほしいな" }
      ];
      const finalMessages = [...newMessages, { role: 'ai', text: profileText, suggestions }];
      setCompanionMessages(finalMessages);
      setIsTypingCompanion(false);
      return;
    }

    try {
      const response = await fetch(import.meta.env.VITE_COMPANION_AGENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`
        },
        body: JSON.stringify({ userId, message: userMsg })
      });
      const data = await response.json();

      // プロフィールが更新された場合はローカルデータも同期
      if (data.updated_profile && Object.keys(data.updated_profile).length > 0) {
        setUserData(prev => ({ ...prev, ...data.updated_profile }));
      }

      if (data.text) {
        const messages = data.text.split('[SPLIT]').filter(t => t.trim());
        let currentMessages = [...newMessages];

        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          setIsTypingCompanion(true);
          const waitTime = Math.max(1500, msg.length * 50);
          await delay(waitTime);

          const msgObj = { role: 'ai', text: msg.trim() };
          if (i === messages.length - 1) {
            msgObj.suggestions = data.suggestions || [];
          }
          currentMessages = [...currentMessages, msgObj];
          setCompanionMessages(currentMessages);
          setIsTypingCompanion(false);
        }
      }
    } catch (e) {
      console.error("Companion chat error:", e);
    } finally {
      setIsTypingCompanion(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const userMsg = inputValue;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputValue('');

    setIsTyping(true);

    try {
      const response = await fetch(import.meta.env.VITE_CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`
        },
        body: JSON.stringify({ userId: userId, message: userMsg, prevMessages: chatMessages.slice(-20) })
      });
      const data = await response.json();

      // [SPLIT] でメッセージを分割して順次表示
      const messages = data.text.split('[SPLIT]').map(s => s.trim()).filter(s => s);

      for (const msg of messages) {
        // 前のメッセージの長さに応じてディレイを計算 (200ms - 800ms)
        const msgDelay = Math.min(Math.max(msg.length * 20, 200), 1600);
        await delay(msgDelay);
        setChatMessages(prev => [...prev, { role: 'ai', text: msg }]);
      }

      setIsTyping(false);

      if (data.is_complete) {
        // AIによる登録完了時、画面を切り替えるために少し待機して再読込
        setTimeout(() => {
          setIsLoading(true);
          setTimeout(() => {
            setMode('dashboard');
            setIsLoading(false);
          }, 2000);
        }, 3000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      setChatMessages(prev => [...prev, { role: 'ai', text: '申し訳ありません。接続に失敗しました。琥珀の輝きを取り戻すため、もう一度お試しいただけますか？' }]);
    }
  };

  const triggerDeliveryTest = async () => {
    console.log(import.meta.env.VITE_RUN_AI_ANALYZER_URL);
    console.log(import.meta.env.VITE_RUN_DELIVERY_ENGINE_URL);
    try {
      setIsLoading(true);
      // 1. Run AI Analyzer
      let res = await fetch(import.meta.env.VITE_RUN_AI_ANALYZER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`
        },
        body: JSON.stringify({ userId })
      });

      let data = await res.json();
      console.log('AI Analyzer result:', data);

      // 2. Run Delivery Engine
      res = await fetch(import.meta.env.VITE_RUN_DELIVERY_ENGINE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`
        },
        body: JSON.stringify({ userId })
      });

      data = await res.json();
      console.log(data);
      alert('配信テストを実行しました。メール（またはログ）を確認してください。');
    } catch (e) {
      alert('テスト実行中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff7e6] to-[#ffedcc] text-slate-800 p-4 font-sans max-w-md mx-auto relative overflow-hidden">
      {isLoading && <LoadingScreen />}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 -left-20 w-48 h-48 bg-orange-400/20 rounded-full blur-3xl" />

      <header className="flex items-center justify-between mb-8 pt-4 relative z-10 px-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-amber-900 leading-none">Amber Ink</h1>
            <p className="text-[10px] text-amber-700/70 font-medium uppercase tracking-widest mt-1">Preserving Life's Glow</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'registration' && (
            <button
              onClick={() => setRegType(regType === 'chat' ? 'form' : 'chat')}
              className="p-2 bg-white/50 backdrop-blur-md rounded-full border border-white/50 text-amber-700 shadow-sm"
            >
              {regType === 'chat' ? <Zap className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
            </button>
          )}
          {mode === 'companion' && (
            <button
              onClick={() => setMode('dashboard')}
              className="p-2 bg-white/50 backdrop-blur-md rounded-full border border-white/50 text-amber-700 shadow-sm active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {mode === 'registration' ? (
        <div className="relative z-10 flex flex-col h-[78vh]">
          {regType === 'chat' ? (
            <>
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
            </>
          ) : (
            <GlassCard className="p-8 space-y-6 animate-in zoom-in duration-300">
              <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                <Settings className="w-5 h-5" />
                <h2>クイック登録</h2>
              </div>
              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-amber-700 mb-1 ml-2">お名前</label>
                  <input className="w-full p-4 rounded-2xl bg-white/50 border border-white/50 focus:ring-2 ring-amber-400 outline-none" placeholder="琥珀 太郎" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-amber-700 mb-1 ml-2">興味・関心</label>
                  <input className="w-full p-4 rounded-2xl bg-white/50 border border-white/50 focus:ring-2 ring-amber-400 outline-none" placeholder="園芸、最新ニュース" onChange={e => setFormData({ ...formData, interest: e.target.value })} />
                </div>
                <div>
                  <label className="block text-amber-700 mb-1 ml-2">緊急連絡先 (Email・携帯番号など)</label>
                  <input className="w-full p-4 rounded-2xl bg-white/50 border border-white/50 focus:ring-2 ring-amber-400 outline-none" placeholder="Email、電話番号、LINE IDなど" onChange={e => setFormData({ ...formData, emergency: e.target.value })} />
                </div>
                <button
                  onClick={() => saveUserData(formData)}
                  className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
                >
                  登録を完了する
                </button>
              </div>
            </GlassCard>
          )}
        </div>
      ) : mode === 'companion' ? (
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
                onClick={() => handleSendCompanionMessage("自分のプロフィール（名前や興味関心）を確認したい")}
                className="px-3 py-1.5 bg-white/60 backdrop-blur-md border border-white/50 rounded-full text-[10px] font-bold text-amber-800 shadow-xs active:scale-95 transition-transform whitespace-nowrap"
              >
                プロフィール確認
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
      ) : (
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
            <GlassCard
              onClick={triggerDeliveryTest}
              className="p-6 flex flex-col items-center gap-3 active:scale-95 transition-transform bg-amber-100/50 border-amber-200/50 cursor-pointer col-span-2"
            >
              <div className="w-12 h-12 bg-amber-200 rounded-2xl flex items-center justify-center">
                <Send className="w-7 h-7 text-amber-700" />
              </div>
              <span className="text-xs font-bold text-amber-900 uppercase">配信テストを実行</span>
            </GlassCard>
          </div>

          <div className="p-6 rounded-3xl border border-white/40 bg-white/20 backdrop-blur-sm italic text-amber-900/60 text-center text-xs font-medium">
            "どんなに小さな一滴も、いつか美しい琥珀になる。"
          </div>
        </div>
      )}
    </div>
  );
}
