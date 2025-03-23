const { api } = require('./tokenManager');

// Функция проверяет наличие сообщений о новых ошибок и отправляет сообщение в Telegram.
async function checkAndSendMistakeReports(bot) {

    if (process.env.NODE_ENV == 'development') {
        // console.log('Режим разработки: сообщения в Telegram не отправляются.');
        return;
    }

    console.log('Проверяем наличие новых ошибок...');

    try {
        const reports = await fetchMistakeReports();

        if (reports && reports.length > 0) {
            for (const report of reports) {
                const messageText = formatReportMessage(report);
                try {
                    // Отправляем изображение с подписью. Если изображение не требуется, можно отправить только текст.
                    const res = await bot.api.sendPhoto(
                        process.env.CHAT_ID_REPORT,
                        report.imageUrl,
                        { caption: messageText, parse_mode: 'HTML' }
                    );

                    if (res && res.message_id) {
                        console.log(`Отправлено сообщение об ошибке для слова "${report.word}"`);
                        //TODO добавляем UPDATE SQL запрос, чтобы пометить запись как отправленную (sentToTg = true)
                    }
                } catch (err) {
                    console.error('Ошибка при отправке сообщения в Telegram:', err);
                }
            }
        } else {
            console.log('Новых уведомлений об ошибках не найдено.');
        }
    } catch (err) {
        console.error('Ошибка при получении данных об ошибках:', err);
    }
}

/**
   * Временная функция для имитации получения новых записей из базы данных.
   * Пока нет фактического API, возвращаем статический объект.
   * @returns {Promise<Array<Object>>} – массив с объектами ошибок
   */
async function fetchMistakeReports() {
    //TODO добавить логику запроса к базе и вернуть массив новых уведолений.
    //Делаем SQL запрос, где ищем все записи с sentToTg = false (потом поменяем на true)

    //Пример (временный) полученных данных (сейчас только одно значение, может быть больше)
    const sampleReport = {
        userId: "123",
        username: "developer",
        id: 97,
        word_id: 10,
        word: "from",
        level: 1,
        imageUrl: "https://crazyllama.app/images/dictionary/from.jpg",
        translation_0: "ты",
        transcription_1: "[juː]",
        pronunciation_rus: "«ию»",
        description: "Используется для обращения к одному или нескольким людям, выражения вежливости, указания на адресата.",
        example_en: "Can you help me with this task?",
        example_ru: "Ты мой лучший друг.",
        selectedOptions: ["transcription", "example"],
        comment: "ffff",
        sentToTg: false,
        timestamp: "2025-02-07T14:10:21.356Z"
    };

    // Временно возвращаем массив с одним примером.
    return [sampleReport];
}

/**
 * Функция для форматирования сообщения об ошибке с эмоджи.
 * @param {Object} report – объект с данными ошибки
 * @returns {string} – отформатированное сообщение в формате Markdown
 */
function formatReportMessage(report) {
    return (
        `🚨 <b>Новое уведомление об ошибке в слове!</b>\n\n` +
        `👤 Пользователь: <b>@${report.username} (ID: ${report.userId})</b>\n\n` +

        `🔤 Слово: <b>${report.word}</b> (word_id: ${report.word_id}, level: ${report.level})\n` +
        `▫️ translation: <b>${report.translation_0}</b>\n` +
        `▫️ transcription: <b>${report.transcription_1}</b>\n` +
        `▫️ pronunciation: <b>${report.pronunciation_rus}</b>\n` +
        `▫️ description: <b>${report.description}</b>\n` +
        `▫️ example_en: <b>${report.example_en}</b>\n` +
        `▫️ example_ru: <b>${report.example_ru}</b>\n\n` +

        `✅ Где ошибка:\n<b>` +
        report.selectedOptions.join('\n') + '</b>\n\n' +
        `💬 Комментарий: <b>${report.comment}</b>\n\n` +
        `⏰ <i>Время: ${new Date(report.timestamp).toLocaleString()}</i>`
    );
}

module.exports = { checkAndSendMistakeReports };
