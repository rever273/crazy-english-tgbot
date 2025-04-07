// tokenManager.js
const axios = require('axios');

// Создаём экземпляр axios для запросов к бэкенду
const api = axios.create({
    baseURL: global.BACKEND_URL,
});

// Переменная для хранения текущего токена
let token = null;

// Функция для запроса нового токена
async function refreshToken() {
    try {
        // Данные телеграм-пользователя, по которым генерируется токен
        const telegramUserData = {
            id: '123543223',      // замените на актуальные данные
            username: 'mybotnam',    // замените на актуальные данные
        };

        const response = await axios.post(`${global.BACKEND_URL}/auth/tg-auth`, telegramUserData);
        token = response.data.access_token;

        // Обновляем заголовок для всех запросов через наш экземпляр api
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log(new Date().toLocaleString(), 'Token updated:', token.slice(0, 10) + '...');

        return token;
    } catch (error) {
        console.error('Error refreshing token:', error.response?.data || error.message);
        throw error;
    }
}

// Экспортируем экземпляр api и функцию обновления токена
module.exports = { api, refreshToken };
