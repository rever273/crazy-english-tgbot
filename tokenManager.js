// tokenManager.js
const axios = require('axios');

const urlBack = process.env.URL_BACK || 'http://localhost:3000';

// Создаём экземпляр axios для запросов к бэкенду
const api = axios.create({
    baseURL: urlBack,
});

// Переменная для хранения текущего токена
let token = null;

// Функция для запроса нового токена
async function refreshToken() {
    try {
        // Данные телеграм-пользователя, по которым генерируется токен
        const telegramUserData = {
            id: '123543223',      // замените на актуальные данные
            username: 'asddsafgs',    // замените на актуальные данные
        };

        const response = await axios.post(`${urlBack}/auth/tg-auth`, telegramUserData);
        token = response.data.access_token;

        // Обновляем заголовок для всех запросов через наш экземпляр api
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log(new Date().toLocaleString(), 'Token updated:', token);

        return token;
    } catch (error) {
        console.error('Error refreshing token:', error.message);
        throw error;
    }
}

// Экспортируем экземпляр api и функцию обновления токена
module.exports = { api, refreshToken };
