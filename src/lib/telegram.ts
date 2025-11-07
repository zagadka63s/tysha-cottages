// src/lib/telegram.ts
import { Bot } from "grammy";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;

if (!BOT_TOKEN) {
  console.warn("⚠️ TELEGRAM_BOT_TOKEN not found in environment variables");
}

// Создаем экземпляр бота
const bot = BOT_TOKEN ? new Bot(BOT_TOKEN) : null;

/**
 * Отправляет сообщение в Telegram
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: {
    parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
    reply_markup?: any;
  }
) {
  if (!bot) {
    console.warn("Telegram bot not initialized");
    return null;
  }

  try {
    const result = await bot.api.sendMessage(chatId, text, {
      parse_mode: options?.parse_mode || "HTML",
      reply_markup: options?.reply_markup,
    });
    return result;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return null;
  }
}

/**
 * Отправляет фото в Telegram
 */
export async function sendTelegramPhoto(
  chatId: string | number,
  photo: string, // URL или file_id
  caption?: string,
  options?: {
    parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
    reply_markup?: any;
  }
) {
  if (!bot) {
    console.warn("Telegram bot not initialized");
    return null;
  }

  try {
    const result = await bot.api.sendPhoto(chatId, photo, {
      caption,
      parse_mode: options?.parse_mode || "HTML",
      reply_markup: options?.reply_markup,
    });
    return result;
  } catch (error) {
    console.error("Error sending Telegram photo:", error);
    return null;
  }
}

/**
 * Отправляет уведомление админу о новой брони с inline кнопками
 */
export async function notifyAdminNewBooking(booking: {
  id: string;
  guestName: string;
  guestContact: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  childrenTotal: number;
  childrenOver6: number;
  hasPet: boolean;
  totalUAH: number;
  comment?: string;
  source?: string;
}) {
  if (!ADMIN_ID) {
    console.warn("ADMIN_ID not configured");
    return null;
  }

  const nights = Math.ceil((booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const totalGuests = booking.adults + booking.childrenTotal;

  const message = `
🔔 <b>Нове бронювання!</b>

📋 ID: <code>${booking.id}</code>
👤 Ім'я: ${booking.guestName}
📞 Контакт: ${booking.guestContact}

📅 Заїзд: ${formatDate(booking.checkIn)}
📅 Виїзд: ${formatDate(booking.checkOut)}
🌙 Ночей: ${nights}

👥 Гостей: ${totalGuests}
   • Дорослих: ${booking.adults}
   • Дітей: ${booking.childrenTotal}${booking.childrenOver6 > 0 ? ` (старших 6 років: ${booking.childrenOver6})` : ""}
${booking.hasPet ? "🐾 З домашнім улюбленцем" : ""}

💰 Сумма: ₴${booking.totalUAH.toLocaleString("uk-UA")}
${booking.comment ? `\n💬 Коментар: ${booking.comment}` : ""}
${booking.source ? `\n📱 Джерело: ${booking.source}` : ""}

⏳ <b>Статус: Очікує підтвердження</b>
  `.trim();

  // Inline кнопки для быстрого подтверждения/отклонения
  return sendTelegramMessage(ADMIN_ID, message, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Підтвердити", callback_data: `confirm_${booking.id}` },
          { text: "❌ Відхилити", callback_data: `cancel_${booking.id}` },
        ],
      ],
    },
  });
}

/**
 * Отправляет уведомление админу о загрузке чека
 */
export async function notifyAdminReceiptUploaded(data: {
  bookingId: string;
  guestName: string;
  receiptUrl: string;
  totalUAH: number;
}) {
  if (!ADMIN_ID) {
    console.warn("ADMIN_ID not configured");
    return null;
  }

  const message = `
💰 <b>Завантажено чек оплати</b>

📋 Бронь: <code>${data.bookingId}</code>
👤 Гість: ${data.guestName}
💵 Сумма: ₴${data.totalUAH.toLocaleString("uk-UA")}

Перевірте чек та підтвердіть оплату у кабінеті.
  `.trim();

  // Отправляем фото чека
  if (data.receiptUrl.startsWith("http")) {
    return sendTelegramPhoto(ADMIN_ID, data.receiptUrl, message);
  } else {
    // Если это локальный путь, отправляем только текст
    return sendTelegramMessage(ADMIN_ID, message);
  }
}

/**
 * Отправляет уведомление клиенту о подтверждении брони
 */
export async function notifyGuestBookingConfirmed(
  chatId: string,
  booking: {
    id: string;
    checkIn: Date;
    checkOut: Date;
    totalUAH: number;
  }
) {
  const message = `
✅ <b>Вашу бронь підтверджено!</b>

📋 Номер брони: <code>${booking.id}</code>
📅 Заїзд: ${formatDate(booking.checkIn)}
📅 Виїзд: ${formatDate(booking.checkOut)}
💰 До сплати: ₴${booking.totalUAH.toLocaleString("uk-UA")}

Чекаємо на вас! 🌲
  `.trim();

  return sendTelegramMessage(chatId, message);
}

/**
 * Отправляет уведомление клиенту об отмене брони
 */
export async function notifyGuestBookingCancelled(
  chatId: string,
  booking: {
    id: string;
    reason?: string;
  }
) {
  const message = `
❌ <b>Вашу бронь скасовано</b>

📋 Номер брони: <code>${booking.id}</code>
${booking.reason ? `\nПричина: ${booking.reason}` : ""}

Якщо у вас є питання, зв'яжіться з нами.
  `.trim();

  return sendTelegramMessage(chatId, message);
}

// Вспомогательная функция форматирования даты
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export { bot };
