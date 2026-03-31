require("dotenv").config();
const fs = require("fs");
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");

// ===== 初期設定 =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ===== メモリ =====
const MEMORY_FILE = "memory.json";

function loadMemory() {
  if (!fs.existsSync(MEMORY_FILE)) return [];
  return JSON.parse(fs.readFileSync(MEMORY_FILE));
}

function saveMemory(data) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
}

// 🔍 検索機能付き記憶
function searchMemory(keyword) {
  const memory = loadMemory();
  return memory
    .filter(m => JSON.stringify(m).includes(keyword))
    .slice(-5);
}

// ===== AI関数 =====
async function askAI(role, content) {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: role },
        { role: "user", content: content }
      ],
    });
    return res.choices[0].message.content;
  } catch (e) {
    console.log("AIエラー:", e.message);
    return "エラー（API制限の可能性）";
  }
}

// ===== 役職 =====
const roles = {
  CEO: "あなたはCEO。収益化を最優先で判断する",
  ENG: "あなたはエンジニア。実装方法を考える",
  MKT: "あなたはマーケター。売れる仕組みを考える",
  IDEA: "あなたはアイデアマン。儲かる案を出す",
  GUARD: "あなたはガード。危険・非現実ならNG、OKならOKとだけ言う"
};

// 💰 お金稼ぐトリガー
async function generateMoneyPlan(input) {
  return await askAI(
    "あなたはビジネスのプロ。すぐ収益化できる具体案だけ出す",
    input + " を元にお金を稼ぐ具体的方法を教えて"
  );
}

// ===== Discord =====
client.on("ready", () => {
  console.log("AI会社起動");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const userInput = message.content;

  // 🔍 メモリ検索
  const past = searchMemory(userInput);
  let memoryText = past.length ? JSON.stringify(past) : "なし";

  let memory = loadMemory();
  memory.push({ user: userInput });

  // 💰 お金モード
  if (userInput.includes("稼ぐ") || userInput.includes("お金")) {
    const plan = await generateMoneyPlan(userInput);
    await message.channel.send("💰 収益プラン:\n" + plan);
  }

  // ===== AI会議 =====
  let loop = true;
  let finalAnswer = "";

  while (loop) {
    const idea = await askAI(roles.IDEA, userInput + "\n過去:" + memoryText);
    await message.channel.send("💡 IDEA:\n" + idea);

    const eng = await askAI(roles.ENG, idea);
    await message.channel.send("🧠 ENG:\n" + eng);

    const mkt = await askAI(roles.MKT, eng);
    await message.channel.send("📈 MKT:\n" + mkt);

    const ceo = await askAI(roles.CEO, mkt);
    await message.channel.send("👑 CEO:\n" + ceo);

    const guard = await askAI(roles.GUARD, ceo);
    await message.channel.send("🛡 GUARD:\n" + guard);

    if (guard.includes("OK")) {
      loop = false;
      finalAnswer = ceo;
    }
  }

  memory.push({ result: finalAnswer });
  saveMemory(memory);
});

// ===== Webサーバー =====
const app = express();

app.get("/api", (req, res) => {
  res.send("AI会社Bot稼働中🔥");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Webサーバー起動");
});

// ===== 起動 =====
client.login(process.env.DISCORD_TOKEN);
