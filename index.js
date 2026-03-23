const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// ===================== CONFIG =====================
const TOKEN = process.env.TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const BOT_USERNAME = process.env.BOT_USERNAME;
const OWNER = '@ulugbek_saparaliyev';

if (!TOKEN || !BOT_USERNAME) {
  console.error('TOKEN yoki BOT_USERNAME topilmadi!');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
let db;

async function initDB() {
  db = await open({ filename: path.join(__dirname, 'bot.db'), driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY, first_name TEXT, username TEXT, started_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS member_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, group_id INTEGER, inviter_id INTEGER, member_id INTEGER, added_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(group_id, inviter_id, member_id));
    CREATE TABLE IF NOT EXISTS groups (group_id INTEGER PRIMARY KEY, title TEXT, force_add_limit INTEGER DEFAULT 0, force_add_active INTEGER DEFAULT 0, force_text TEXT DEFAULT '', force_text_time INTEGER DEFAULT 0, linked_channel TEXT DEFAULT NULL);
  `);
  console.log('Database tayyor!');
}

async function saveUser(user) {
  await db.run('INSERT OR IGNORE INTO users (user_id, first_name, username) VALUES (?, ?, ?)', user.id, user.first_name || '', user.username || '');
}
async function getGroup(groupId) { return await db.get('SELECT * FROM groups WHERE group_id = ?', groupId); }
async function saveGroup(groupId, title) { await db.run('INSERT OR IGNORE INTO groups (group_id, title) VALUES (?, ?)', groupId, title); }
async function getMemberCount(groupId, userId) {
  const row = await db.get('SELECT COUNT(*) as cnt FROM member_stats WHERE group_id = ? AND inviter_id = ?', groupId, userId);
  return row?.cnt || 0;
}
async function getTop10(groupId) {
  return await db.all('SELECT inviter_id, COUNT(*) as cnt FROM member_stats WHERE group_id = ? GROUP BY inviter_id ORDER BY cnt DESC LIMIT 10', groupId);
}
async function isAdmin(chatId, userId) {
  try { const m = await bot.getChatMember(chatId, userId); return ['administrator','creator'].includes(m.status); } catch { return false; }
}
async function isBotAdmin(chatId) {
  try { const me = await bot.getMe(); const m = await bot.getChatMember(chatId, me.id); return ['administrator','creator'].includes(m.status); } catch { return false; }
}

const adminCheckTimers = {};
function scheduleAdminCheck(chatId) {
  if (adminCheckTimers[chatId]) return;
  adminCheckTimers[chatId] = setTimeout(async () => {
    if (!await isBotAdmin(chatId)) {
      try {
        await bot.sendMessage(chatId, "⏰ 5 daqiqa o'tdi, lekin menga admin huquqi berilmadi.\n😔 Majbur bo'lib guruhdan chiqaman. Admin qilib qayta qo'shing! 🚪");
        await bot.leaveChat(chatId);
      } catch {}
    }
    delete adminCheckTimers[chatId];
  }, 5 * 60 * 1000);
}

bot.onText(/\/start/, async (msg) => {
  if (msg.chat.type !== 'private') return;
  await saveUser(msg.from);
  const name = msg.from.first_name || "Do'st";
  await bot.sendMessage(msg.chat.id,
    `🤖 Botga xush kelibsiz, *${name}*!\n\n📊 Men guruhga *kim qancha odam qo'shganini* kuzatib boruvchi botman.\n\n🎯 Bot orqali guruhingizga istagancha odam yig'ib olasiz!\n🎬 Video qo'llanmada ko'rsatilgan usulda botni ishlating.\n\n/help — barcha buyruqlar ro'yxati ☑️\n\n⚠️ Botning *to'g'ri ishlashi* uchun guruhda *ADMIN* huquqi berilishi shart!\n\n━━━━━━━━━━━━━━━━━━━━\n👑 *Bot egasi:* ${OWNER}`,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "➕ Guruhga qo'shish", url: `https://t.me/${BOT_USERNAME}?startgroup=true&admin=post_messages+delete_messages+restrict_members+invite_users+pin_messages` }]] } }
  );
});

bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(msg.chat.id,
    `🤖 *Botimizning buyruqlari!*\n\n📊 *Statistika buyruqlari:*\n/mymembers — 📊 Siz qo'shgan odamlar soni!\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n/yourmembers — 📈 Reply qilingan odamning guruhga qo'shgan odamlar soni!\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n/top — 🏆 Eng ko'p odam qo'shgan 10 talik!\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n/delson — 🗑 Guruhga odam qo'shganlarni barchasini tozalash!\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n/clean — 🧹 Reply qilingan xabar egasini ma'lumotlarini 0 ga tenglash!\n\n👥 *Guruhga odam yig'ish buyruqlari:*\n/add — Guruhingizga majburiy odam qo'shishni yoqadi!\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n/add 10 — Majburiy odam qo'shishni yoqish!\n❗️ *Eslatma:* 10 o'rniga istalgan raqamni yozishingiz mumkin!\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n/add off — Majburiy odam qo'shishni o'chirib qo'yish!\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n/textforce — Majburiy odam qo'shish matniga qo'shimcha matn qo'shish\n🔖 Namuna: /textforce *Salom*\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n/textforce 0 — Majburiy odam qo'shish matnini o'chirib qo'yish!\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n/text_time — Majburiy odam qo'shish matni avtomatik o'chish vaqti!\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n/deforce (id yoki reply) — Majburiy odam qo'shish ma'lumotini tozalash!\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n/plus (id yoki reply) — O'zingizni balingizni boshqa foydalanuvchiga o'tkazish.\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n/priv (id yoki reply) — Guruhingizni oddiy odamlariga imtiyoz berish.\n\n🔗 *Majburiy a'zolik tizimi:*\nBot orqali kanal va guruh o'rtasida majburiy a'zolik tizimini sozlash mumkin!\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n/set — Majburiy a'zolik tizimini sozlash.\n🔖 Namuna: /set @kanalim\n〰️〰️〰️〰️〰️〰️〰️〰️〰️\n/unlink — Sozlangan kanallarni o'chirib tashlash.\n\n━━━━━━━━━━━━━━━━━━━━\n👑 *Bot egasi:* ${OWNER}`,
    { parse_mode: 'Markdown' }
  );
});

bot.on('my_chat_member', async (msg) => {
  const chat = msg.chat;
  if (!['group','supergroup'].includes(chat.type)) return;
  const newStatus = msg.new_chat_member?.status;
  if (!['member','administrator'].includes(newStatus)) return;
  await saveGroup(chat.id, chat.title);
  if (!await isBotAdmin(chat.id)) {
    await bot.sendMessage(chat.id, `👋 Salom, *${chat.title}* guruhi!\n\n🤖 Men guruhga qo'shildim, rahmat!\n\n⚠️ Lekin meni *to'liq ishlashim* uchun *ADMIN* huquqi berilishi shart!\n\n🔧 Iltimos, meni guruh adminlari ro'yxatiga qo'shing!\n\n⏰ Admin qilmasangiz — *5 daqiqa* ichida guruhdan chiqaman 🚪`, { parse_mode: 'Markdown' });
    scheduleAdminCheck(chat.id);
  } else {
    await bot.sendMessage(chat.id, `✅ Salom, *${chat.title}* guruhi!\n\n🤖 Men admin sifatida qo'shildim — ajoyib!\n\n📊 Endi guruhga *kim qancha odam qo'shganini* kuzatib boraman!\n\n💡 /help — barcha buyruqlarni ko'rish uchun\n\n🚀 Guruhingiz rivojiga hissa qo'shishga tayyorman!`, { parse_mode: 'Markdown' });
  }
});

