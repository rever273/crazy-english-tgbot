const { api } = require('./tokenManager');
const config = require('./config');

// Функция проверяет наличие сообщений о новых ошибок и отправляет сообщение в Telegram.
async function checkAndSendMistakeReports(bot) {

    if (global.isLocal) {
        console.log('[Предупреждение] Режим разработки: сообщения в Telegram не отправляются.');
        // return;
    }

    // console.log('[MistakeReport] Проверяем наличие новых отчетов об ошибках...');

    try {
        const reports = await fetchMistakeReports();

        if (reports && reports.length > 0) {
            console.log(`[MistakeReport] Найдено ${reports.length} новых уведомлений об ошибках.`);
            for (const report of reports) {
                const messageText = formatReportMessage(report).slice(0, 990);
                try {
                    // Отправляем изображение с подписью. Если изображение не требуется, можно отправить только текст.
                    const res = await bot.api.sendPhoto(
                        process.env.CHAT_ID_REPORT,
                        `${config.website}/images/dictionary/${report.imageUrl}.jpg`,
                        { caption: messageText, parse_mode: 'HTML' }
                    );

                    if (res && res.message_id) {
                        console.log(`[MistakeReport] Отправлено в ТГ сообщение #${report.id} об ошибке для слова "${report.wordText}"`);
                        await api.put(`${global.BACKEND_URL}/words/report/${report.id}`, { sentToTg: true });
                    }
                } catch (err) {
                    console.error('[MistakeReport] Ошибка при отправке сообщения в Telegram:', err);
                }
            }
        } else {
            console.log('[MistakeReport] Новых уведомлений об ошибках не найдено.');
        }
    } catch (err) {
        console.error('[MistakeReport] Ошибка при получении данных об ошибках:', err);
    }
}

/**
   * @returns {Promise<Array<Object>>} –
   */
async function fetchMistakeReports() {
    const response = await api.get(`${global.BACKEND_URL}/words/report`);
    return response.data;
}

/**
 * Функция для форматирования сообщения об ошибке с эмоджи.
 * @param {Object} report – объект с данными ошибки
 * @returns {string} – отформатированное сообщение в формате Markdown
 */
function formatReportMessage(report) {

    const translation = report?.word?.translation.find((item) => item.id === report.translationIndex);
    // console.log("2149_report==>", report);

    return (
        `🚨 <b>Новое уведомление об ошибке в слове #${report.id}!</b>\n\n` +
        `👤 Пользователь: <b>@${report.username} (ID: ${report.userId})</b>\n\n` +

        `🔤 Слово: <b>${report.wordText}</b> <i>(word_id: ${report.wordId}, level: ${report?.word?.level})</i>\n` +
        `▫️ translation: <b>${translation.translation}</b> <i>(#${report.translationIndex})</i>\n` +
        `▫️ transcription: <b>${report?.word?.transcription_1}</b>\n` +
        `▫️ pronunciation: <b>${report?.word?.pronunciation_rus}</b>\n` +
        `▫️ description: <b>${report?.word?.description.slice(0, 400)}</b>\n` +
        `▫️ example_en: <b>${report?.word?.example[report.exampleIndex].example_en}</b> <i>(#${report.exampleIndex})</i>\n` +
        `▫️ example_ru: <b>${report?.word?.example[report.exampleIndex].example_ru}</b>\n\n` +

        `✅ Где ошибка:\n<b>` +
        report.selectedOptions.map(opt => `• ${opt}`).join('\n') + '</b>\n\n' +
        (report?.comment ? `💬 Комментарий: <b>${report?.comment}</b>\n\n` : '') +
        `⏰ <i>Время: ${new Date(report.date).toLocaleString()}</i>`
    );
}

module.exports = { checkAndSendMistakeReports };
