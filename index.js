const line = require('@line/bot-sdk');
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const client = new line.Client(config);
const app = express();

// Webhook 路由
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  try {
    // 呼叫 Gemini AI
    const result = await model.generateContent(event.message.text);
    const response = await result.response;
    const aiReply = response.text();

    // 回傳給 Line
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: aiReply.trim()
    });
  } catch (error) {
    console.error("AI 錯誤:", error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: "抱歉，我現在有點累，請稍後再試。"
    });
  }
}

// 監聽 Render 分配的 Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot 正在運行於 Port: ${PORT}`);
});