bot.on('new_chat_members', async (msg) => {
  const chat = msg.chat;
  const inviter = msg.from;
  await saveGroup(chat.id, chat.title);
  const groupData = await getGroup(chat.id);
  if (!groupData) return;
  for (const member of msg.new_chat_members) {
    if (member.is_bot) continue;
    await db.run('INSERT OR IGNORE INTO member_stats (group_id, inviter_id, member_id) VALUES (?, ?, ?)', chat.id, inviter.id, member.id);
    if (groupData.force_add_active && groupData.force_add_limit > 0) {
      const count = await getMemberCount(chat.id, member.id);
      if (count < groupData.force_add_limit) {
        let txt = `👋 Salom, *${member.first_name}*! Guruhga xush kelibsiz!\n\n📢 Bu guruhda qolish uchun *${groupData.force_add_limit}* ta do'stingizni taklif qilishingiz kerak!\n\n📊 Sizning holatiz: *${count}/${groupData.force_add_limit}* ta\n\n`;
        if (groupData.force_text) txt += `📝 ${groupData.force_text}\n\n`;
        txt += `🔗 Taklif linki orqali do'stlaringizni qo'shing va guruhda qoling! 💪`;
        const sentMsg = await bot.sendMessage(chat.id, txt, { parse_mode: 'Markdown' });
        if (groupData.force_text_time > 0) setTimeout(() => bot.deleteMessage(chat.id, sentMsg.message_id).catch(() => {}), groupData.force_text_time * 1000);
      }
    }
    if (groupData.linked_channel) {
      try {
        const chM = await bot.getChatMember(groupData.linked_channel, member.id);
        if (['left','kicked'].includes(chM.status)) await bot.sendMessage(chat.id, `⚠️ *${member.first_name}*, guruhda qolish uchun avval kanalga obuna bo'ling:\n\n📢 ${groupData.linked_channel}`, { parse_mode: 'Markdown' });
      } catch {}
    }
  }
});

bot.onText(/\/mymembers/, async (msg) => {
  if (msg.chat.type === 'private') return;
  if (!await isBotAdmin(msg.chat.id)) return bot.sendMessage(msg.chat.id, `⚠️ Meni *to'liq ishlashim* uchun admin qilishingiz shart!`, { parse_mode: 'Markdown' });
  const count = await getMemberCount(msg.chat.id, msg.from.id);
  await bot.sendMessage(msg.chat.id, `📊 *${msg.from.first_name}*, siz bu guruhga jami *${count}* ta odam qo'shdingiz! 🎯\n\n${count > 0 ? "💪 Zo'r natija! Davom eting!" : "😊 Hali hech kim qo'shmagansiz. Boshlang!"}`, { parse_mode: 'Markdown' });
});

bot.onText(/\/yourmembers/, async (msg) => {
  if (msg.chat.type === 'private') return;
  if (!await isBotAdmin(msg.chat.id)) return bot.sendMessage(msg.chat.id, `⚠️ Meni admin qilishingiz shart!`, { parse_mode: 'Markdown' });
  if (!msg.reply_to_message) return bot.sendMessage(msg.chat.id, `📌 Foydalanuvchining xabariga *reply* qiling!`, { parse_mode: 'Markdown' });
  const target = msg.reply_to_message.from;
  const count = await getMemberCount(msg.chat.id, target.id);
  await bot.sendMessage(msg.chat.id, `📈 *${target.first_name}* bu guruhga jami *${count}* ta odam qo'shgan! 🏅\n\n${count > 0 ? "🌟 Ajoyib natija!" : "😐 Hali hech kim qo'shmagan."}`, { parse_mode: 'Markdown' });
});

