const { api } = require('./tokenManager');
const urlBack = process.env.URL_BACK;
const key = process.env.SECRET_USER_KEY;

if (!key) console.error('No SECRET_USER_KEY in .env file');

const Subscription = {
    ourChannels: [
        // {
        //     id: -1002212028343,
        //     type: 'channel',
        //     name: 'English Quiz (по опросам)',
        //     url: 'https://t.me/english_quiz_poll'
        // },
        {
            id: -1001603596929,
            type: 'chat',
            name: 'Crazy Llama Chat',
            url: 'https://t.me/CrazyLlamaFarmRU_chat',
        },
        {
            id: -1001527645697,
            type: 'channel',
            name: 'Crazy Llama Channel',
            url: 'https://t.me/CrazyLlamaFarmRU',
        },
        //Временные данные
        // {
        //     id: -1002325704999,
        //     type: 'chat',
        //     name: 'Crazy Llama Chat',
        //     url: 'https://t.me/CrazyLlamaFarmRU_chat'
        // },
        // {
        //     id: -1002381148127,
        //     type: 'channel',
        //     name: 'Crazy Llama Channel',
        //     url: 'https://t.me/CrazyLlamaFarmRU'
        // },
    ],

    /**
     * Проверяет подписку всех пользователей на все необходимые каналы.
     */
    async checkAllUsersSubscription(bot) {
        if (!process.env.SECRET_USER_KEY) return console.error('No SECRET_USER_KEY in .env file');

        // console.log("5558_api==>", api);

        // return;
        const response = await api.get(
            `${urlBack}/users/allIds/${process.env.SECRET_USER_KEY}`
        );

        if (response?.status === 500) {
            throw new Error('error');
        }

        const allIds = response?.data;

        for (const user of allIds) {

            const { subscribed_chat, subscribed_channel } =
                await this.checkUserSubscription(bot, user.id);

            if (!subscribed_chat) {
                console.log(
                    `[Bot Subscription] Пользователь ${user.id} не подписан на чат Crazy Llama Chat`
                );
            }

            if (!subscribed_channel) {
                console.log(
                    `[Bot Subscription] Пользователь ${user.id} не подписан на канал Crazy Llama Channel`
                );
            }
        }
    },

    /**
     * Проверяет подписку пользователя на все необходимые каналы.
     * @param {Object} ctx - Контекст сообщения.
     * @param {string} userId - ID пользователя в Telegram.
     * @returns {boolean} true, если пользователь подписан на все каналы.
     */
    async checkUserSubscription(ctx, userId, operation) {
        let subscribed_chat = false;
        let subscribed_channel = false;

        for (const channel of this.ourChannels) {
            try {
                const member = await ctx.api.getChatMember(channel.id, userId);

                const isSubscribed = [
                    'member',
                    'administrator',
                    'creator',
                    'restricted',
                ].includes(member.status);

                if (isSubscribed) {
                    if (channel.type === 'chat') subscribed_chat = true;
                    if (channel.type === 'channel') subscribed_channel = true;
                }
            } catch (error) {
                console.error(
                    `[Bot Subscription] Ошибка проверки подписки на ${channel.name}:`,
                    error.message
                );
            }
        }

        //Обновляем информацию о подписке пользователя
        if (operation !== 'create')
            await api.put(`${urlBack}/users/update/`, {
                tgId: userId,
                subscribed_chat,
                subscribed_channel,
            });

        return { subscribed_chat, subscribed_channel };
    },
};

module.exports = Subscription;
