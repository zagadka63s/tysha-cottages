// src/app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { webhookCallback } from "grammy";
import { Bot } from "grammy";
import { prisma } from "@/lib/prisma";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not defined");
}

// Создаем бота
const bot = new Bot(BOT_TOKEN);

// Нормализация телефона (удаляем все кроме цифр и +)
function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

// ==================== КОМАНДЫ ====================

// /start - Начало работы с ботом
bot.command("start", async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const isAdmin = chatId === ADMIN_ID;

  // Извлекаем параметры из /start (например: /start booking_cmhlz078p0001vbws5xgzx66j)
  const startPayload = ctx.match || "";
  const bookingMatch = startPayload.toString().match(/booking_([a-z0-9]+)/i);
  const bookingId = bookingMatch ? bookingMatch[1] : null;

  if (isAdmin) {
    await ctx.reply(
      "👋 Привіт, адміністратор!\n\n" +
        "Доступні команди:\n" +
        "/today - брони на сьогодні\n" +
        "/week - брони на тиждень\n" +
        "/pending - непідтверджені брони\n\n" +
        "Ви автоматично отримуватимете сповіщення про нові брони та завантажені чеки."
    );
  } else {
    // Проверяем, авторизован ли пользователь
    const user = await prisma.user.findUnique({
      where: { telegramChatId: chatId },
    });

    if (user) {
      // Пользователь авторизован
      let message = `👋 Вітаємо, ${user.name || "гість"}!\n\n`;

      // Если есть bookingId - показываем информацию о брони
      if (bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
        });

        if (booking && booking.userId === user.id) {
          message += `📋 Бронь: <code>${booking.id}</code>\n`;
          message += `📅 ${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}\n`;
          message += `💰 Сумма: ₴${booking.quoteTotalUAH?.toLocaleString("uk-UA") || "—"}\n\n`;
          message += `Щоб надіслати квитанцію про оплату, просто надішліть фото чека в цей чат.\n\n`;
        }
      }

      message += "Доступні команди:\n";
      message += "/my_bookings - мої брони\n";
      message += "/contact - написати адміністратору";

      await ctx.reply(message, { parse_mode: "HTML" });
    } else {
      // Запрашиваем номер телефона для авторизации
      let message = "👋 Вітаємо у Тиша Котеджі!\n\n";

      if (bookingId) {
        message += "Щоб надіслати квитанцію про оплату та переглядати свої брони, ";
      } else {
        message += "Щоб переглядати свої брони та отримувати сповіщення, ";
      }

      message += "будь ласка, поділіться своїм номером телефону.";

      await ctx.reply(message, {
        reply_markup: {
          keyboard: [
            [
              {
                text: "📱 Поділитися номером",
                request_contact: true,
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });

      await ctx.reply(
        "Або надішліть свій email у форматі:\nприклад@email.com",
        { reply_markup: { remove_keyboard: true } }
      );
    }
  }
});

// ==================== ОБРАБОТЧИКИ INLINE КНОПОК ====================

// Обработка нажатий на inline кнопки (подтверждение/отклонение броней)
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const chatId = ctx.chat?.id.toString();

  if (!chatId) {
    await ctx.answerCallbackQuery("❌ Помилка: не вдалося визначити чат");
    return;
  }

  // Только админ может использовать кнопки
  if (chatId !== ADMIN_ID) {
    await ctx.answerCallbackQuery("❌ Ця функція доступна тільки адміністратору");
    return;
  }

  try {
    // confirm_BOOKING_ID или cancel_BOOKING_ID или payment_BOOKING_ID
    const [action, bookingId] = data.split("_");

    if (!bookingId || !["confirm", "cancel", "payment"].includes(action)) {
      await ctx.answerCallbackQuery("❌ Невірна команда");
      return;
    }

    // Обработка подтверждения оплаты
    if (action === "payment") {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { user: true },
      });

      if (!booking) {
        await ctx.answerCallbackQuery("❌ Бронювання не знайдено");
        return;
      }

      // Обновляем статус на CONFIRMED
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" },
      });

      // Редактируем подпись к фото
      const updatedCaption =
        `✅ <b>Оплату підтверджено!</b>\n\n` +
        `📋 Бронь: <code>${booking.id}</code>\n` +
        `👤 Гість: ${booking.name}\n` +
        `📞 Телефон: ${booking.contact}\n` +
        `💵 Сумма: ₴${booking.quoteTotalUAH?.toLocaleString("uk-UA") || "—"}`;

      await ctx.editMessageCaption({
        caption: updatedCaption,
        parse_mode: "HTML",
      });

      await ctx.answerCallbackQuery("✅ Оплату підтверджено");

      // Уведомляем клиента
      if (booking.user?.telegramChatId) {
        const clientMessage =
          `✅ <b>Оплату підтверджено!</b>\n\n` +
          `📋 Номер брони: <code>${booking.id}</code>\n` +
          `📅 Заїзд: ${formatDate(booking.checkIn)}\n` +
          `📅 Виїзд: ${formatDate(booking.checkOut)}\n\n` +
          `Чекаємо на вас! 🌲`;

        await prisma.$disconnect();
        const { sendTelegramMessage } = await import("@/lib/telegram");
        await sendTelegramMessage(booking.user.telegramChatId, clientMessage);
      }

      return;
    }

    // Получаем бронь из БД
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true },
    });

    if (!booking) {
      await ctx.answerCallbackQuery("❌ Бронювання не знайдено");
      return;
    }

    // Обновляем статус
    const newStatus = action === "confirm" ? "CONFIRMED" : "CANCELLED";
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: newStatus },
    });

    // Редактируем сообщение с новым статусом
    const statusEmoji = newStatus === "CONFIRMED" ? "✅" : "❌";
    const statusText = newStatus === "CONFIRMED" ? "Підтверджено" : "Відхилено";

    const updatedMessage = `
${statusEmoji} <b>Бронь ${statusText.toLowerCase()}!</b>

📋 ID: <code>${booking.id}</code>
👤 Гість: ${booking.name}
📞 Телефон: ${booking.contact}

📅 Заїзд: ${formatDate(booking.checkIn)}
📅 Виїзд: ${formatDate(booking.checkOut)}
👥 Гостей: ${booking.guests}

💰 Сумма: ₴${booking.quoteTotalUAH?.toLocaleString("uk-UA") || "—"}

Статус: ${statusEmoji} <b>${statusText}</b>
    `.trim();

    await ctx.editMessageText(updatedMessage, {
      parse_mode: "HTML",
      reply_markup: undefined, // Убираем кнопки
    });

    await ctx.answerCallbackQuery(`${statusEmoji} Бронь ${statusText.toLowerCase()}`);

    // Отправляем уведомление клиенту, если он авторизован
    if (booking.user?.telegramChatId) {
      if (newStatus === "CONFIRMED") {
        const clientMessage = `
✅ <b>Вашу бронь підтверджено!</b>

📋 Номер брони: <code>${booking.id}</code>
📅 Заїзд: ${formatDate(booking.checkIn)}
📅 Виїзд: ${formatDate(booking.checkOut)}
💰 До сплати: ₴${booking.quoteTotalUAH?.toLocaleString("uk-UA") || "—"}

Чекаємо на вас! 🌲

Оплатити можна за посиланням:
${process.env.NEXTAUTH_URL || "http://localhost:3000"}/pay/${booking.id}
        `.trim();

        await prisma.$disconnect();
        const { sendTelegramMessage } = await import("@/lib/telegram");
        await sendTelegramMessage(booking.user.telegramChatId, clientMessage);
      } else if (newStatus === "CANCELLED") {
        const clientMessage = `
❌ <b>Вашу бронь скасовано</b>

📋 Номер брони: <code>${booking.id}</code>

Якщо у вас є питання, зв'яжіться з нами.
        `.trim();

        await prisma.$disconnect();
        const { sendTelegramMessage } = await import("@/lib/telegram");
        await sendTelegramMessage(booking.user.telegramChatId, clientMessage);
      }
    }
  } catch (error) {
    console.error("Error handling callback query:", error);
    await ctx.answerCallbackQuery("❌ Помилка обробки команди");
  }
});

