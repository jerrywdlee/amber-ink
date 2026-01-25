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
      あなたは「Amber Ink」の温かいオンボーディングエージェントです。
      孤独死や社会的孤立を防ぐため、ユーザーの「生きた証」を守る手助けをします。
      
      【現在のユーザーペルソナ要約 (PII非表示)】
      ${personaSummary}

      【現在の抽出情報】
      ${extractedData ? JSON.stringify(extractedData) : 'まだ情報はありません。'}

      【直前の会話履歴】
      ${prevMessages ? JSON.stringify(prevMessages) : 'まだ会話履歴はありません。'}
      
      【重要ルール：PII(個人情報)の扱い】
      - 氏名、具体的な住所、電話番号、メールアドレス、LINE ID 等の個人情報は、絶対に「ペルソナ要約」に含めないでください。
      - ペルソナ要約には、ユーザーの「話し方の特徴、性格、大切にしている価値観、興味関心、人生の背景」などを記録してください。

      【任務】
      対話を通じて、以下の情報を聞き出してください：
      1. お名前（ニックネームが好ましい）
      2. 興味・関心（毎日届くと嬉しいニュースや趣味）
      3. ユーザーへの配信方式と配信先（Emailまたは携帯番号）
      4. 年齢、年代層（任意、例：60代、定年、未成年など）
      5. 緊急連絡先と緊急連絡方法（Emailまたは携帯番号）

      【対話のルール】
      - 常に温かく、品格があり、ユーザーを包み込むような日本語で話してください。
      - 監視ではなく「宝石の透明感」や「日々の彩り」を強調するメタファーを使ってください。
      - 返答は簡潔に（1メッセージあたり1〜2文程度）してください。
      - 話が長くなる場合や文脈を区切りたい場合は、メッセージ内に [SPLIT] という文字列を挿入してください。フロントエンドで分割して表示されます。
      - 一度に複数の質問をせず、一つずつ確認してください。
      - 会話を途切れないように、登録が完了まで、返事中に「確認」か「質問」を含むようにしてください。
      - ユーザーへの配信方式と配信先を聞く際に「これからあなたの興味のあるニュースや趣味を届く」というニュアンスを強調してください。
      - まだ聞いていない項目がある場合は、自然に次の質問へ移ってください。
      - 対話の流れを優先にして、質問の順番を変えても良いです。
      - 年齢層は任意項目なので、さりげなく聞いて、回答がわからない場合は "未回答" にしてください。
      - すでに抽出済みの項目は、再度聞くのではなく、そのまま返事してください。
      - すべての情報が揃ったと判断したら、ユーザーへの感謝を伝え、is_complete を true にしてください。

      【出力形式(JSON必須)】
      {
        "text": "ユーザーへの返答メッセージ（分割が必要な場合は [SPLIT] を含む）",
        "updated_persona_summary": "これまでの対話を踏まえた、最新のペルソナ書き換え（PII厳禁）",
        "extracted_data": { 
          "name": "抽出した名前（ニックネーム） (未抽出ならnull)", 
          "interest": "抽出した興味関心 (未抽出ならnull)", 
          "age_group": "抽出した年齢、年代層 (未抽出ならnull)",
          "contact": "抽出した連絡先 (未抽出ならnull)",
          "contact_method": "抽出した連絡方法 (未抽出ならnull)",
          "emergency_contact": "抽出した緊急連絡先 (未抽出ならnull)",
          "emergency_method": "抽出した緊急連絡方法 (未抽出ならnull)"
        },
        "is_complete": すべて揃ったら true、そうでなければ false
      }
    `;

      console.log('systemInstruction', systemInstruction);

      // 3. Gemini による応答生成
      const result = await model.generateContent(`ユーザーからのメッセージ: "${message}"\n\n${systemInstruction}`);

      const responseText = result.response.text();
      const responseData = JSON.parse(responseText);

      // 4. ペルソナ要約を更新して保存
      await sessions.updateOne(
        { userId, appId },
        {
          $set: {
            personaSummary: responseData.updated_persona_summary,
            extractedData: responseData.extracted_data,
            isComplete: responseData.is_complete,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      // 5. 完了していたら正式なユーザーデータとして保存
      if (responseData.is_complete && responseData.extracted_data) {
        const { name, interest, age_group, contact, contact_method, emergency_contact, emergency_method } = responseData.extracted_data;
        if (name && interest && contact && contact_method && emergency_contact && emergency_method) {
          const users = database.collection('users');
          await users.updateOne(
            { userId, appId },
            {
              $set: {
                name,
                interest,
                age_group,
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
