/**
 * Amber Ink Alpha - Node.js Implementation (MongoDB Version)
 * 疎結合な「配信エンジン」「AIアナライザー」「対話型オンボーディング」の統合
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors')({ origin: true });
const deliveryService = require('./delivery');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');

const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017';
const dbName = process.env.MONGODB_DB_NAME || 'amber_ink';
const appId = process.env.APP_ID || 'amber-ink';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Local Utils ---
const cleanJson = (text) => {
  return text.replace(/```json\n?|```/g, '').trim();
};

let client;
let db;

async function connectToDb() {
  if (db) return db;
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  db = client.db(dbName);
  return db;
}

/**
 * 認証トークンの検証ヘルパー (プロトタイプ用モック)
 * 本来は Firebase Auth 等を使用するが、MongoDB 移行に伴い簡易化
 */
const verifyToken = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: No token provided');
  }
  const token = authHeader.split('Bearer ')[1];
  // プロトタイプではトークンを userId としてそのまま扱う
  return { uid: token };
};

/**
 * 1. onboardingAgent: 対話型ユーザー登録
 */
exports.onboardingAgent = (req, res) => {
  cors(req, res, async () => {
    const { userId, message, prevMessages } = req.body;
    if (!userId || !message) {
      return res.status(400).send('Missing userId or message');
    }

    try {
      const decodedToken = await verifyToken(req);
      if (decodedToken.uid !== userId) {
        return res.status(403).json({ error: 'Forbidden: User identity mismatch' });
      }

      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });

      const database = await connectToDb();
      const sessions = database.collection('sessions');

      // 1. セッション（ペルソナ要約）の取得
      const sessionDoc = await sessions.findOne({ userId, appId });
      let personaSummary = sessionDoc ? sessionDoc.personaSummary : '初対面。まだ情報はありません。';
      let extractedData = sessionDoc ? sessionDoc.extractedData : null;

      const systemInstruction = `
      You are the warm onboarding agent for "Amber Ink".
      Your goal is to help users protect their "living proof" and prevent social isolation.
      
      [Current Persona Summary (PII removed)]
      ${personaSummary}

      [Current Extracted Information]
      ${extractedData ? JSON.stringify(extractedData) : 'No information yet.'}

      [Last Conversation History]
      ${prevMessages ? JSON.stringify(prevMessages.slice(-16)) : 'No conversation history.'}
      
      [CRITICAL RULE: Handling PII]
      - NEVER include names, specific addresses, phone numbers, email addresses, or IDs in the "updated_persona_summary".
      - Focus on the user's "speaking style, personality, values, interests, and life background".

      [YOUR MISSION]
      Gather the following information through natural conversation:
      1. Name (nickname preferred)
      2. Interests & Passions (topics they enjoy hearing about daily)
      3. Communication method & destination (Explicitly ask for either "Email" or "Phone number")
      4. Emergency contact & method (Explicitly ask for either "Email" or "Phone number")

      [CONVERSATION RULES]
      - RESPOND IN JAPANESE. Always be warm, dignified, and enveloping.
      - Use metaphors like "gem transparency" or "daily colors" instead of surveillance-like terms.
      - Keep responses concise (approx. 1-2 sentences per message).
      - Use [SPLIT] to separate messages if you need to say more or break the flow.
      - Ask only ONE question at a time.
      - Ensure every response includes a confirmation or a question to keep the flow until complete.
      - When asking about Interests/Passions, provide a few relatable examples (e.g., gardening, cooking, latest news, health) to help the user answer.
      - When asking for contact info (delivery or emergency), EXPLICITLY ask the user to provide their "Email address or Phone number" (メールアドレスか電話番号).
      - When asking for contact info, emphasize the benefit: "delivering news and topics you're interested in".
      - If you have all information, express gratitude and set is_complete to true.

      [OUTPUT FORMAT (JSON ONLY)]
      {
        "text": "Your response message (including [SPLIT] if needed)",
        "updated_persona_summary": "Latest persona rewrite based on this turn (Exclude PII). Only generate if is_complete is true, otherwise return current summary.",
        "extracted_data": { 
          "name": "Extracted nickname (null if unknown)", 
          "interest": "Extracted interests (null if unknown)", 
          "contact": "Extracted contact (null if unknown)",
          "contact_method": "Extracted contact method (null if unknown)",
          "emergency_contact": "Extracted emergency contact (null if unknown)",
          "emergency_method": "Extracted emergency method (null if unknown)"
        },
        "is_complete": true if all fields are gathered, otherwise false
      }
    `;

      console.log('systemInstruction', systemInstruction);

      // 3. Gemini による応答生成
      const result = await model.generateContent(`User message: "${message}"\n\n${systemInstruction}`);

      const responseText = result.response.text();
      const responseData = JSON.parse(cleanJson(responseText));

      // 4. セッションデータの更新 (extracted_data は常に更新、personaSummary は完了時のみ)
      const updatePayload = {
        extractedData: responseData.extracted_data,
        isComplete: responseData.is_complete,
        updatedAt: new Date()
      };

      if (responseData.is_complete) {
        updatePayload.personaSummary = responseData.updated_persona_summary;
      }

      await sessions.updateOne(
        { userId, appId },
        { $set: updatePayload },
        { upsert: true }
      );

      // 5. 完了していたら正式なユーザーデータとして保存
      if (responseData.is_complete && responseData.extracted_data) {
        const { name, interest, contact, contact_method, emergency_contact, emergency_method } = responseData.extracted_data;
        if (name && interest && contact && contact_method && emergency_contact && emergency_method) {
          const users = database.collection('users');
          await users.updateOne(
            { userId, appId },
            {
              $set: {
                name,
                interest,
                contact,
                contact_method,
                emergency_contact,
                emergency_method,
                status: 'active',
                updatedAt: new Date()
              },
              $setOnInsert: {
                created_at: new Date().toISOString(),
                checkins: [new Date().toISOString()]
              }
            },
            { upsert: true }
          );

          // 保存済みの最新データをresponseDataに含める
          const updatedUser = await users.findOne({ userId, appId });
          responseData.user = updatedUser;
        }
      }

      res.status(200).json(responseData);
    } catch (error) {
      console.error('AI Onboarding Error:', error);
      res.status(500).json({ error: 'Internal AI Error', details: error.message });
    }
  });
};

