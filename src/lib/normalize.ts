// src/lib/normalize.ts

/** Нормализация телефона: +380XXXXXXXXX формат.
 * Возвращаем +380код (минимум 10 цифр) или null, если не похоже на телефон.
 */
export function normalizePhone(raw?: string | null): string | null {
    const digits = (raw ?? "").replace(/\D/g, "");
    if (digits.length < 10) return null;

    // Если уже начинается с 380 (международный формат)
    if (digits.startsWith("380")) {
      return `+${digits}`;
    }

    // Если локальный формат (0XXXXXXXXX) - добавляем +380
    if (digits.startsWith("0") && digits.length === 10) {
      return `+380${digits.slice(1)}`;
    }

    // Любой другой случай с 10+ цифрами - добавляем +380
    return `+380${digits}`;
  }
  
  /** Нормализация Telegram-хэндла:
   * - пустое -> null
   * - если это email — возвращаем null (пусть обработается как email)
   * - убираем ведущий @, приводим к нижнему регистру
   * - если есть пробелы — считаем невалидным (возврат null)
   */
  export function normalizeTelegram(raw?: string | null): string | null {
    const s = (raw ?? "").trim();
    if (!s) return null;
    if (/\s/.test(s)) return null;              // tg-хэндл не содержит пробелов
    if (/\S+@\S+\.\S+/.test(s)) return null;    // это email, не tg
    const handle = s.startsWith("@") ? s.slice(1) : s;
    return handle ? handle.toLowerCase() : null;
  }
  
  /** Нормализация email: валидный → в нижний регистр, иначе null */
  export function normalizeEmail(raw?: string | null): string | null {
    const s = (raw ?? "").trim().toLowerCase();
    return /\S+@\S+\.\S+/.test(s) ? s : null;
  }
  
  /** Разложение "идентификатора" по типам.
   * Вернёт объект с одним из полей { email? , phone? , telegram? } — только распознанное.
   */
  export function splitIdentifier(
    raw?: string | null
  ): { email?: string; phone?: string; telegram?: string } {
    const email = normalizeEmail(raw);
    if (email) return { email };
  
    const phone = normalizePhone(raw);
    if (phone) return { phone };
  
    const telegram = normalizeTelegram(raw);
    if (telegram) return { telegram };
  
    return {};
  }
  
  /** Единый нормализованный ключ (как в booking.contactNormalized).
   * Приоритет: email → phone → telegram → просто lowercased строка (fallback).
   */
  export function normalizeAnyContact(raw?: string | null): string {
    const email = normalizeEmail(raw);
    if (email) return email;
  
    const phone = normalizePhone(raw);
    if (phone) return phone;
  
    const tg = normalizeTelegram(raw);
    if (tg) return tg;
  
    return (raw ?? "").trim().toLowerCase();
  }
  
  /** Алиас для совместимости со старыми импортами. */
  export const normalizeContact = normalizeAnyContact;
  
  /** Сравнение контактов по нормализованному значению. */
  export function isSameContact(a?: string | null, b?: string | null): boolean {
    return normalizeAnyContact(a) === normalizeAnyContact(b);
  }
  