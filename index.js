require('dotenv').config(); //{ path: ".env.development" }

const { session, Bot, InlineKeyboard, InputFile } = require('grammy');
const path = require('path');
const { I18n } = require('@grammyjs/i18n');
const { api, refreshToken } = require('./tokenManager');
const config = require('./config');
const cron = require('node-cron');
// const trimDisplayName = require('./clearName');

const { Crypto, UserString } = require('./functions');
const Subscription = require('./checkUserSubscription');
const { checkAndSendMistakeReports } = require('./checkUsersReport');

const User = require('./user');
// const fs = require('fs');

process.env.NODE_NO_WARNINGS = '1';
const BOT_TOKEN = process.env.BOT_TOKEN;

const mode = process.env.MODE || 'unknown';
const lifecycle = process.env.npm_lifecycle_event; // например: "start", "start:dev"

global.isDev = mode === 'development';
global.isLocal = lifecycle === 'start:dev';

global.BACKEND_URL = isLocal
    ? process.env.BACKEND_URL_LOCAL
    : process.env.BACKEND_URL;

console.log(new Date().toLocaleString(), `[Начало работы] MODE: ${mode}. Локальная машина:`, isLocal ? '✅ Да' : '❌ Нет');

async function init() {
    // Сразу получаем токен при старте приложения
    await refreshToken();

    // Автоматически обновляем токен каждые 58 минут
    setInterval(refreshToken, 58 * 60 * 1000);

    const bot = new Bot(BOT_TOKEN); // Укажите токен бота

    // Запуск проверки наличия новых уведомлений от пользователя об ошибках каждые 30 минут
    cron.schedule('*/30 * * * *', () => {
        console.log(new Date(), '[MistakeReport] Проверка наличия новых отчетов об ошибках...');
        checkAndSendMistakeReports(bot);
    });

    //Раз в сутки выполняем проверку подписок всех пользователей
    cron.schedule('0 2 * * *', () => {
        if (isDev || isLocal) {
            console.log('Проверка подписок в тестовой версии!');
        }
        console.log(new Date(), 'Проверка подписок всех пользователей');
        Subscription.checkAllUsersSubscription(bot);
    });

    // Инициализация i18n
    const i18n = new I18n({
        defaultLocale: 'en', // Язык по умолчанию
        // fallbackLocale: 'en',
        directory: path.join(__dirname, './src/locales'), // Путь к папке с переводами
        resolveUserLanguage: (ctx) => ctx.from?.language_code || 'en',
        useSession: false,
        globalTranslationContext(ctx) {
            return { name: ctx.from?.first_name ?? '' };
        },
    });

    bot.use(
        session({
            initial: () => ({}), // Начальное значение — пустой объект
        })
    );

    // Middleware автоматически подставляет язык пользователя
    bot.use(i18n.middleware());

    // bot.use(async (ctx, next) => {
    //     console.log("Language detected:", ctx.i18n?.locale ?? "No language set");
    //      await next();
    // });

    bot.catch((err) => {
        console.error('Error in middleware:', err);
    });

    // Приветственное сообщение
    bot.command('start', async (ctx) => {
        // console.log("Поехали!");

        const text = ctx.message.text;
        const user = new User(ctx.from);

        //Записываем или обновляем пользователя в базу данных
        const operation = await userRegistrationOrUpdate(ctx);

        //проверяем, реферальный ли код у пользователя
        if (operation === 'create' || operation === 'update') await checkReferralCode(ctx, text);

        //Проверка подписки по запросу пользователя из фронта webapp
        if (ctx.match === 'check_subscription') {
            const { subscribed_chat, subscribed_channel } =
                await Subscription.checkUserSubscription(ctx, ctx.from.id);

            if (subscribed_chat) {
                ctx.reply('✅ Вы подписаны на чат Crazy Llama Chat');
            } else {
                ctx.reply('❌ Вы не подписаны на чат Crazy Llama Chat @CrazyLlamaFarmRU_chat');
            }

            if (subscribed_channel) {
                ctx.reply('✅ Вы подписаны на канал Crazy Llama Channel');
            } else {
                ctx.reply('❌ Вы не подписаны на канал Crazy Llama Channel @CrazyLlamaFarmRU');
            }

            //Пока просто интервальная проверка результатов из базы
            if (subscribed_chat && subscribed_channel) {
                return ctx.reply('👍 Вы подписаны на все каналы и чаты');
            }
            return;
        }

        // Получаем и назначаем язык пользователя
        const userLanguage = ctx.from.language_code || 'en';
        ctx.i18n.useLocale(userLanguage);

        const encryptedId = Crypto.encryptUserId(user.user_id); // Шифруем ID пользователя
        const referralCode = `invite_${encryptedId}`;
        const referralLink = `${process.env.BOT_URL}?start=${referralCode}`;

        const imagePath = path.join(__dirname, './src/images/banner.jpg');

        //Отправляем приветственное сообщение
        const msg_text = `${ctx.t('welcome.hi')}\n
${ctx.t('welcome.invite')}\n
${ctx.t('invite_link', { link: referralLink })}`;

        // console.time("replyWithPhoto"); // Начало измерения времени

        const sentMessage = await ctx.replyWithPhoto(new InputFile(imagePath), {
            caption: msg_text,
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard()
                // .webApp(ctx.t("btn.open"), "https://forward2.hive-dev.ru/welcome")
                .webApp(ctx.t('btn.open'), process.env.WEBSITE)
                .row()
                // .url("Поделиться", shareUrl)
                .url(ctx.t('btn.support'), config.supportBot)
                .switchInline(ctx.t('btn.share'), referralCode),
        });

        // console.timeEnd("replyWithPhoto");

        //Закрепляем сообщение у пользователя
        try {
            const chat = await ctx.api.getChat(ctx.chat.id);
            const pinned = chat.pinned_message;

            // Проверка: если есть закреплённое сообщение
            if (pinned) {
                // Если оно не от бота — переподключаем
                const isFromBot = pinned.from?.is_bot;
                if (!isFromBot) {
                    await ctx.api.pinChatMessage(ctx.chat.id, sentMessage.message_id);
                }
            } else {
                console.log("2327_chat==>", chat);
                // Если ничего не закреплено — закрепляем
                await ctx.api.pinChatMessage(ctx.chat.id, sentMessage.message_id);
            }
        } catch (error) {
            console.error('Ошибка при закреплении сообщения:', error);
        }

    });

    // Обработчик добавления новых участников в чат и добавление данных о них в базу
    //Примчание: работает только в супергруппах
    bot.on(['message:new_chat_members', 'chat_member'], async (ctx) => {
        const newMembers = getNewChatMembers(ctx);

        if (!newMembers.length) return;

        for (const user of newMembers) {
            const userId = String(user.id);

            try {
                const chatId = ctx.chat.id;
                const channelData = Subscription.ourChannels.find(
                    (c) => c.id === chatId
                );

                if (!channelData) return;

                const updateData = {
                    tgId: userId,
                };

                if (channelData.type === 'chat') updateData.subscribed_chat = true;
                if (channelData.type === 'channel')
                    updateData.subscribed_channel = true;

                await api.put(`${global.BACKEND_URL}/users/update/`, updateData);

                console.log(
                    `[Bot New Member] Пользователь присоединился в ${ctx.chat.title
                    }, обновляем данные в базе. ${UserString(ctx.from)}`
                );
            } catch (error) {
                console.error(
                    '[Bot New Member] Error updating subscription status:',
                    error.response?.data || error.message
                );
            }
        }
    });

    /**
     * Универсальная функция для получения новых участников чата.
     * @param {Object} ctx - Контекст сообщения.
     * @returns {Array} Массив новых участников.
     */
    const getNewChatMembers = (ctx) => {
        let newMembers = [];

        if (ctx.message) {
            if (ctx.message.new_chat_participant) {
                newMembers = [ctx.message.new_chat_participant];
            } else if (ctx.message.new_chat_member) {
                newMembers = [ctx.message.new_chat_member];
            } else if (ctx.message.new_chat_members) {
                newMembers = ctx.message.new_chat_members;
            }
        } else if (ctx.update && ctx.update.chat_member) {
            const newChatMember = ctx.update.chat_member.new_chat_member?.user;
            if (newChatMember) {
                newMembers = [newChatMember];
            }
        }

        return newMembers;
    };

    bot.command('help', async (ctx) => {
        const imagePath = path.join(__dirname, './src/images/support_llama.jpg');

        await ctx.replyWithPhoto(new InputFile(imagePath), {
            caption: ctx.t('support.title'),
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard()
                .url(ctx.t('btn.support'), config.supportBot)
                .row()
                .webApp(ctx.t('btn.open'), 'https://testo.crazyllama.app'),
        });
    });

    // Обработка инлайн-запроса
    bot.inlineQuery(/^invite_(.+)$/, async (ctx) => {
        const encryptedId = ctx.match[1]; // Получаем зашифрованный ID из инлайн-запроса
        const userLanguage = ctx.from.language_code || 'en'; // Получаем язык пользователя
        ctx.i18n.useLocale(userLanguage);

        const user = new User(ctx.from);
        const thumbUrl = `${process.env.WEBSITE}/images/tg_bot/inline_llama_thumb.jpg`;


        const displayName = user.username
            ? `@${user.username}`
            : user.first_name || 'Пользователь';

        // Формируем URL на preview-страницу
        // const previewUrl = `http://localhost:3000/api/users/preview/${displayName}/${encryptedId}`;
        const previewUrl = `${process.env.WEBSITE}/api/auth/preview/${displayName}/${encryptedId}?v=${Date.now()}`;

        // \nПрисоединяйтесь и изучайте английский язык вместе с нами!
        // Создаем результат для инлайн-меню
        const results = [
            {
                type: 'article',
                id: encryptedId, // Уникальный идентификатор результата
                title: ctx.t('inline.title'),
                description: ctx.t('inline.description'),
                thumb_url: `${thumbUrl}`, // Превью картинки  ?v=${Date.now()}
                input_message_content: {
                    message_text: `<a href="${previewUrl}">🦙🦙🦙</a>`,
                    parse_mode: 'HTML',
                    disable_web_page_preview: false, // Включаем превью ссылки
                },
                reply_markup: new InlineKeyboard().url(
                    ctx.t('btn.study'),
                    `${process.env.BOT_URL}?start=invite_${encryptedId}` // Теперь ведет на страницу с Open Graph превью
                ),
            },
        ];

        await ctx.answerInlineQuery(results);
    });

    // Проверяем, есть ли реферальный код
    async function checkReferralCode(ctx, text) {
        if (text.includes(' ')) {
            const args = text.split(' '); // Разделяем текст команды

            if (args.length > 1) {
                let referralCode = args[1].startsWith('invite_')
                    ? args[1].replace('invite_', '')
                    : args[1]; //Извлекаем зашифрованный ID

                const user_id = ctx.from.id;
                const referral_id = Crypto.decryptUserId(referralCode); // Расшифровываем ID

                //Пользователь совпадает или не имеет реферала
                if (!referral_id || referral_id === '' || Number(user_id) == Number(referral_id)) {
                    return;
                }

                const data = {
                    tgId: user_id,
                    refTgId: referral_id,
                };

                try {
                    await api.post(`${global.BACKEND_URL}/users/ref`, data);
                } catch (error) {
                    console.error('Ошибка при добавлении реферала:', error.message);
                }

                console.log(`[Bot Referral] Пользователь ${UserString(ctx.from)} был приглашен пользователем с ID ${referral_id}`);
            }
        }
    }

    // Регистрация пользователя в базе данных
    async function userRegistrationOrUpdate(ctx) {
        const { subscribed_chat, subscribed_channel } =
            await Subscription.checkUserSubscription(
                ctx,
                ctx.from.id,
                (operation = 'create')
            );

        const data = {
            tgId: Number(ctx.from.id), //BIGINT
            userName: ctx.from?.username || '', //String
            firstName: ctx.from.first_name, //String
            lastName: ctx.from?.last_name || '', //String
            languageCode: ctx?.from?.language_code || 'en', //String
            isPremium: ctx?.from?.is_premium || false, //Boolean
            addedToAttachmentMenu: ctx?.from?.added_to_attachment_menu || false, //Boolean
            subscribed_chat, //Boolean по умолчанию false
            subscribed_channel, //Boolean по умолчанию false
        };

        async function createNewUser(data) {
            try {
                await api.post(`${global.BACKEND_URL}/users`, data);
                console.log(
                    `[Bot Start] Новый участник зарегистрирован: ${UserString(ctx.from)}`
                );
                return 'create';
            } catch (error) {
                console.error('Ошибка при создании нового пользователя:', error.message);
            }
        }

        try {
            // Проверяем, есть ли пользователь в базе
            const response = await api.get(`${global.BACKEND_URL}/users/${data.tgId}`);
            const existingUser = response?.data;

            if (existingUser?.tgId) {
                // Если пользователь есть, проверяем, изменились ли данные
                const hasChanges = Object.entries(data).some(([key, value]) => {
                    const dbValue = existingUser[key];
                    const isDifferent = String(value) !== String(dbValue);
                    // if (isDifferent) {
                    //     console.log(`Изменение в поле "${key}": база="${existingUser[key]}", новые="${value}"`);
                    // }
                    return isDifferent;
                });

                if (hasChanges) {
                    // Обновляем пользователя, если данные изменились
                    await api.put(`${global.BACKEND_URL}/users/update/`, data);
                    console.log(
                        `[Bot Start] Пользователь обновлен: ${UserString(ctx.from)}`
                    );
                    return 'update';
                }
            }
            else { // Если пользователя нет, создаем его
                return createNewUser(data)
            }
        } catch (error) {
            if (error.response) {
                // Сервер ответил, но статус ошибки (например, 404)
                if (error.response.status === 404) {
                    console.log('Пользователь не найден', data.tgId);
                }
                // else if (error.response.status != 500) {
                //     console.log(`Ошибка сервера: ${error.response.status, error?.message}`);
                // }
                return createNewUser(data)
            } else if (error.request) {
                // Запрос был отправлен, но ответа нет (проблема с сетью)
                console.log('Ошибка сети: сервер не отвечает', error?.message);
            } else {
                // Другая ошибка (например, ошибка в коде запроса)
                console.log('Ошибка при запросе:', error.message);
            }
        }
    }

    // Запуск бота
    bot.start();
}

init();