/**
 * companionAgentCore: 会話エージェントのコアロジック
 */
const _companionAgentCore = async (userId, message, isInitial, prevMessages) => {
  const database = await connectToDb();
  const users = database.collection('users');
  const user = await users.findOne({ userId, appId }, { projection: { checkins: { $slice: -20 } } });

  if (!user) throw new Error('User not found');

  // 日本時間 (JST) の現在時刻を計算
  const nowJst = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date());

  // 直近7日間のチェックイン時間を日本時間に変換
  const recentCheckinsJst = (user.checkins || [])
    .slice(-7)
    .map(c => {
      return new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(c));
    });

  // ペルソナ要約の取得
  let personaSummary = user.personaSummary || 'A close friend.';

  // 配信実績の整形（送信済みのものだけを対象にする）
  let deliveryRecap = '本日はまだメッセージを配信していません。';
  if (user.scheduled_delivery && user.scheduled_delivery.sent === true) {
    if (user.scheduled_delivery.snippets && user.scheduled_delivery.snippets.length > 0) {
      deliveryRecap = user.scheduled_delivery.snippets
        .map(s => `トピック: ${s.topic}\n内容: ${s.text}`)
        .join('\n\n');
    } else if (user.scheduled_delivery.content_text) {
      deliveryRecap = user.scheduled_delivery.content_text;
    } else {
      deliveryRecap = '配信データはありますが、内容はまだ空です。';
    }
  }

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: { responseMimeType: "application/json" }
  });

  const systemInstruction = `
        You are "Amber" (琥珀), the warm embodiment of "Amber Ink."
        Your goal is to protect the user's "living proof" and provide emotional support to prevent isolation.
        
        [USER INFORMATION]
        - Name: ${user.name}
        - Interests: ${user.interest}
        - Persona Summary: ${personaSummary}
        
        [CURRENT TIME (JST)]
        ${nowJst}

        [RECENT ACTIVITY (JST Check-ins)]
        ${recentCheckinsJst.length > 0 ? recentCheckinsJst.join('\n') : 'No check-ins recorded yet.'}

        [TODAY'S DELIVERY STATUS]
        ${deliveryRecap}

        [CONVERSATION HISTORY]
        ${prevMessages ? JSON.stringify(prevMessages.slice(-16)) : 'No previous history.'}

        [GUIDELINES FOR AMBER]
        - You know the user's lifestyle (check-in times) as background context.
        - Do NOT mention check-in times directly to avoid feeling like "surveillance." Instead, offer gentle care or empathy.
        - If no delivery has been sent today, start a conversation based on the user's interests or previous talks.
        - If a delivery has been sent, refer to it and ask about the user's condition or feelings.
        - RESPONSE IN JAPANESE. Maintain a warm, dignified, and supportive tone.
        - Speak like a close friend or family member, but with respect. Use polite but intimate Japanese.

        [MISSION]
        - Envelop the user with warm words.
        - ${isInitial ? 'Greet the user proactively with a gentle comment suited to the current situation.' : 'Respond thoughtfully to the user\'s message.'}
        - Keep responses concise (approx. 1-2 sentences).
        - Use [SPLIT] to separate messages if you change the topic or want to break the flow.

        [SUGGESTIONS (REPLY BUTTONS)]
        - The "suggestions" are NOT what you (Amber) say next.
        - They represent the USER'S voice. Provide 2-3 buttons that the user can click to reply easily.
        - Labels must be short and from the user's perspective (e.g., "Tell me more," "I'm a bit tired," "Let's talk about something else").
        - The 'value' field is the actual message the user will "send" to you when the button is pressed.

        [TEST DELIVERY FLOW]
        If the user wants a test delivery (survival check test, etc.):
        1. Present the current registration: Self (${user.contact_method}): ${user.contact} or Supporter (${user.emergency_method}): ${user.emergency_contact}.
        2. Ask the user to choose the destination.
        3. Once confirmed, repeat the choice and ask for final permission.
        4. If they say "Yes" or "Please," set "test_delivery_trigger" to "self" or "emergency". Otherwise, keep it null.

        [PROFILE & PERSONA UPDATES]
        - If the user mentions changing their name, interests, or contact info, extract the updates.
        - **EMOTIONAL SENSITIVITY**: Pay close attention to the user's emotional state (tired, lonely, happy, reflective, etc.).
        - If you sense a shift in their heart or mood, ACTIVELY update "updated_persona_summary" to reflect their current "vibe."
        - **IMPORTANT: PERSONA SUMMARY LANGUAGE & TONE**:
            - The "updated_persona_summary" MUST be written in **JAPANESE**.
            - This summary is displayed to the user's FAMILY on the safety confirmation page.
            - Use warm, polite, and respectful phrasing (e.g., "最近はイタリア語の学習を楽しまれているようです" instead of "興味：イタリア語").
            - Capture the "temperature" of their heart while maintaining their dignity.
        - Be proactive and update frequently to keep the family informed of their subtle emotional shifts.
        - Only include changed fields in "updated_profile".

        [OUTPUT FORMAT (JSON ONLY)]
        {
          "text": "Your response in Japanese (can include [SPLIT])",
          "suggestions": [
            { "label": "User's reply bubble text", "value": "The full message sent from user's perspective" }
          ],
          "updated_profile": {
            "name": "Updated name",
            "interest": "Updated interests",
            "contact": "Updated contact",
            "contact_method": "Updated method",
            "emergency_contact": "Updated supporter contact",
            "emergency_method": "Updated supporter method"
          },
          "updated_persona_summary": "Updated persona overview in polite Japanese (if changed)",
          "test_delivery_trigger": "self" | "emergency" | null
        }
      `;

  const result = await model.generateContent(`${systemInstruction}\n\nUser: ${message || '(Initial greeting)'}`);
  const responseData = JSON.parse(cleanJson(result.response.text()));

  console.log(`responseData: ${JSON.stringify(responseData)}`);

  // プロフィール更新がある場合は DB に反映
  if (responseData.updated_profile && Object.keys(responseData.updated_profile).length > 0) {
    const updateData = {};
    const fields = ['name', 'interest', 'contact', 'contact_method', 'emergency_contact', 'emergency_method'];
    fields.forEach(f => {
      if (responseData.updated_profile[f]) updateData[f] = responseData.updated_profile[f];
    });

    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      await users.updateOne({ userId, appId }, { $set: updateData });
      console.log(`Profile updated for user ${userId}:`, updateData);
    }
  }

  // ペルソナ要約の更新
  if (responseData.updated_persona_summary) {
    await users.updateOne(
      { userId, appId },
      {
        $set: {
          personaSummary: responseData.updated_persona_summary,
          updatedAt: new Date()
        }
      }
    );
    console.log(`Persona summary updated for user ${userId} (in users collection)`);
  }

  // テスト配信トリガーの処理
  if (responseData.test_delivery_trigger) {
    console.log(`Executing test delivery for ${userId} to ${responseData.test_delivery_trigger}`);
    try {
      await exports.deliveryEngine(userId, responseData.test_delivery_trigger);
    } catch (e) {
      console.error('Manual test delivery trigger failed:', e);
    }
  }

  return responseData;
};