// Обработка контакта (авторизация по телефону)
bot.on("message:contact", async (ctx) => {
  const contact = ctx.message.contact;
  if (!contact) return;

  const chatId = ctx.chat.id.toString();
  const phoneNormalized = normalizePhone(contact.phone_number);

  try {
    // Ищем пользователя по телефону
    const existingUser = await prisma.user.findUnique({
      where: { phoneNormalized },
    });

    if (existingUser) {
      // Обновляем telegramChatId
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { telegramChatId: chatId },
      });

      // Считаем брони
      const bookingsCount = await prisma.booking.count({
        where: { userId: existingUser.id },
      });

      await ctx.reply(
        `✅ Авторизація успішна!\n\n` +
          `Ви увійшли як: ${existingUser.name || "гість"}\n` +
          `Знайдено бронювань: ${bookingsCount}\n\n` +
          `Команди:\n` +
          `/my_bookings - мої брони\n` +
          `/contact - написати адміністратору`,
        {
          reply_markup: { remove_keyboard: true },
        }
      );
    } else {
      // Создаем нового пользователя
      const newUser = await prisma.user.create({
        data: {
          phoneNormalized,
          telegramChatId: chatId,
          name: `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || undefined,
        },
      });

      // ВАЖНО: Привязываем все существующие брони с этим телефоном к новому User
      const contactNormalized = phoneNormalized; // используем тот же формат что и в bookings

      await prisma.booking.updateMany({
        where: {
          contactNormalized: contactNormalized,
          userId: null, // только те что еще не привязаны
        },
        data: {
          userId: newUser.id,
        },
      });

      // Считаем сколько броней нашли
      const bookingsCount = await prisma.booking.count({
        where: { userId: newUser.id },
      });

      let message = `✅ Вас зареєстровано!\n\n`;

      if (bookingsCount > 0) {
        message += `Знайдено і прив'язано ${bookingsCount} ${bookingsCount === 1 ? "бронювання" : "бронювань"}! 🎉\n\n`;
      } else {
        message += `Тепер ви можете створювати брони на сайті, і ми будемо надсилати вам сповіщення тут.\n\n`;
      }

      message += `Команди:\n` +
        `/my_bookings - мої брони\n` +
        `/contact - написати адміністратору`;

      await ctx.reply(message, {
        reply_markup: { remove_keyboard: true },
      });
    }
  } catch (error) {
    console.error("Error during auth:", error);
    await ctx.reply("❌ Помилка авторизації. Спробуйте пізніше.");
  }
});

