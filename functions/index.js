/**
 * Amber Ink Alpha - Node.js Implementation (MongoDB Version)
 * 疎結合な「配信エンジン」「AIアナライザー」「対話型オンボーディング」の統合
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors')({ origin: true });

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
exports.deliveryEngine = async (event, context) => {
  try {
    const now = new Date();
    const database = await connectToDb();
    const users = await database.collection('users').find({
      status: 'active',
      'scheduled_delivery.at': { $lte: now },
      'scheduled_delivery.sent': { $ne: true }
    }).toArray();

    for (const user of users) {
      console.log(`Sending Message to ${user.name}: ${user.scheduled_delivery.content}`);
      // SendGrid 等の外部 API 連携を想定
      await database.collection('users').updateOne(
        { _id: user._id },
        { $set: { 'scheduled_delivery.sent': true } }
      );
    }
  } catch (error) {
    console.error('Delivery Engine Error:', error);
  }
};

/**
 * 3. aiAnalyzer: AIアナライザー
 */
exports.aiAnalyzer = async (event, context) => {
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });

  try {
    const database = await connectToDb();
    const users = await database.collection('users').find({ status: 'active' }).toArray();

    for (const user of users) {
      const prompt = `ユーザー(${user.name})の興味は「${user.interest}」です。
      前回の反応傾向を考慮し、明日届ける「今日の一言」または「最新の関連ニュース要約」を生成し、
      最適な配信時間(ISO形式)と共にJSONで出力してください。`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      // 更新ロジックをここに書く (ユーザードキュメントへの保存など)
      console.log(`Generated content for ${user.name}: ${responseText}`);
    }
  } catch (error) {
    console.error('AI Analyzer Error:', error);
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
        checkins: [new Date().toISOString()],
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
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
      const decodedToken = await verifyToken(req);
      if (decodedToken.uid !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const database = await connectToDb();
      const today = new Date().toISOString();

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

      res.status(200).json({ success: true, date: today });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};

/**
 * Legacy support for apiHandler
 */
exports.apiHandler = (req, res) => {
  cors(req, res, async () => {
    const { uid, action } = req.query;
    if (action === 'confirm' && uid) {
      try {
        const database = await connectToDb();
        const today = new Date().toISOString().split('T')[0];
        await database.collection('users').updateOne(
          { userId: uid, appId },
          {
            $set: { last_seen: new Date().toISOString(), updatedAt: new Date() },
            $addToSet: { checkins: today }
          }
        );
        return res.status(200).send('Amber Ink: あなたの輝きを確認しました。');
      } catch (e) {
        return res.status(500).send('Error');
      }
    }
    res.status(404).send('Not Found');
  });
};