bot.onText(/\/top/, async (msg) => {
  if (msg.chat.type === 'private') return;
  if (!await isBotAdmin(msg.chat.id)) return bot.sendMessage(msg.chat.id, `⚠️ Meni admin qilishingiz shart!`, { parse_mode: 'Markdown' });
  const top = await getTop10(msg.chat.id);
  if (!top.length) return bot.sendMessage(msg.chat.id, `📊 Hali hech kim odam qo'shmagan!\n\n🚀 Birinchi bo'lish uchun do'stlaringizni taklif qiling!`, { parse_mode: 'Markdown' });
  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
  let text = `🏆 *TOP 10 — Eng ko'p odam qo'shganlar!*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  for (let i = 0; i < top.length; i++) {
    try { const m = await bot.getChatMember(msg.chat.id, top[i].inviter_id); text += `${medals[i]} *${m.user.first_name || "Noma'lum"}* — ${top[i].cnt} ta 👥\n`; }
    catch { text += `${medals[i]} Foydalanuvchi — ${top[i].cnt} ta 👥\n`; }
  }
  text += `\n━━━━━━━━━━━━━━━━━━━━\n💪 Siz ham ro'yxatga kiring!`;
  await bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

bot.onText(/\/delson/, async (msg) => {
  if (msg.chat.type === 'private') return;
  if (!await isBotAdmin(msg.chat.id)) return bot.sendMessage(msg.chat.id, `⚠️ Meni admin qilishingiz shart!`, { parse_mode: 'Markdown' });
  if (!await isAdmin(msg.chat.id, msg.from.id)) return bot.sendMessage(msg.chat.id, `🚫 Bu buyruq faqat *guruh adminlari* uchun!`, { parse_mode: 'Markdown' });
  await db.run('DELETE FROM member_stats WHERE group_id = ?', msg.chat.id);
  await bot.sendMessage(msg.chat.id, `🗑 *Barcha statistika muvaffaqiyatli tozalandi!*\n\n📊 Yangi hisob boshlandi. Omad! 🚀`, { parse_mode: 'Markdown' });
});

bot.onText(/\/clean/, async (msg) => {
  if (msg.chat.type === 'private') return;
  if (!await isBotAdmin(msg.chat.id)) return bot.sendMessage(msg.chat.id, `⚠️ Meni admin qilishingiz shart!`, { parse_mode: 'Markdown' });
  if (!await isAdmin(msg.chat.id, msg.from.id)) return bot.sendMessage(msg.chat.id, `🚫 Bu buyruq faqat *guruh adminlari* uchun!`, { parse_mode: 'Markdown' });
  if (!msg.reply_to_message) return bot.sendMessage(msg.chat.id, `📌 Foydalanuvchining xabariga *reply* qiling!`, { parse_mode: 'Markdown' });
  const target = msg.reply_to_message.from;
  await db.run('DELETE FROM member_stats WHERE group_id = ? AND inviter_id = ?', msg.chat.id, target.id);
  await bot.sendMessage(msg.chat.id, `🧹 *${target.first_name}*ning statistikasi *0* ga tushirildi!`, { parse_mode: 'Markdown' });
});

bot.onText(/\/add(?:\s+(.+))?/, async (msg, match) => {
  if (msg.chat.type === 'private') return;
  if (!await isBotAdmin(msg.chat.id)) return bot.sendMessage(msg.chat.id, `⚠️ Meni admin qilishingiz shart!`, { parse_mode: 'Markdown' });
  if (!await isAdmin(msg.chat.id, msg.from.id)) return bot.sendMessage(msg.chat.id, `🚫 Bu buyruq faqat *guruh adminlari* uchun!`, { parse_mode: 'Markdown' });
  await saveGroup(msg.chat.id, msg.chat.title);
  const arg = match[1]?.trim();
  if (!arg) return bot.sendMessage(msg.chat.id, `👥 *Majburiy qo'shish:*\n\n/add 10 — 10 ta odam qo'shishni majburiy qilish\n❗️ 10 o'rniga istalgan raqam!\n\n/add off — O'chirish`, { parse_mode: 'Markdown' });
  if (arg === 'off') {
    await db.run('UPDATE groups SET force_add_active = 0, force_add_limit = 0 WHERE group_id = ?', msg.chat.id);
    return bot.sendMessage(msg.chat.id, `✅ Majburiy qo'shish *o'chirildi!*\n\n😌 Endi yangi a'zolardan talab yo'q.`, { parse_mode: 'Markdown' });
  }
  const limit = parseInt(arg);
  if (isNaN(limit) || limit < 1) return bot.sendMessage(msg.chat.id, `❌ Noto'g'ri raqam! Masalan: /add 10`);
  await db.run('UPDATE groups SET force_add_active = 1, force_add_limit = ? WHERE group_id = ?', limit, msg.chat.id);
  await bot.sendMessage(msg.chat.id, `✅ Majburiy qo'shish *yoqildi!*\n\n👥 Har bir yangi a'zo *${limit}* ta do'stini taklif qilishi kerak!\n\n💡 O'chirish: /add off`, { parse_mode: 'Markdown' });
});

bot.onText(/\/textforce(?:\s+(.+))?/, async (msg, match) => {
  if (msg.chat.type === 'private') return;
  if (!await isAdmin(msg.chat.id, msg.from.id)) return bot.sendMessage(msg.chat.id, `🚫 Bu buyruq faqat *guruh adminlari* uchun!`, { parse_mode: 'Markdown' });
  const arg = match[1]?.trim();
  if (!arg) return bot.sendMessage(msg.chat.id, `📌 Namuna: /textforce Salom!\n\nO'chirish: /textforce 0`, { parse_mode: 'Markdown' });
  if (arg === '0') { await db.run('UPDATE groups SET force_text = ? WHERE group_id = ?', '', msg.chat.id); return bot.sendMessage(msg.chat.id, `✅ Qo'shimcha matn *o'chirildi!*`, { parse_mode: 'Markdown' }); }
  await db.run('UPDATE groups SET force_text = ? WHERE group_id = ?', arg, msg.chat.id);
  await bot.sendMessage(msg.chat.id, `✅ Qo'shimcha matn saqlandi!\n\n📝 _${arg}_`, { parse_mode: 'Markdown' });
});

bot.onText(/\/text_time(?:\s+(\d+))?/, async (msg, match) => {
  if (msg.chat.type === 'private') return;
  if (!await isAdmin(msg.chat.id, msg.from.id)) return bot.sendMessage(msg.chat.id, `🚫 Bu buyruq faqat *guruh adminlari* uchun!`, { parse_mode: 'Markdown' });
  if (!match[1]) return bot.sendMessage(msg.chat.id, `📌 Namuna: /text_time 30 — matn 30 soniyada o'chadi`, { parse_mode: 'Markdown' });
  const seconds = parseInt(match[1]);
  await db.run('UPDATE groups SET force_text_time = ? WHERE group_id = ?', seconds, msg.chat.id);
  await bot.sendMessage(msg.chat.id, `✅ Matn *${seconds}* soniyadan keyin avtomatik o'chiriladi! ⏱`, { parse_mode: 'Markdown' });
});

bot.onText(/\/deforce(?:\s+(.+))?/, async (msg, match) => {
  if (msg.chat.type === 'private') return;
  if (!await isAdmin(msg.chat.id, msg.from.id)) return bot.sendMessage(msg.chat.id, `🚫 Bu buyruq faqat *guruh adminlari* uchun!`, { parse_mode: 'Markdown' });
  let targetId;
  if (msg.reply_to_message) targetId = msg.reply_to_message.from.id;
  else if (match[1]) targetId = parseInt(match[1]);
  else return bot.sendMessage(msg.chat.id, `📌 Reply qiling yoki ID kiriting: /deforce 12345`);
  await db.run('DELETE FROM member_stats WHERE group_id = ? AND inviter_id = ?', msg.chat.id, targetId);
  await bot.sendMessage(msg.chat.id, `🗑 ID *${targetId}* ning ma'lumotlari tozalandi!`, { parse_mode: 'Markdown' });
});

bot.onText(/\/plus(?:\s+(.+))?/, async (msg, match) => {
  if (msg.chat.type === 'private') return;
  let targetId;
  if (msg.reply_to_message) targetId = msg.reply_to_message.from.id;
  else if (match[1]) targetId = parseInt(match[1]);
  else return bot.sendMessage(msg.chat.id, `📌 Reply qiling yoki ID kiriting!`);
  const myCount = await getMemberCount(msg.chat.id, msg.from.id);
  if (myCount === 0) return bot.sendMessage(msg.chat.id, `❌ Sizda o'tkazish uchun bal yo'q!\n\n💡 Avval guruhga odam qo'shing.`, { parse_mode: 'Markdown' });
  await db.run('UPDATE member_stats SET inviter_id = ? WHERE group_id = ? AND inviter_id = ?', targetId, msg.chat.id, msg.from.id);
  await bot.sendMessage(msg.chat.id, `✅ *${msg.from.first_name}*ning *${myCount}* ta bali ID *${targetId}* ga o'tkazildi! 🎁`, { parse_mode: 'Markdown' });
});

bot.onText(/\/priv(?:\s+(.+))?/, async (msg, match) => {
  if (msg.chat.type === 'private') return;
  if (!await isAdmin(msg.chat.id, msg.from.id)) return bot.sendMessage(msg.chat.id, `🚫 Bu buyruq faqat *guruh adminlari* uchun!`, { parse_mode: 'Markdown' });
  let targetId;
  if (msg.reply_to_message) targetId = msg.reply_to_message.from.id;
  else if (match[1]) targetId = parseInt(match[1]);
  else return bot.sendMessage(msg.chat.id, `📌 Reply qiling yoki ID kiriting!`);
  await bot.sendMessage(msg.chat.id, `✅ ID *${targetId}* ga imtiyoz berildi! 🌟\n\nEndi bu foydalanuvchi majburiy qo'shishsiz guruhda qola oladi.`, { parse_mode: 'Markdown' });
});

bot.onText(/\/set(?:\s+(.+))?/, async (msg, match) => {
  if (msg.chat.type === 'private') return;
  if (!await isAdmin(msg.chat.id, msg.from.id)) return bot.sendMessage(msg.chat.id, `🚫 Bu buyruq faqat *guruh adminlari* uchun!`, { parse_mode: 'Markdown' });
  const channel = match[1]?.trim();
  if (!channel) return bot.sendMessage(msg.chat.id, `📌 Namuna: /set @kanalim`, { parse_mode: 'Markdown' });
  await db.run('UPDATE groups SET linked_channel = ? WHERE group_id = ?', channel, msg.chat.id);
  await bot.sendMessage(msg.chat.id, `✅ *${channel}* kanali guruhga ulandi!\n\n⚠️ *Muhim:* Meni *${channel}* kanaliga ham *ADMIN* sifatida qo'shishingiz zarur!\n\n❗️ Aks holda majburiy a'zolik tizimi to'g'ri ishlamaydi! 🔗`, { parse_mode: 'Markdown' });
});

bot.onText(/\/unlink/, async (msg) => {
  if (msg.chat.type === 'private') return;
  if (!await isAdmin(msg.chat.id, msg.from.id)) return bot.sendMessage(msg.chat.id, `🚫 Bu buyruq faqat *guruh adminlari* uchun!`, { parse_mode: 'Markdown' });
  await db.run('UPDATE groups SET linked_channel = NULL WHERE group_id = ?', msg.chat.id);
  await bot.sendMessage(msg.chat.id, `✅ Ulangan kanal *o'chirib tashlandi!*\n\n🔓 Majburiy a'zolik tizimi o'chirildi.`, { parse_mode: 'Markdown' });
});

bot.onText(/\/obuna/, async (msg) => {
  if (msg.from.id !== ADMIN_ID) return;
  const row = await db.get('SELECT COUNT(*) as cnt FROM users');
  await bot.sendMessage(msg.chat.id, `📊 *Admin Panel — Statistika*\n\n👥 Bot foydalanuvchilari: *${row?.cnt || 0}* ta\n\n✅ Bot hozir faol ishlayapti!\n🚀 Yangi foydalanuvchilar qo'shilmoqda...`, { parse_mode: 'Markdown' });
});

bot.onText(/\/xabar(?:\s+(.+))?/s, async (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;
  const message = match[1]?.trim();
  if (!message) return bot.sendMessage(msg.chat.id, `📌 Namuna: /xabar Salom!`, { parse_mode: 'Markdown' });
  const users = await db.all('SELECT user_id FROM users');
  let sent = 0, failed = 0;
  await bot.sendMessage(msg.chat.id, `📤 *${users.length}* ta foydalanuvchiga yuborilmoqda...\n⏳ Kuting!`, { parse_mode: 'Markdown' });
  for (const user of users) {
    try { await bot.sendMessage(user.user_id, `📢 *Botdan xabar:*\n\n${message}\n\n━━━━━━━━━━━━━━━\n👑 ${OWNER}`, { parse_mode: 'Markdown' }); sent++; await new Promise(r => setTimeout(r, 50)); }
    catch { failed++; }
  }
  await bot.sendMessage(msg.chat.id, `✅ *Yakunlandi!*\n\n📨 Muvaffaqiyatli: *${sent}* ta\n❌ Xato: *${failed}* ta`, { parse_mode: 'Markdown' });
});

bot.on('polling_error', (error) => console.error('Polling error:', error.message));

initDB().then(() => console.log(`Bot ishga tushdi! @${BOT_USERNAME}`));