// /my_bookings - Показать брони клиента
bot.command("my_bookings", async (ctx) => {
  const chatId = ctx.chat.id.toString();

  try {
    const user = await prisma.user.findUnique({
      where: { telegramChatId: chatId },
      include: {
        bookings: {
          orderBy: { checkIn: "desc" },
          take: 10,
        },
      },
    });

    if (!user) {
      await ctx.reply(
        "❌ Ви не авторизовані. Використайте /start для авторизації."
      );
      return;
    }

    if (user.bookings.length === 0) {
      await ctx.reply("У вас поки немає бронювань.");
      return;
    }

    let message = `📋 <b>Ваші бронювання:</b>\n\n`;

    for (const booking of user.bookings) {
      const statusEmoji =
        booking.status === "CONFIRMED"
          ? "✅"
          : booking.status === "CANCELLED"
          ? "❌"
          : "⏳";

      message += `${statusEmoji} <b>${booking.id}</b>\n`;
      message += `📅 ${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}\n`;
      message += `👥 Гостей: ${booking.guests}\n`;
      message += `💰 Сумма: ₴${booking.quoteTotalUAH?.toLocaleString("uk-UA") || "—"}\n`;
      message += `Статус: ${getStatusText(booking.status)}\n\n`;
    }

    await ctx.reply(message, { parse_mode: "HTML" });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    await ctx.reply("❌ Помилка завантаження бронювань.");
  }
});

