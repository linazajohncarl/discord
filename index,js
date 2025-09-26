const express = require("express");
const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  AttachmentBuilder,
} = require("discord.js");
const { msg } = require("./AI.js");

// --- Keep-alive server for UptimeRobot ---
const app = express();
app.get("/", (req, res) => {
  const fullUrl = req.protocol + "://" + req.get("host") + req.originalUrl;
  res.send(`✅ Bot is alive!<br>🌐 URL: ${fullUrl}`);
});
app.listen(3000, () => console.log("🌐 Web server running on port 3000"));

const TOKEN = process.env.DISCORD_BOT_TOKEN;

// --- Discord Bot ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessagePolls,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

async function createPoll(question, options, duration = 24) {
  if (!global.currentMessageChannel) {
    throw new Error("No channel available for the poll.");
  }

  const channel = global.currentMessageChannel;

  if (!Array.isArray(options) || options.length < 2) {
    return channel.send("❌ Poll must have at least two options.");
  }

  const pollAnswers = options.map((opt) => ({ text: opt.text }));

  // Validate duration
  const maxDuration = 768; // Maximum duration in hours
  const pollDuration = Math.min(duration, maxDuration); // Convert to seconds

  try {
    await channel.send({
      poll: {
        question: { text: question },
        answers: pollAnswers,
        duration: pollDuration,
        allow_multiselect: false,
        layout_type: 1,
      },
    });

    return `✅ Poll created in ${channel.name}`;
  } catch (error) {
    console.error("Error creating poll:", error);
    return "❌ Failed to create poll.";
  }
}
// --- Helper: send file ---
async function sendFile(channel, filename, buffer) {
  const file = new AttachmentBuilder(buffer, { name: filename });
  await channel.send({ files: [file] });
}

// --- Bot ready ---
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

const fetch = require("node-fetch"); // Install with: npm install node-fetch

async function getAttachmentsInlineData(attachments) {
  const results = [];

  for (const attachment of attachments.values()) {
    try {
      // Skip "vnd" mime types (like application/vnd.openxmlformats-officedocument.wordprocessingml.document)
      if (attachment.contentType && attachment.contentType.includes("vnd")) {
        console.log(
          `Skipped unsupported file type: ${attachment.name} (${attachment.contentType})`,
        );
        continue;
      }

      const response = await fetch(attachment.url);
      if (!response.ok) throw new Error(`Failed to fetch ${attachment.url}`);

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      results.push({
        inlineData: {
          mimeType: attachment.contentType || "application/octet-stream",
          data: base64,
        },
      });

      console.log(`Processed file: ${attachment.name}`);
    } catch (error) {
      console.error(`Error processing attachment "${attachment.name}":`, error);
    }
  }

  return results;
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (
    message.channel.type === ChannelType.DM ||
    message.mentions.has(client.user)
  ) {
    try {
      global.currentMessageChannel = message.channel; // ✅ store channel

      const attachmentsInlineData = await getAttachmentsInlineData(
        message.attachments,
      );

      const aiResponse = await msg(
        message.content,
        message.author.username,
        attachmentsInlineData,
      );

      if (typeof aiResponse === "string" && aiResponse.trim()) {
        await message.reply(aiResponse);
      }

      if (typeof aiResponse === "object") {
        if (aiResponse.type === "poll") {
          await createPoll(aiResponse.question, aiResponse.options);
        } else if (aiResponse.type === "file") {
          await sendFile(
            message.channel,
            aiResponse.filename,
            aiResponse.content,
          );
        }
      }
    } catch (err) {
      console.error("AI Error:", err);
      message.reply("❌ Something went wrong with the AI.");
    }
  }
});

client.on("guildMemberAdd", (member) => {
  console.log(`✅ ${member.user.tag} joined ${member.guild.name}`);
  const aiResponse = msg(
    `${member.user.tag} joined ${member.guild.name}`,
    "Server: ",
    [],
  );
});
// --- Export helpers for AI.js ---
global.botHelpers = {
  createPoll,
  sendFile,
  getChannel: (id) => client.channels.cache.get(id),
};

client.login(TOKEN);