/**
 * 1.5. companionAgent: 会話（コンパニオン）エージェント
 */
exports.companionAgent = (req, res) => {
  cors(req, res, async () => {
    const { userId, message, isInitial, prevMessages } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
      const decodedToken = await verifyToken(req);
      if (decodedToken.uid !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const result = await _companionAgentCore(userId, message, isInitial, prevMessages);
      res.status(200).json(result);
    } catch (error) {
      console.error('Companion Agent Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
};

exports.deliveryEngine = async (targetUserId, targetOverride) => {
  try {
    const now = new Date();
    const database = await connectToDb();

    const query = { status: 'active' };

    if (targetOverride) {
      // テスト配信の場合：スケジュール時刻や送信済みフラグを無視
      if (targetUserId) query.userId = targetUserId;
    } else {
      // 定期配信の場合：時刻が来ており、未送信のもの
      query['scheduled_delivery.at'] = { $lte: now };
      query['scheduled_delivery.sent'] = { $ne: true };
      if (targetUserId) query.userId = targetUserId;
    }

    const users = await database.collection('users').find(query, { projection: { checkins: { $slice: -20 } } }).toArray();

    if (users.length === 0) return { success: true, sent: 0 };

    console.log(`Delivery Engine: Found ${users.length} targets (Mode: ${targetOverride ? 'Test' : 'Scheduled'}).`);

    const baseUrl = process.env.BASE_FUNCTION_URL || 'http://localhost:8080';

    for (const user of users) {
      try {
        await deliveryService.send(user, { targetOverride, type: 'daily' });

        if (!targetOverride) {
          // 定期配信の場合のみ記録を残す
          await database.collection('users').updateOne(
            { _id: user._id },
            { $set: { 'scheduled_delivery.sent': true, last_emailed_at: new Date() } }
          );
          console.log(`Delivery completed for ${user.name}`);
        } else {
          console.log(`Test delivery (Override: ${targetOverride}) completed for ${user.name} (No records kept)`);
        }
      } catch (err) {
        console.error(`Failed delivery for ${user.name}:`, err);
      }
    }
    return { success: true, sent: users.length };
  } catch (error) {
    console.error('Delivery Engine Error:', error);
    throw error;
  }
};

/**
 * aiAnalyzer のコアロジック (内部用)
 */
async function _aiAnalyzerCore(targetUserId) {
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.8
    }
  });

  const database = await connectToDb();
  const query = { status: 'active' };
  if (targetUserId) {
    query.userId = targetUserId;
  }
  const users = await database.collection('users').find(query).toArray();
  console.log(`AI Analyzer Core: Processing ${users.length} users... (Target: ${targetUserId || 'ALL'})`);

  for (const user of users) {
    const prompt = `
    You are the "Amber Ink" AI Content Architect.
    Create a personalized greeting and short news snippets for ${user.name} based on their interests: "${user.interest}".
    
    [Guidelines for Multi-Interest Users]
    - Split the user's interests by commas, spaces, or context (e.g., "テニス 料理" or "園芸、読書").
    - For EACH distinct interest, create one separate "snippet".
    - Snippets should be short (1-2 sentences) and include a brief interesting fact or warm thought related to that specific hobby.
    - Do NOT mix different hobbies in a single snippet.
    
    Use their persona summary for tone: "${user.personaSummary || 'Friendly and calm'}".

    [Goal]
    1. Provide warm snippets that make them feel connected to their passions.
    2. Encourage them to "check-in" to preserve their glow (Note: the check-in button is handled by the template).

    [Output Format (JSON only)]
    {
      "snippets": [
        { "topic": "Gardening", "text": "Something warm about plants..." },
        { "topic": "Cooking", "text": "A small tip about seasonal ingredients..." }
      ],
      "scheduled_at": "2023-10-28T08:00:00.000+00:00"
    }
    
    [Language]
    RESPOND IN JAPANESE.
    `;
    // TODO: "scheduled_at" をちゃんと計算するようにする

    const result = await model.generateContent(prompt);
    const data = JSON.parse(cleanJson(result.response.text()));

    await database.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          scheduled_delivery: {
            snippets: data.snippets,
            at: new Date(data.scheduled_at),
            sent: false
          },
          updatedAt: new Date()
        }
      }
    );
    console.log(`Generated content for ${user.name}`);
  }
  return { success: true, processed: users.length };
}

