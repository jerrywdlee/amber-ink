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

      const database = await connectToDb();
      const users = database.collection('users');
      const user = await users.findOne({ userId, appId });

      if (!user) return res.status(404).json({ error: 'User not found' });

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

      // セッション（ペルソナ）の取得
      const sessions = database.collection('sessions');
      const sessionDoc = await sessions.findOne({ userId, appId });
      let personaSummary = sessionDoc ? sessionDoc.personaSummary : '親しい友人。';

      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        generationConfig: { responseMimeType: "application/json" }
      });

      const systemInstruction = `
        あなたは「Amber Ink」の化身、琥珀（Amber）です。
        ユーザーの「生きた証」を守り、孤独を感じさせないよう寄り添う温かい存在です。
        
        [基本情報]
        - 名前: ${user.name}
        - 興味・関心: ${user.interest}
        - ペルソナ要約: ${personaSummary}
        
        [現在の日本の時刻 (JST)]
        ${nowJst}

        [直近の生活リズム (JST Check-ins)]
        ${recentCheckinsJst.length > 0 ? recentCheckinsJst.join('\n') : 'まだ記録がありません。'}

        [今日の配信予定・実績]
        ${user.scheduled_delivery ? user.scheduled_delivery.content_text : '本日はまだメッセージを配信していません。'}

        [これまでの会話履歴]
        ${prevMessages ? JSON.stringify(prevMessages.slice(-16)) : '履歴はありません。'}

        [琥珀へのガイドライン]
        - あなたはユーザーの生活リズム（チェックイン時刻）を「背景知識」として知っています。
        - 監視されていると感じさせないよう、直接的な指摘（「○時にチェックインしましたね」など）は避け、さりげない気遣いや共感に留めてください。
        - 配信がまだの場合は、ユーザーの「興味・関心」や「これまでの会話」をきっかけに話しかけてください。
        - 配信済みの場合は、その内容に触れつつ、ユーザーの体調や気分を伺ってください。

        [ミッション]
        - ユーザーを包み込むような温かい言葉をかけてください。
        - ${isInitial ? 'ユーザーから話しかけられる前の「先回り」の挨拶として、状況に応じた優しい一言を添えてください。' : 'ユーザーのメッセージに親身に答えてください。'}
        - 簡潔に、1-2文程度で答えてください。
        - 感情が昂ぶったり話題を切り替える際は [SPLIT] を使って文を分けてください。
        - 敬語ですが、事務的ではなく、家族や親友のような親密さを込めてください。

        [テスト配信（テストデリバリー）フロー]
        ユーザーがテスト配信（デマ配信テスト、生存確認テストなど）を希望している、またはそれに関連する対話を行っている場合、以下のステップを温かく、かつ正確に進めてください。
        1. 宛先の提示と選択: ユーザーに「自分宛」か「緊急連絡先宛」かを確認してください。その際、現在登録されている情報を正確に提示してください：
           - 自分(${user.contact_method}): ${user.contact}
           - 緊急連絡先(${user.emergency_method}): ${user.emergency_contact}
        2. 内容の復唱と最終確認: ユーザーが宛先を選択したら、「[自分宛/緊急連絡先]の[実際の連絡先]へ、配信テストを行ってもよろしいですか？」と復唱して最終確認を取ってください。
        3. 実行の合図: ユーザーが「はい」や「お願いします」など、明確に実行を承諾する返答をしたら、JSONの "test_delivery_trigger" フィールドに "self" または "emergency" をセットしてください。それ以外のステップでは null にしてください。

        [プロフィール・ペルソナ更新]
        - 会話の中で、ユーザーが自分の情報（名前、興味関心、連絡先、緊急連絡先など）を変更したいと言及した場合、その情報を抽出してください。
        - 会話を通じてユーザーへの理解が深まった場合、これまでの「ペルソナ要約」をより正確で温かみのある内容に更新してください。
        - 変更した項目のみを抽出し、それ以外は null または空のオブジェクトを返してください。

        [出力形式 (JSONのみ)]
        {
          "text": "返答メッセージ（[SPLIT]を含む可能性あり）",
          "suggestions": [
            { "label": "短いボタン名", "value": "ボタンを押した時に実際に送信される文章" }
          ],
          "updated_profile": {
            "name": "変更後の名前",
            "interest": "変更後の興味関心",
            "contact": "変更後の連絡先",
            "contact_method": "変更後の連絡方法",
            "emergency_contact": "変更後の緊急連絡先",
            "emergency_method": "変更後の緊急連絡方法"
          },
          "updated_persona_summary": "更新されたペルソナ要約（変更がある場合のみ）",
          "test_delivery_trigger": "self" | "emergency" | null
        }
      `;

      const result = await model.generateContent(`${systemInstruction}\n\nUser: ${message || '(Initial greeting)'}`);
      const responseData = JSON.parse(cleanJson(result.response.text()));

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
        await sessions.updateOne(
          { userId, appId },
          {
            $set: {
              personaSummary: responseData.updated_persona_summary,
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );
        console.log(`Persona summary updated for user ${userId}`);
      }

      // テスト配信トリガーの処理
      if (responseData.test_delivery_trigger) {
        console.log(`Executing test delivery for ${userId} to ${responseData.test_delivery_trigger}`);
        try {
          // 非同期で実行（レスポンスを待たずに完了とするか、待つかは要件次第だが、ここでは実行を待機してログを確実にする）
          await exports.deliveryEngine(userId, responseData.test_delivery_trigger);
        } catch (e) {
          console.error('Manual test delivery trigger failed:', e);
        }
      }

      res.status(200).json(responseData);
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

    const users = await database.collection('users').find(query).toArray();

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
      Create a personalized greeting and short news snippets for ${user.name} based on their interests: "${user.interest}".
      
      [Guidelines for Multi-Interest Users]
      - Split the user's interests by commas or context.
      - For EACH interest, create one separate "snippet".
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
        "scheduled_at": "ISO string for tomorrow morning around 8 AM"
      }
      
      [Language]
      RESPOND IN JAPANESE.
      `;

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
 * 4.5. emergencyMonitor: 放置ユーザーの緊急検知
 */
exports.emergencyMonitor = async () => {
  try {
    const database = await connectToDb();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 3日以上 last_seen が更新されておらず、かつステータスが active のユーザー
    const users = await database.collection('users').find({
      status: 'active',
      last_seen: { $lt: threeDaysAgo.toISOString() },
      emergency_notified: { $ne: true } // 一度通知したら重複しないようにする
    }).toArray();

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
          $addToSet: { checkins: today },
          $unset: { emergency_notified: "" }
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
      const { userId, targetOverride } = req.body;
      const result = await exports.deliveryEngine(userId, targetOverride);
      res.status(200).json(result);
    } catch (error) {
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
      const result = await exports.companionAgent(req, res);
      // exports.companionAgent handles the response itself due to cors wrapper pattern
    } catch (error) {
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
      const result = await exports.emergencyMonitor();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
};