// /today - Брони на сегодня (только для админа)
bot.command("today", async (ctx) => {
  const chatId = ctx.chat.id.toString();

  if (chatId !== ADMIN_ID) {
    await ctx.reply("❌ Ця команда доступна тільки адміністратору.");
    return;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          {
            checkIn: {
              gte: today,
              lt: tomorrow,
            },
          },
          {
            checkOut: {
              gte: today,
              lt: tomorrow,
            },
          },
        ],
      },
      include: { user: true },
      orderBy: { checkIn: "asc" },
    });

    if (bookings.length === 0) {
      await ctx.reply("Немає бронювань на сьогодні.");
      return;
    }

    let message = `📅 <b>Брони на сьогодні (${formatDate(today)}):</b>\n\n`;

    for (const booking of bookings) {
      const statusEmoji =
        booking.status === "CONFIRMED"
          ? "✅"
          : booking.status === "CANCELLED"
          ? "❌"
          : "⏳";

      message += `${statusEmoji} <code>${booking.id}</code>\n`;
      message += `👤 ${booking.name}\n`;
      message += `📞 ${booking.contact}\n`;
      message += `📅 ${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}\n`;
      message += `💰 ₴${booking.quoteTotalUAH?.toLocaleString("uk-UA") || "—"}\n\n`;
    }

    await ctx.reply(message, { parse_mode: "HTML" });
  } catch (error) {
    console.error("Error fetching today bookings:", error);
    await ctx.reply("❌ Помилка завантаження бронювань.");
  }
});

// /pending - Непідтверджені брони (только для админа)
bot.command("pending", async (ctx) => {
  const chatId = ctx.chat.id.toString();

  if (chatId !== ADMIN_ID) {
    await ctx.reply("❌ Ця команда доступна тільки адміністратору.");
    return;
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: { status: "PENDING" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    if (bookings.length === 0) {
      await ctx.reply("Немає непідтверджених бронювань.");
      return;
    }

    let message = `⏳ <b>Непідтверджені бронювання (${bookings.length}):</b>\n\n`;

    for (const booking of bookings) {
      message += `📋 <code>${booking.id}</code>\n`;
      message += `👤 ${booking.name}\n`;
      message += `📞 ${booking.contact}\n`;
      message += `📅 ${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}\n`;
      message += `💰 ₴${booking.quoteTotalUAH?.toLocaleString("uk-UA") || "—"}\n\n`;
    }

    await ctx.reply(message, { parse_mode: "HTML" });
  } catch (error) {
    console.error("Error fetching pending bookings:", error);
    await ctx.reply("❌ Помилка завантаження бронювань.");
  }
});

// /contact - Написать администратору
bot.command("contact", async (ctx) => {
  await ctx.reply(
    "📞 <b>Контакти адміністрації:</b>\n\n" +
      "📱 Телефон: +380507096162\n" +
      "📧 Email: tyshacottages@gmail.com\n" +
      "💬 Telegram: @a_servelle",
    { parse_mode: "HTML" }
  );
});

// ==================== ОБРАБОТКА EMAIL ДЛЯ АВТОРИЗАЦИИ ====================

// Обработка текстовых сообщений (email для авторизации)
bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const text = ctx.message.text.trim();

  // Игнорируем команды
  if (text.startsWith("/")) return;

  // Игнорируем сообщения от админа
  if (chatId === ADMIN_ID) return;

  // Проверяем, авторизован ли пользователь
  const user = await prisma.user.findUnique({
    where: { telegramChatId: chatId },
  });

  // Если уже авторизован - игнорируем (это может быть подпись к фото)
  if (user) return;

  // Проверяем, это email?
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(text)) {
    await ctx.reply(
      "❌ Невірний формат email. Спробуйте ще раз або натисніть кнопку '📱 Поділитися номером'."
    );
    return;
  }

  const emailNormalized = text.toLowerCase();

  try {
    // Ищем пользователя по email
    const existingUser = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (existingUser) {
      // Обновляем telegramChatId
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { telegramChatId: chatId },
      });

      // Считаем брони
      const bookingsCount = await prisma.booking.count({
        where: { userId: existingUser.id },
      });

      await ctx.reply(
        `✅ Авторизація успішна!\n\n` +
          `Ви увійшли як: ${existingUser.name || "гість"}\n` +
          `Email: ${existingUser.email}\n` +
          `Знайдено бронювань: ${bookingsCount}\n\n` +
          `Команди:\n` +
          `/my_bookings - мої брони\n` +
          `/contact - написати адміністратору`,
        {
          reply_markup: { remove_keyboard: true },
        }
      );
    } else {
      // Email не найден
      await ctx.reply(
        `❌ Користувача з email ${emailNormalized} не знайдено.\n\n` +
          `Спочатку зареєструйтеся на сайті або натисніть кнопку '📱 Поділитися номером' для автоматичної реєстрації.`
      );
    }
  } catch (error) {
    console.error("Error during email auth:", error);
    await ctx.reply("❌ Помилка авторизації. Спробуйте пізніше.");
  }
});