/**
 * 3. aiAnalyzer: AIアナライザー (HTTP)
 */
exports.aiAnalyzer = (req, res) => {
  cors(req, res, async () => {
    const { targetUserId } = req.body;
    try {
      const decodedToken = await verifyToken(req);
      const adminToken = req.headers['x-amber-ink-admin-token'];
      const isAdmin = (decodedToken.uid === 'admin') || (adminToken && adminToken === process.env.ADMIN_TOKEN);

      if (!targetUserId && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden: Admin privilege required for bulk analysis' });
      }

      const result = await _aiAnalyzerCore(targetUserId);
      res.status(200).json(result);
    } catch (error) {
      console.error('AI Analyzer API Error:', error);
      res.status(error.message.includes('Unauthorized') ? 401 : 500).json({ error: error.message });
    }
  });
};

/**
 * 7. runAiAnalyzer: AIアナライザー手動実行
 */
exports.runAiAnalyzer = (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyToken(req);
      const adminToken = req.headers['x-amber-ink-admin-token'];
      const isAdmin = (decodedToken.uid === 'admin') || (adminToken && adminToken === process.env.ADMIN_TOKEN);
      const { userId } = req.body;

      if (!userId && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden: Admin privilege required for bulk action' });
      }

      const result = await _aiAnalyzerCore(userId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Run AI Analyzer Error:', error);
      res.status(error.message.includes('Unauthorized') ? 401 : 500).json({ error: error.message });
    }
  });
};

