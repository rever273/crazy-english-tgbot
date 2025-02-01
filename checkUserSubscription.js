
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
            url: 'https://t.me/CrazyLlamaFarmRU_chat'
        },
        {
            id: -1001527645697,
            type: 'channel',
            name: 'Crazy Llama Channel',
            url: 'https://t.me/CrazyLlamaFarmRU'
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
     * Проверяет подписку пользователя на все необходимые каналы.
     * @param {Object} ctx - Контекст сообщения.
     * @param {string} userId - ID пользователя в Telegram.
     * @returns {boolean} true, если пользователь подписан на все каналы.
     */
    async checkUserSubscription(ctx, userId) {
        let subscribed_chat = false;
        let subscribed_channel = false;

        for (const channel of this.ourChannels) {
            try {
                const member = await ctx.api.getChatMember(channel.id, userId);
                const isSubscribed = ['member', 'administrator', 'creator', 'restricted'].includes(member.status);

                if (isSubscribed) {
                    if (channel.type === 'chat') subscribed_chat = true;
                    if (channel.type === 'channel') subscribed_channel = true;
                }
            } catch (error) {
                console.error(`[Bot Subscription] Ошибка проверки подписки на ${channel.name}:`, error.message);
            }
        }

        return { subscribed_chat, subscribed_channel };
    }
}

module.exports = Subscription;