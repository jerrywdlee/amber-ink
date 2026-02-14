import React, { useState, useEffect, useRef } from 'react';
import { AppHeader } from './components/AppHeader';
import { RegistrationView } from './components/RegistrationView';
import { DashboardView } from './components/DashboardView';
import { CompanionChatView } from './components/CompanionChatView';
import { EmergencyStatusView } from './components/EmergencyStatusView';
import { JewelryBoxView } from './components/JewelryBoxView';
import { AdminView } from './components/AdminView';
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
  const [mode, setMode] = useState('registration'); // 'registration', 'dashboard', 'companion', 'jewelryBox'
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
    // 16 turn (32 messages) limit
    const lastTurns = chatMessages.slice(-32);
    localStorage.setItem('amber_ink_chat_history', JSON.stringify(lastTurns));
  }, [chatMessages]);
  useEffect(() => {
    if (userId) {
      // 16 turn (32 messages) limit for storage
      const lastTurns = companionMessages.slice(-32);
      localStorage.setItem(`amber_ink_companion_history_${userId}`, JSON.stringify(lastTurns));
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
  const [formData, setFormData] = useState({ name: '', interest: '', contact: '', emergency: '' });
  const chatEndRef = useRef(null);
  const companionChatEndRef = useRef(null);

  const routeProcessed = useRef(false);
  const autoChatTriggerPending = useRef(false);

  // 初回データ読込
  useEffect(() => {
    if (routeProcessed.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const uidFromUrl = urlParams.get('uid');
    const viewMode = urlParams.get('view');
    const autoChat = urlParams.get('autochat');
    console.log('[DEBUG] Initial Hydration:', { uidFromUrl, viewMode, currentUserId: userId });

    const fetchUserData = async (id, isEmergency = false, auto = false) => {
      if (!id) return;
      try {
        const url = new URL(import.meta.env.VITE_GET_USER_DATA_URL);
        url.searchParams.append('userId', id);
        url.searchParams.append('includeJewelryMeta', '1');
        // 家族が閲覧している場合は絶対に自動チェックインを発生させない
        if (auto && !isEmergency) {
          url.searchParams.append('autoCheckin', '1');
        }

        const res = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${id}`
          }
        });
        console.log('User data response:', res);

        if (res.ok) {
          const data = await res.json();
          if (data && data.userId) {
            setUserData(data);
            if (isEmergency) {
              setMode('emergency');
              console.log('Mode set to emergency');
            } else if (viewMode === 'chat') {
              setMode('companion');
              if (autoChat === '1') {
                autoChatTriggerPending.current = true;
              }
            } else {
              if (mode === 'registration') setMode('dashboard');
            }
          }
        }
      } catch (e) {
        console.error("Fetch user error:", e);
      } finally {
        setTimeout(() => setIsLoading(false), 800);
      }
    };

    if (viewMode === 'admin') {
      console.log('Admin View mode detected');
      routeProcessed.current = true;
      setMode('admin');
      // URLを消さないように変更（管理者がリロードしやすくするため）
      setIsLoading(false);
      return;
    }

    if (viewMode === 'emergency' && uidFromUrl) {
      console.log('Emergency View mode detected for UID:', uidFromUrl);
      routeProcessed.current = true;
      setUserId(uidFromUrl);
      fetchUserData(uidFromUrl, true, false);
      // URLを消さないように変更（家族が共有・ブックマークしやすくするため）
      return;
    }

    if (uidFromUrl) {
      console.log('Detecting UID from URL:', uidFromUrl);
      routeProcessed.current = true;

      // 他人のユーザーIDで上書きする場合は履歴をクリア
      if (userId && userId !== uidFromUrl) {
        localStorage.removeItem(`amber_ink_chat_${userId}`);
        localStorage.removeItem(`amber_ink_companion_chat_${userId}`);
        setChatMessages([]);
        setCompanionMessages([]);
      }

      localStorage.setItem('amber_ink_userId', uidFromUrl);
      setUserId(uidFromUrl);

      // 既に userId が一致している場合でも、最新データを取得しチェックインを発生させる
      fetchUserData(uidFromUrl, false, true);

      // SecurityError対策: パスが // で始まると別ドメイン(プロトコル相対URL)と見なされるため、単一の / に正規化
      // また、ユーザーが直打ちする可能性のある /checkIn パスもルートに正規化する
      const cleanPath = '/' + window.location.pathname.replace(/^\/+/, '').replace(/^checkIn\/?/, '');
      window.history.replaceState({}, document.title, cleanPath);
      return;
    }

    if (userId) {
      routeProcessed.current = true;
      fetchUserData(userId, false, true);
    } else {
      setIsLoading(false);
    }
  }, [userId]);

  // Handle Automatic Chat Trigger
  useEffect(() => {
    if (mode === 'companion' && userData && autoChatTriggerPending.current && !isTypingCompanion) {
      autoChatTriggerPending.current = false;
      console.log('[AUTO-CHAT] Triggering previous delivery recap...');
      handleSendCompanionMessage("前回届いた配信の内容を教えて");
    }
  }, [mode, userData, isTypingCompanion]);

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
          contact: data.contact,
          emergency_contact: data.emergency_contact || data.emergency
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setUserData(updated);
        setMode('dashboard');
      }
    } catch (e) {
      alert('登録中にエラーが発生しました');
    } finally {
      setTimeout(() => setIsLoading(false), 2000);
    }
  };

  const updateUserMetadata = async (metadata) => {
    try {
      const res = await fetch(import.meta.env.VITE_REGISTER_USER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`
        },
        body: JSON.stringify({
          userId,
          ...metadata
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setUserData(updated);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Metadata update failed:", e);
      return false;
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
      body: JSON.stringify({ userId, isInitial: true, prevMessages: [] })
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

  const startJewelryBox = async () => {
    setIsLoading(true);
    try {
      const url = new URL(import.meta.env.VITE_GET_USER_DATA_URL);
      url.searchParams.append('userId', userId);
      url.searchParams.append('includeJewelryMeta', '1');

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${userId}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }
    } catch (e) {
      console.error("Fetch Jewelry Box meta error:", e);
    } finally {
      setIsLoading(false);
      setMode('jewelryBox');
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
        `・見守りサポーター: ${userData.emergency_contact} (${userData.emergency_method})\n\n` +
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
        body: JSON.stringify({ userId, message: userMsg, prevMessages: companionMessages.slice(-16) })
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

  const [typingMessage, setTypingMessage] = useState('入力中...');

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;
    const userMsg = inputValue.trim();
    setInputValue('');
    const newMessages = [...chatMessages, { role: 'user', text: userMsg }];
    setChatMessages(newMessages);
    setIsTyping(true);
    setTypingMessage('入力中...');

    try {
      const res = await fetch(import.meta.env.VITE_CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`
        },
        body: JSON.stringify({ userId: userId, message: userMsg, prevMessages: chatMessages.slice(-16) })
      });
      const data = await res.json();

      console.log('Chat response:', data);

      // [SPLIT] でメッセージを分割して順次表示
      const messages = data.text.split('[SPLIT]').map(s => s.trim()).filter(s => s);

      for (const msg of messages) {
        // 前のメッセージの長さに応じてディレイを計算 (200ms - 800ms)
        const msgDelay = Math.min(Math.max(msg.length * 20, 200), 1600);
        await delay(msgDelay);
        setChatMessages(prev => [...prev, { role: 'ai', text: msg }]);
      }

      if (data.is_complete) {
        if (data.user) setUserData(data.user);
        setTypingMessage('会員作成中...');
        setIsTyping(true);
        // 登録成功時にオンボーディングの会話履歴をクリア
        localStorage.removeItem('amber_ink_chat_history');
        // AIによる登録完了時、画面を切り替えるために少し待機して再読込
        await delay(2000);
        setIsLoading(true);
        await delay(2000);
        setMode('dashboard');
        setIsLoading(false);
        setTypingMessage('入力中...');
      }

      setIsTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      setChatMessages(prev => [...prev, { role: 'ai', text: '申し訳ありません。接続に失敗しました。琥珀の輝きを取り戻すため、もう一度お試しいただけますか？' }]);
    }
  };

  const triggerDeliveryTest = async () => {
    setMode('companion');
    setIsMenuOpen(false);
    setIsTypingCompanion(true);
    await delay(800);

    const introMsg = `テスト配信ですね。宛先はどちらにしますか？\n\n` +
      `・自分(${userData.contact_method})：${userData.contact}\n` +
      `・見守りサポーター(${userData.emergency_method})：${userData.emergency_contact}`;

    const suggestions = [
      { label: "自分宛にテスト", value: "自分宛に配信テストをお願いします" },
      { label: "サポーター宛にテスト", value: "見守りサポーター宛に配信テストをお願いします" }
    ];

    setCompanionMessages(prev => [...prev, { role: 'ai', text: introMsg, suggestions }]);
    setIsTypingCompanion(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff7e6] to-[#ffedcc] text-slate-800 p-4 font-sans max-w-md mx-auto relative overflow-hidden">
      {isLoading && <LoadingScreen />}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 -left-20 w-48 h-48 bg-orange-400/20 rounded-full blur-3xl" />

      {/* 隔離設計：緊急ビューまたは管理ビューではヘッダー（メニュー等）を表示しない */}
      {mode !== 'emergency' && mode !== 'admin' && (
        <AppHeader mode={mode} regType={regType} setRegType={setRegType} setMode={setMode} />
      )}

      {mode === 'emergency' ? (
        <EmergencyStatusView userId={userId} userData={userData} />
      ) : mode === 'admin' ? (
        <AdminView userId={userId} />
      ) : mode === 'registration' ? (
        <RegistrationView
          regType={regType} chatMessages={chatMessages} isTyping={isTyping}
          typingMessage={typingMessage}
          chatEndRef={chatEndRef}
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
      ) : mode === 'jewelryBox' ? (
        <JewelryBoxView userData={userData} updateUserMetadata={updateUserMetadata} />
      ) : (
        <DashboardView
          userData={userData}
          startCompanionChat={startCompanionChat}
          startJewelryBox={startJewelryBox}
          triggerDeliveryTest={triggerDeliveryTest}
        />
      )}
    </div>
  );
}