// ==================== ОБРАБОТКА ФОТО ЧЕКОВ ====================

// Обработка фото (чеки оплаты)
bot.on("message:photo", async (ctx) => {
  const chatId = ctx.chat.id.toString();

  // Если фото от админа - игнорируем
  if (chatId === ADMIN_ID) {
    return;
  }

  // Проверяем, авторизован ли пользователь
  const user = await prisma.user.findUnique({
    where: { telegramChatId: chatId },
  });

  if (!user) {
    await ctx.reply(
      "❌ Спочатку авторизуйтеся через /start, щоб надіслати чек."
    );
    return;
  }

  // Получаем брони пользователя
  const userBookings = await prisma.booking.findMany({
    where: {
      userId: user.id,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (userBookings.length === 0) {
    await ctx.reply("❌ У вас немає активних бронювань.");
    return;
  }

  // Получаем фото в максимальном качестве
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const caption = ctx.message.caption || "";

  // Пытаемся найти ID брони в caption
  let bookingId: string | null = null;
  const bookingIdMatch = caption.match(/[a-z0-9]{20,}/i);
  if (bookingIdMatch) {
    bookingId = bookingIdMatch[0];
  }

  // Если ID не найден в caption, предлагаем выбрать бронь
  if (!bookingId || !userBookings.find((b) => b.id === bookingId)) {
    if (userBookings.length === 1) {
      // Если бронь одна - используем её
      bookingId = userBookings[0].id;
    } else {
      // Просим указать номер брони
      let message = "📋 Оберіть бронь, для якої ви надсилаєте чек:\n\n";
      userBookings.forEach((b, i) => {
        message += `${i + 1}. <code>${b.id}</code>\n`;
        message += `   ${formatDate(b.checkIn)} - ${formatDate(b.checkOut)}\n`;
        message += `   ₴${b.quoteTotalUAH?.toLocaleString("uk-UA") || "—"}\n\n`;
      });
      message +=
        "Надішліть фото ще раз із номером брони у підписі, наприклад:\n" +
        `<code>${userBookings[0].id}</code>`;

      await ctx.reply(message, { parse_mode: "HTML" });
      return;
    }
  }

  // Находим бронь
  const booking = userBookings.find((b) => b.id === bookingId);
  if (!booking) {
    await ctx.reply("❌ Бронювання не знайдено.");
    return;
  }

  // Отправляем подтверждение клиенту
  await ctx.reply(
    `✅ Дякуємо! Чек для брони <code>${booking.id}</code> отримано.\n\n` +
      `Ми перевіримо оплату найближчим часом і надішлемо підтвердження.`,
    { parse_mode: "HTML" }
  );

  // Отправляем фото админу с кнопкой подтверждения
  if (ADMIN_ID) {
    const adminMessage =
      `💰 <b>Чек оплати від клієнта</b>\n\n` +
      `📋 Бронь: <code>${booking.id}</code>\n` +
      `👤 Гість: ${booking.name}\n` +
      `📞 Телефон: ${booking.contact}\n` +
      `💵 Сумма: ₴${booking.quoteTotalUAH?.toLocaleString("uk-UA") || "—"}`;

    try {
      await bot.api.sendPhoto(ADMIN_ID, photo.file_id, {
        caption: adminMessage,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Підтвердити оплату",
                callback_data: `payment_${booking.id}`,
              },
            ],
          ],
        },
      });
    } catch (error) {
      console.error("Error sending photo to admin:", error);
    }
  }
});

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "long",
  }).format(new Date(date));
}

function getStatusText(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "Підтверджено";
    case "CANCELLED":
      return "Скасовано";
    case "PENDING":
      return "Очікує підтвердження";
    default:
      return status;
  }
}

// ==================== WEBHOOK ====================

export const POST = webhookCallback(bot, "std/http");
