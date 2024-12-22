const crypto = require("crypto"); // Для шифрования ID

// Ключ для шифрования (замените на уникальный и секретный ключ)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY.padEnd(16, "0").slice(0, 16); // Приводим к 32 символам // 32 байта для AES-256
const IV_LENGTH = 16; // Длина инициализационного вектора

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
            .toString("base64")
            .replace(/=/g, "") // Убираем `=`
            .replace(/\+/g, "-") // Заменяем `+` на `-`
            .replace(/\//g, "_"); // Заменяем `/` на `_`
    },

    // Расшифровка: преобразуем Base64 обратно в userId
    decryptUserId(encrypted) {
        return Buffer.from(
            encrypted.replace(/-/g, "+").replace(/_/g, "/"), // Восстанавливаем символы
            "base64"
        ).toString("utf8");
    }
}


module.exports = { Crypto };