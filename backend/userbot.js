const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

let client = null;
let isConnecting = false;

const initUserbot = async () => {
  try {
    const apiId = parseInt(process.env.TELEGRAM_API_ID);
    const apiHash = process.env.TELEGRAM_API_HASH;
    const sessionStr = process.env.TELEGRAM_SESSION;

    if (!apiId || !apiHash || !sessionStr) {
      console.log("Userbot yopiq: API_ID, API_HASH yoki SESSION yo'q.");
      return;
    }

    if (isConnecting) return;
    isConnecting = true;

    const stringSession = new StringSession(sessionStr);
    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 1000,
      useWSS: false,
    });

    await client.connect();
    isConnecting = false;
    console.log("✅ Userbot muvaffaqiyatli ulandi! Endi xabarlar sizning nomingizdan ketadi.");
  } catch (err) {
    isConnecting = false;
    console.error("❌ Userbot ulanishida xatolik (Avto-qayta ulanish kutilmoqda):", err.message || err);
  }
};

const sendUserbotMessage = async (username, message) => {
  try {
    if (!client || !client.connected) {
      console.log("⚠️ Userbot ulanmagan yoki uzilgan. Qayta ulanmoqda...");
      await initUserbot();
    }

    if (!client || !client.connected) {
      console.log("❌ Qayta ulanib bo'lmadi. Xabar yuborilmadi.");
      return;
    }

    // Make sure username starts with @ or is a phone number
    let target = username.trim();
    if (!target.startsWith('@') && !target.startsWith('+')) {
      target = '@' + target;
    }
    
    await client.sendMessage(target, { message });
    console.log(`✅ Xabar muvaffaqiyatli yuborildi -> ${target}`);
  } catch (err) {
    console.error(`❌ Xabar yuborishda xatolik (${username}):`, err.message || err);
    // Agar ulanish uzilgan bo'lsa, qayta ulanishni harakat qildiramiz
    if (err.message && (err.message.includes("disconnect") || err.message.includes("connection") || err.message.includes("socket"))) {
      try {
        await initUserbot();
      } catch (e) {}
    }
  }
};

module.exports = { initUserbot, sendUserbotMessage };
