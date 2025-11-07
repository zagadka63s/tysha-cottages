// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // дизайн-токены бренда
        brand: {
          bg: '#004225',     // Heritage Green — фон страницы/шапки
          ink: '#FFFFFF',    // текст/инверсные элементы
          muted: '#B2BEB5',  // Ash Gray — вторичный текст/бордер
          accent: '#D8C3A5', // Desert Sand — акцент/подсветка
          surface: '#FFFFFF' // белые карточки/формы
        }
      },
      borderRadius: {
        md: '10px',
        xl: '14px' // основной радиус
      },
      boxShadow: {
        soft: '0 6px 20px rgba(0,0,0,.10)'
      }
    }
  }
} satisfies import('tailwindcss').Config
