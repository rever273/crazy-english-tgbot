const crypto = require('crypto'); // Для шифрования ID

// Ключ для шифрования (замените на уникальный и секретный ключ)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY.padEnd(16, '0').slice(0, 16); // Приводим к 32 символам // 32 байта для AES-256
const IV_LENGTH = 16; // Длина инициализационного вектора

console.log("3134_process.env.ENCRYPTION_KEY==>", process.env.ENCRYPTION_KEY);
// Функция для шифрования ID пользователя
const Crypto = {
    // encryptUserId(userId) {
    //     const iv = crypto.randomBytes(IV_LENGTH); // Генерация IV длиной 16 байт
    //     const cipher = crypto.createCipheriv("aes-128-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    //     let encrypted = cipher.update(userId.toString(), "utf8");
    //     encrypted = Buffer.concat([encrypted, cipher.final()]);
    //     return Buffer.concat([iv, encrypted]).toString("base64").replace(/=/g, ""); // Убираем `=`
    // },
    // decryptUserId(encrypted) {
    //     const input = Buffer.from(encrypted, "base64");
    //     const iv = input.slice(0, IV_LENGTH); // Первые 16 байт — IV
    //     const encryptedText = input.slice(IV_LENGTH); // Остальное — зашифрованный текст
    //     const decipher = crypto.createDecipheriv("aes-128-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    //     let decrypted = decipher.update(encryptedText);
    //     decrypted = Buffer.concat([decrypted, decipher.final()]);
    //     return decrypted.toString("utf8");
    // }

    encryptUserId(userId) {
        return Buffer.from(userId.toString())
            .toString('base64')
            .replace(/=/g, '') // Убираем `=`
            .replace(/\+/g, '-') // Заменяем `+` на `-`
            .replace(/\//g, '_'); // Заменяем `/` на `_`
    },

    // Расшифровка: преобразуем Base64 обратно в userId
    decryptUserId(encrypted) {
        let base64 = encrypted
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(encrypted.length + (4 - encrypted.length % 4) % 4, '=');

        return Buffer.from(base64, 'base64').toString('utf8');
    },
};

/**
 * Генерирует случайное число в заданном диапазоне
 * @param {number} a - Минимальное значение или длина (если b не указано)
 * @param {number} [b=1] - Максимальное значение
 * @param {boolean} [isIndex=false] - Если true, результат приводится к индексу (вычитает 1)
 * @returns {number} Случайное число в диапазоне [a, b] или [0, a-1] если isIndex=true
 */
function rnd(a, b = 1, isIndex = false) {
    // Проверка на корректность входных данных
    if (typeof a !== 'number' || typeof b !== 'number') {
        throw new Error('Параметры должны быть числами');
    }

    if (a < 0 || b < 0) {
        throw new Error('Параметры не могут быть отрицательными');
    }

    // Обработка режима isIndex
    if (isIndex) {
        if (a === 0) return 0; // Для пустых массивов
        const max = Math.max(a, b);
        const randomValue = Math.floor(Math.random() * max);
        return randomValue;
    }

    // Стандартная логика
    if (a > b) {
        return Math.floor(Math.random() * (a - b + 1)) + b;
    }
    return Math.floor(Math.random() * (b - a + 1)) + a;
}

function UserString(user) {
    return `${(user?.first_name + ' ' + (user?.last_name || '')).trim()} | ${user.username || 'No'
        } | ${user.id} | Premium: ${user.is_premium || 'No'} |`;
}

module.exports = { Crypto, rnd, UserString };
