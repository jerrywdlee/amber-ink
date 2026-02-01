/**
 * Amber Ink Alpha - Node.js Implementation (MongoDB Version)
 * 疎結合な「配信エンジン」「AIアナライザー」「対話型オンボーディング」の統合
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors')({ origin: true });
const deliveryService = require('./delivery');

const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017';
const dbName = process.env.MONGODB_DB_NAME || 'amber_ink';
const appId = process.env.APP_ID || 'amber-ink';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
      ${prevMessages ? JSON.stringify(prevMessages) : 'No conversation history.'}
      
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
      const responseData = JSON.parse(responseText);

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
                checkins: [new Date().toISOString()],
                last_seen: new Date().toISOString()
              }
            },
            { upsert: true }
          );
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
 * 2. deliveryEngine: 定期配信エンジン
 */
exports.deliveryEngine = async (targetUserId) => {
  try {
    const now = new Date();
    const database = await connectToDb();

    const query = {
      status: 'active',
      'scheduled_delivery.at': { $lte: now },
      'scheduled_delivery.sent': { $ne: true }
    };

    if (targetUserId) {
      query.userId = targetUserId;
    }

    const users = await database.collection('users').find(query).toArray();

    if (users.length === 0) return { success: true, sent: 0 };

    console.log(`Delivery Engine: Found ${users.length} pending deliveries.`);

    const baseUrl = process.env.BASE_FUNCTION_URL || 'http://localhost:8080';

    for (const user of users) {
      const checkInUrl = `${baseUrl}/checkIn?uid=${user.userId}`;
      const deliveryData = {
        content_html: user.scheduled_delivery.content_html,
        content_text: user.scheduled_delivery.content_text,
        checkInUrl: checkInUrl
      };

      try {
        await deliveryService.send(user, deliveryData);

        await database.collection('users').updateOne(
          { _id: user._id },
          { $set: { 'scheduled_delivery.sent': true, last_emailed_at: new Date() } }
        );
        console.log(`Delivery completed for ${user.name}`);
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
 * 3. aiAnalyzer: AIアナライザー
 */
exports.aiAnalyzer = async (targetUserId) => {
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.8
    }
  });

  try {
    const database = await connectToDb();
    const query = { status: 'active' };
    if (targetUserId) {
      query.userId = targetUserId;
    }
    const users = await database.collection('users').find(query).toArray();
    console.log(`AI Analyzer: Processing ${users.length} users... (Target: ${targetUserId || 'ALL'})`);

    for (const user of users) {
      const prompt = `
      You are the "Amber Ink" AI Content Architect.
      Create a personalized greeting and news snippet for ${user.name} based on their interest: "${user.interest}".
      Use their persona summary for tone: "${user.personaSummary || 'Friendly and calm'}".

      [Goal]
      1. Provide a warm, brief morning greeting.
      2. Share a small interesting fact or fake news snippet related to their interest that makes them feel connected to the world.
      3. Encourage them to "check-in" to preserve their glow.

      [Output Format (JSON only)]
      {
        "content_html": "HTML formatted message. Use <p> tags. Keep it under 200 words. Include a greeting and the news.",
        "content_text": "Plain text version.",
        "scheduled_at": "ISO string for tomorrow morning around 8 AM"
      }
      
      [Language]
      RESPOND IN JAPANESE.
      `;

      const result = await model.generateContent(prompt);
      const data = JSON.parse(result.response.text());

      await database.collection('users').updateOne(
        { _id: user._id },
        {
          $set: {
            scheduled_delivery: {
              content_html: data.content_html,
              content_text: data.content_text,
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
  } catch (error) {
    console.error('AI Analyzer Error:', error);
    throw error;
  }
};

/**
 * 4. getUserData: ユーザーデータ取得API
 */
exports.getUserData = (req, res) => {
  cors(req, res, async () => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
      const decodedToken = await verifyToken(req);
      if (decodedToken.uid !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const database = await connectToDb();
      const user = await database.collection('users').findOne({ userId, appId });

      if (!user) return res.status(404).json({ error: 'User not found' });
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
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

      const userData = {
        userId,
        appId,
        name: name.trim(),
        interest: interest.trim(),
        emergency_contact: emergency_contact.trim(),
        status: 'active',
        created_at: new Date().toISOString(),
        checkins: [], // Removed initial check-in
        last_seen: new Date().toISOString(),
        updatedAt: new Date()
      };

      await users.updateOne({ userId, appId }, { $set: userData }, { upsert: true });
      res.status(201).json({ success: true, userId });
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
          $set: { last_seen: new Date().toISOString(), updatedAt: new Date() },
          $addToSet: { checkins: today }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (isRedirectRequest) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/?uid=${userId}`);
      }

      res.status(200).json({ success: true, date: today });
    } catch (error) {
      console.error('CheckIn Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
};

/**
 * 7. runAiAnalyzer: AIアナライザー手動実行 (デモ用)
 */
exports.runAiAnalyzer = (req, res) => {
  cors(req, res, async () => {
    try {
      const { userId } = req.body;
      const result = await exports.aiAnalyzer(userId);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

/**
 * 8. runDeliveryEngine: 配信エンジン手動実行 (デモ用)
 */
exports.runDeliveryEngine = (req, res) => {
  cors(req, res, async () => {
    try {
      const { userId } = req.body;
      const result = await exports.deliveryEngine(userId);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};
