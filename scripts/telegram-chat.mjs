const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Добавьте TELEGRAM_BOT_TOKEN в локальный .env.local. Не публикуйте этот файл.');
const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, { signal: AbortSignal.timeout(10000) });
const data = await response.json();
if (!response.ok || !data.ok) throw new Error('Не удалось получить данные бота. Проверьте токен и отсутствие активного webhook.');
const chats = new Map();
for (const update of data.result) {
  const chat = update.message?.chat || update.my_chat_member?.chat;
  if (chat) chats.set(chat.id, { chat_id: chat.id, type: chat.type, title: chat.title || chat.first_name || '' });
}
if (!chats.size) console.log('Напишите /start боту или добавьте его в закрытую группу и отправьте /start@имя_бота, затем повторите команду.');
else console.log(JSON.stringify([...chats.values()], null, 2));
