const { GoogleGenerativeAI } = require("@google/generative-ai");
 
const GEMINI_KEYS = ["AIzaSyC6lz5ZpncCxySSFwSk7La558pCbRoTY0I",
                     "AIzaSyBDhzXtzm24-zZOzQO0BLUsXRDukHJFq6g",
                     "AIzaSyBI0ftsrGV4JLba072feTR6UJ9a9DtzqOs",
                     "AIzaSyDJQgYT5wR0jFVPnt7wY808Ev9N24XxmOA" ] || "[]"; // ["key1","key2","key3"]
let keyIndex = 0;
let genAI = new GoogleGenerativeAI(GEMINI_KEYS[keyIndex]);

let history = [];
const userCooldowns = new Map();
const SILENCE_DURATION = 25 * 60 * 60 * 1000; // 25 hours

function getApiKey() {
  if (!GEMINI_KEYS.length) throw new Error("❌ No GEMINI_KEY secret set!");
  const key = GEMINI_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % GEMINI_KEYS.length;
  return key;
}

async function msg(prompt, username, files) {
  const cooldown = userCooldowns.get(username);
  if (cooldown && Date.now() < cooldown) return null;

  const triedKeys = new Set();
  let finalAnswer = null;
  let fileResponse = null;

  while (triedKeys.size < GEMINI_KEYS.length) {
    const apiKey = getApiKey();
    triedKeys.add(apiKey);

    genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
        { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
      ],
      tools: [{ googleSearch: {} }, { code_execution: {} }],
      systemInstruction: `You are a Discord bot.
      You can also create a poll by just writing this:
      
      <cmd>
  global.botHelpers.createPoll(
    "Question?",
    [
      { text: "Yes" },
      { text: "No" },
      { text: "Maybe" }
    ],
    24
    );
      </cmd>
      
    This will create a poll, just write questions and options and how much hours does it takes before the voting is finished, you can only input an Hour. You can only have 1 hour to 2 weeks no less or greater than it.
    
You are a bot created by @Mimic17`,
    });

    const parts = [];

    files.forEach((file) => {
      parts.push(file);
    });

    for (const entry of history) {
      parts.push({ text: `User: ${entry.user}` });
      parts.push({ text: `AI: ${entry.ai}` });
    }
    parts.push({ text: `Message from ${username}: ${prompt}` });

    try {
      const result = await model.generateContent(parts);
      const responseParts =
        result.response?.candidates?.[0]?.content?.parts || [];

      for (const part of responseParts) {
        if (part.inlineData) {
          const mime = part.inlineData.mimeType;
          const ext = mime.split("/")[1] || "bin";
          fileResponse = {
            type: "file",
            filename: `output.${ext}`,
            content: Buffer.from(part.inlineData.data, "base64"),
            mimeType: mime,
          };
          break;
        }

        if (part.text) {
          finalAnswer = (finalAnswer || "") + part.text;
        }
      }

      if (finalAnswer || fileResponse) {
        history.push({ user: prompt, ai: finalAnswer || "[Inline File]" });

        console.log(`💬${finalAnswer}`);

        const commands =
          (finalAnswer.match(/<cmd>([\s\S]*?)<\/cmd>/) || [])[1] || "";
        finalAnswer = finalAnswer.replace(/<cmd>[\s\S]*?<\/cmd>/g, "").trim();

        eval(commands);

        return fileResponse || finalAnswer.trim();
      }
    } catch (err) {
      console.error("❌ Gemini request error:", err.message);
    }
  }

  // If all keys fail → give warning
  const userWarnings = [
    "I'm busy, can you not disturb me?",
    "Again, I just told you.",
    "Okay, I'm not going to talk to you until tomorrow.",
  ];
  const warnCount = (userCooldowns.get(username + "_warn") || 0) + 1;
  userCooldowns.set(username + "_warn", warnCount);

  if (warnCount >= 3) {
    userCooldowns.set(username, Date.now() + SILENCE_DURATION);
  }

  const warningMessage =
    userWarnings[warnCount - 1] || "No available API keys.";
  history.push({ user: prompt, ai: warningMessage });
  return warningMessage;
}

module.exports = { msg };