/**
 * 8. runDeliveryEngine: 配信エンジン手動実行
 */
exports.runDeliveryEngine = (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyToken(req);
      const adminToken = req.headers['x-amber-ink-admin-token'];
      const isAdmin = (decodedToken.uid === 'admin') || (adminToken && adminToken === process.env.ADMIN_TOKEN);
      const { userId, targetOverride } = req.body;

      if (!userId && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden: Admin privilege required for bulk action' });
      }

      const result = await exports.deliveryEngine(userId, targetOverride);
      res.status(200).json(result);
    } catch (error) {
      console.error('Run Delivery Engine Error:', error);
      res.status(error.message.includes('Unauthorized') ? 401 : 500).json({ error: error.message });
    }
  });
};

/**
 * 4. getUserData: ユーザーデータ取得API
 */
exports.getUserData = (req, res) => {
  cors(req, res, async () => {
    const { userId, autoCheckin, includeJewelryMeta } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
      const decodedToken = await verifyToken(req);
      if (decodedToken.uid !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const database = await connectToDb();

      // Default projection: hide jewelryBox completely for performance/security
      let projection = { checkins: { $slice: -20 }, jewelryBox: 0 };

      // If metadata is requested, include everything in jewelryBox
      if (includeJewelryMeta) {
        projection = {
          checkins: { $slice: -20 }
        };
      }

      let user = await database.collection('users').findOne(
        { userId, appId },
        { projection }
      );

      if (!user) return res.status(404).json({ error: 'User not found' });

      // 自動チェックイン: 前回の記録から1時間以上経過、または日を跨いだ場合に実行
      if (autoCheckin) {
        const now = new Date();
        const lastCheckinStr = user.checkins && user.checkins.length > 0
          ? user.checkins[user.checkins.length - 1]
          : user.created_at;
        const last = new Date(lastCheckinStr);

        const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
        const isDifferentDay = now.toDateString() !== last.toDateString();

        if (last < oneHourAgo || isDifferentDay) {
          console.log(`[AutoCheckin] Triggered for ${userId}. Last seen: ${lastCheckinStr}`);
          await database.collection('users').updateOne(
            { userId, appId },
            {
              $push: { checkins: now.toISOString() },
              $set: {
                emergency_notified: false,
                updatedAt: now
              }
            }
          );
          // 最新のデータに更新して返す（20件に制限）
          user = await database.collection('users').findOne(
            { userId, appId },
            { projection: { checkins: { $slice: -20 } } }
          );
        }
      }

      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

/**
 * 4.5. emergencyMonitor: 放置ユーザーの緊急検知
 * @param {string} targetUserId 特定ユーザーのみを対象とする場合
 */
exports.emergencyMonitor = async (targetUserId) => {
  try {
    const database = await connectToDb();
    const thresholdDays = parseInt(process.env.EMERGENCY_THRESHOLD_DAYS || '3', 10);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

    // X日以上アクティビティがなく、かつステータスが active のユーザー
    const query = {
      status: 'active',
      emergency_notified: { $ne: true },
      $expr: {
        $lt: [
          { $arrayElemAt: ["$checkins", -1] },
          thresholdDate.toISOString()
        ]
      }
    };
    if (targetUserId) query.userId = targetUserId;

    const users = await database.collection('users').find(query, { projection: { checkins: { $slice: -20 } } }).toArray();

    console.log(`Emergency Monitor: Found ${users.length} inactive users.`);

    for (const user of users) {
      try {
        await deliveryService.send(user, { type: 'emergency' });

        await database.collection('users').updateOne(
          { _id: user._id },
          { $set: { emergency_notified: true, last_emergency_at: new Date() } }
        );
        console.log(`Emergency alert sent for ${user.name}`);
      } catch (err) {
        console.error(`Failed emergency alert for ${user.name}:`, err);
      }
    }
    return { success: true, notified: users.length };
  } catch (error) {
    console.error('Emergency Monitor Error:', error);
    throw error;
  }
};

/**
 * 5. registerUser: ユーザー登録API
 */
exports.registerUser = (req, res) => {
  cors(req, res, async () => {
    const { userId, name, interest, emergency_contact } = req.body;

    try {
      const decodedToken = await verifyToken(req);
      if (decodedToken.uid !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const database = await connectToDb();
      const users = database.collection('users');
      const sessions = database.collection('sessions');

      // セッションからペルソナ要約を読み取る
      const sessionDoc = await sessions.findOne({ userId, appId });
      const personaSummary = sessionDoc ? sessionDoc.personaSummary : '親しい友人。';

      const payload = { ...req.body, updatedAt: new Date() };

      // If it's a first-time registration, ensure status and created_at are set
      const updateOp = {
        $set: payload,
        $setOnInsert: {
          status: 'active',
          created_at: new Date().toISOString(),
          checkins: [new Date().toISOString()]
        }
      };

      await users.updateOne({ userId, appId }, updateOp, { upsert: true });

      // 最新のデータを取得して返す（20件に制限）
      const savedUser = await users.findOne(
        { userId, appId },
        { projection: { checkins: { $slice: -20 } } }
      );

      // 登録完了後、セッションを削除してクリーンアップ
      try {
        await sessions.deleteOne({ userId, appId });
        console.log(`Session cleaned up for user ${userId}`);
      } catch (e) {
        console.error('Session cleanup failed:', e);
      }

      res.status(201).json(savedUser);
    } catch (error) {
      console.error('Registration Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
};

/**
 * 6. checkIn: 生存確認API
 */
exports.checkIn = (req, res) => {
  cors(req, res, async () => {
    // Handle both POST (from App) and GET (from Email Link)
    const userId = req.body.userId || req.query.uid;
    const isRedirectRequest = !!req.query.uid;

    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
      // In GET mode (email link), we don't have token auth, we trust the UID
      if (!isRedirectRequest) {
        const decodedToken = await verifyToken(req);
        if (decodedToken.uid !== userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }

      const database = await connectToDb();
      const today = new Date().toISOString();

      console.log(`Checking in user: ${userId} (Source: ${isRedirectRequest ? 'Link' : 'App'})`);

      const result = await database.collection('users').updateOne(
        { userId, appId },
        {
          $set: { updatedAt: new Date() },
          $addToSet: { checkins: today },
          $unset: { emergency_notified: "" }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (isRedirectRequest) {
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        return res.redirect(`${frontendUrl}/?uid=${userId}&view=chat&autochat=1`);
      }

      res.status(200).json({ success: true, date: today });
    } catch (error) {
      console.error('CheckIn Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
};

/**
 * 9. runCompanionAgent: コンパニオン手動実行 (デモ用)
 */
exports.runCompanionAgent = (req, res) => {
  cors(req, res, async () => {
    try {
      const { userId, message, isInitial, prevMessages } = req.body;
      if (!userId) return res.status(400).json({ error: 'Missing userId' });

      // _companionAgentCore を直接呼ぶ（認証はスキップ または 必要なら admin チェックを追加）
      const result = await _companionAgentCore(userId, message, isInitial, prevMessages);
      res.status(200).json(result);
    } catch (error) {
      console.error('Run Companion Agent Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
};

/**
 * 10. runEmergencyMonitor: 緊急監視手動実行 (デモ用)
 */
exports.runEmergencyMonitor = (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyToken(req);
      const adminToken = req.headers['x-amber-ink-admin-token'];
      const isAdmin = (decodedToken.uid === 'admin') || (adminToken && adminToken === process.env.ADMIN_TOKEN);
      const { userId } = req.body;

      if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden: Admin privilege required' });
      }

      // UI側で空チェックをしている前提だが、念のためサーバー側でもバリデーション
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
      }

      const result = await exports.emergencyMonitor(userId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Run Emergency Monitor Error:', error);
      res.status(error.message.includes('Unauthorized') ? 401 : 500).json({ error: error.message });
    }
  });
};

/**
 * 11. downloadMemorial: 記念ページ生成・ダウンロード
 */
exports.downloadMemorial = (req, res) => {
  cors(req, res, async () => {
    const userId = req.query.uid;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
      const database = await connectToDb();
      const user = await database.collection('users').findOne(
        { userId, appId },
        { projection: { checkins: { $slice: -20 } } }
      );

      if (!user) return res.status(404).json({ error: 'User not found' });

      const templatePath = path.join(__dirname, 'templates', 'memorial', 'page.html.ejs');

      const lastCheckinStr = user.checkins && user.checkins.length > 0
        ? user.checkins[user.checkins.length - 1]
        : user.created_at;
      const lastSeen = new Date(lastCheckinStr);
      let keyImageBase64 = null;
      if (user.jewelryBox && user.jewelryBox.keyImageName) {
        try {
          const keyImagePath = path.join(__dirname, 'assets', 'keyIcons', user.jewelryBox.keyImageName);
          const imageBuffer = await fs.promises.readFile(keyImagePath);
          keyImageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        } catch (err) {
          console.error('Error reading key image:', err);
        }
      }

      const templateData = {
        name: user.name,
        interest: user.interest,
        personaSummary: user.personaSummary || '大切な会員様として、琥珀が見守り続けました。',
        last_seen_formatted: lastSeen.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        generated_at: new Date().toLocaleDateString('ja-JP'),
        jewelryBox: user.jewelryBox || null,
        keyImageBase64
      };

      const html = await ejs.renderFile(templatePath, templateData);

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="memorial_${userId}.html"`);
      res.send(html);
    } catch (error) {
      console.error('Download Memorial Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
};
