import React, { useState, useEffect, useRef } from 'react';
import { AppHeader } from './components/AppHeader';
import { RegistrationView } from './components/RegistrationView';
import { DashboardView } from './components/DashboardView';
import { CompanionChatView } from './components/CompanionChatView';
import { LoadingScreen } from './components/LoadingScreen';
import { delay } from './utils/helpers';

// --- Configuration ---
const appId = import.meta.env.VITE_APP_ID || 'amber-ink';

// --- Configuration ---

const getOrCreateUserId = () => {
  let uid = localStorage.getItem('amber_ink_userId');
  if (!uid) {
    uid = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('amber_ink_userId', uid);
  }
  return uid;
};

export default function App() {
  const [userId, setUserId] = useState(getOrCreateUserId());
  const [userData, setUserData] = useState(null);
  const [mode, setMode] = useState('registration'); // 'registration', 'dashboard', 'companion'
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
        const res = await fetch(`${import.meta.env.VITE_GET_USER_DATA_URL}?userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${userId}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.userId) {
            setUserData(data);
            if (mode === 'registration') setMode('dashboard');
          }
        }
      } catch (e) { console.error("Fetch user error:", e); }
      finally { setTimeout(() => setIsLoading(false), 800); }
    };
    fetchUserData();
  }, [userId]);

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
      setIsLoading(true);
      const res = await fetch(import.meta.env.VITE_REGISTER_USER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`
        },
        body: JSON.stringify({
          userId,
          name: data.name,
          interest: data.interest,
          emergency_contact: data.emergency_contact || data.emergency
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setUserData(updated);
        // 登録成功時にオンボーディングの会話履歴をクリア
        localStorage.removeItem('amber_ink_chat_history');
        setMode('dashboard');
      }
    } catch (e) {
      alert('登録中にエラーが発生しました');
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
    }).then(r => r.json()).catch(e => null);

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
      const res = await fetch(import.meta.env.VITE_COMPANION_AGENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`
        },
        body: JSON.stringify({ userId, message: userMsg })
      });
      const data = await res.json();

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
      setIsTypingCompanion(false);
    } finally {
      setIsTypingCompanion(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;
    const userMsg = inputValue.trim();
    setInputValue('');
    const newMessages = [...chatMessages, { role: 'user', text: userMsg }];
    setChatMessages(newMessages);
    setIsTyping(true);

    try {
      const res = await fetch(import.meta.env.VITE_CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`
        },
        body: JSON.stringify({ userId: userId, message: userMsg, prevMessages: chatMessages.slice(-20) })
      });
      const data = await res.json();

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
        await delay(3000);
        setIsLoading(true);
        await delay(2000);
        setMode('dashboard');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      setChatMessages(prev => [...prev, { role: 'ai', text: '申し訳ありません。接続に失敗しました。琥珀の輝きを取り戻すため、もう一度お試しいただけますか？' }]);
    }
  };

  const triggerDeliveryTest = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${import.meta.env.VITE_CLOUD_FUNCTION_URL}/triggerDelivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userId}` },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
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

      <AppHeader mode={mode} regType={regType} setRegType={setRegType} setMode={setMode} />

      {mode === 'registration' ? (
        <RegistrationView
          regType={regType} chatMessages={chatMessages} isTyping={isTyping} chatEndRef={chatEndRef}
          inputValue={inputValue} setInputValue={setInputValue} handleSendMessage={handleSendMessage}
          formData={formData} setFormData={setFormData} saveUserData={saveUserData}
        />
      ) : mode === 'companion' ? (
        <CompanionChatView
          companionMessages={companionMessages} isTypingCompanion={isTypingCompanion}
          companionChatEndRef={companionChatEndRef} isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen}
          clearCompanionHistory={clearCompanionHistory} handleSendCompanionMessage={handleSendCompanionMessage}
          triggerDeliveryTest={triggerDeliveryTest}
          companionSuggestions={companionSuggestions} inputValue={inputValue} setInputValue={setInputValue}
        />
      ) : (
        <DashboardView userData={userData} startCompanionChat={startCompanionChat} triggerDeliveryTest={triggerDeliveryTest} />
      )}
    </div>
  );
}
