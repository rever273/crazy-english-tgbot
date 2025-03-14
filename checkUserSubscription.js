const axios = require('axios');
const urlBack = process.env.URL_BACK;

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
        const allUsers = await axios.get(`${urlBack}/users`);
        //временно
        const users = allUsers.map((user) => {
            return { id: user.tgId };
        });
        // [
        //     { id: 5401716621 },
        // ];

        for (const user of users) {
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

            //Убедится, что данные по подписке обновляются в базе, сейчас этого нет.
            const updateData = {
                tgId: user.id,
                subscribed_chat,
                subscribed_channel,
            };

            await axios.put(`${process.env.URL_BACK}/update/`, updateData);
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

        const updateData = {
            tgId: userId, //123
            subscribed_chat,
            subscribed_channel,
        };

        if (operation !== 'create')
            await axios.put(`${process.env.URL_BACK}/update/`, updateData);

        return { subscribed_chat, subscribed_channel };
    },
};

module.exports = Subscription;
