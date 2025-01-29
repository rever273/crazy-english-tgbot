require("dotenv").config({ path: ".env.development" });

const { session, Bot, InlineKeyboard, InputFile } = require("grammy");
const path = require("path");
const { I18n } = require("@grammyjs/i18n");
const axios = require("axios");
const config = require("./config");

process.env.NODE_NO_WARNINGS = "1";
const BOT_TOKEN = process.env.BOT_TOKEN;
const urlBack = process.env.URL_BACK;

const bot = new Bot(BOT_TOKEN); // Укажите токен бота

// const fs = require('fs');

const { Crypto } = require("./functions");
const User = require("./user");
// const { start } = require('repl');

// Инициализация i18n
const i18n = new I18n({
  defaultLocale: "en", // Язык по умолчанию
  // fallbackLocale: 'en',
  directory: path.join(__dirname, "./src/locales"), // Путь к папке с переводами
  resolveUserLanguage: (ctx) => ctx.from?.language_code || "en",
  useSession: false,
  globalTranslationContext(ctx) {
    return { name: ctx.from?.first_name ?? "" };
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
//     await next();
// });

bot.catch((err) => {
  console.error("Error in middleware:", err);
});

const registration = async (ctx) => {
  const data = {
    tgId: ctx.from.username,
    userName: ctx.from.username,
    firstName: ctx.from.first_name,
    languageCode: ctx?.from?.language_code ? ctx.from.language_code : "en",
    isPremium: ctx?.from?.is_premium ? ctx.from.is_premium : false,
  };
  console.log(ctx.from);
  const userByTgId = await axios.get(`${urlBack}/${data.tgId}`);
  if (!userByTgId?.data?.tgId) {
    await axios.post(urlBack, data);
  }
  return;
};

// Приветственное сообщение
bot.command("start", async (ctx) => {
  const text = ctx.message.text;
  const user = new User(ctx.from);

  registration(ctx);

  //проверяем, реферальный ли это код
  await checkReferralCode(ctx, text);

  // Получаем и назначаем язык пользователя
  const userLanguage = ctx.from.language_code || "en";
  ctx.i18n.useLocale(userLanguage);

  const encryptedId = Crypto.encryptUserId(user.user_id); // Шифруем ID пользователя
  const referralCode = `invite_${encryptedId}`;
  const referralLink = `${config.botUrl}?start=${referralCode}`;

  // console.log(
  //   "user.user_id1",
  //   ctx.from.id,
  //   user.user_id,
  //   encryptedId,
  //   referralLink
  // );

  const imagePath = path.join(__dirname, "./src/images/banner.jpg");

  // Перевод сообщений
  // const inviteLink = ctx.t('invite_link', { link: referralLink });

  //Для простого варианта поделиться ссылкой через .url
  // const shareMessage = ctx.t("share_message");
  // const shareText = encodeURIComponent(`\n${shareMessage}`); // Кодируем текст для URL
  // const shareUrl = `https://t.me/share/url?url=${referralLink}&text=${shareText}`;

  const msg_text = `${ctx.t("welcome.hi")}\n
${ctx.t("welcome.invite")}\n
${ctx.t("invite_link", { link: referralLink })}`;

  console.time("replyWithPhoto"); // Начало измерения времени

  const sentMessage = await ctx.replyWithPhoto(new InputFile(imagePath), {
    caption: msg_text,
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard()
      .webApp(ctx.t("btn.open"), "https://forward2.hive-dev.ru/welcome")
      .row()
      // .url("Поделиться", shareUrl)
      .url(ctx.t("btn.support"), config.supportBot)
      .switchInline(ctx.t("btn.share"), referralCode),
  });

  console.timeEnd("replyWithPhoto");

  //Закрепляем сообщение
  const chat = await ctx.api.getChat(ctx.chat.id);
  if (!chat.pinned_message) {
    await ctx.api.pinChatMessage(ctx.chat.id, sentMessage.message_id);
  }
});

bot.command("help", async (ctx) => {
  const imagePath = path.join(__dirname, "./src/images/support_llama.jpg");

  await ctx.replyWithPhoto(new InputFile(imagePath), {
    caption: ctx.t("support.title"),
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard()
      .url(ctx.t("btn.support"), config.supportBot)
      .row()
      .webApp(ctx.t("btn.open"), "https://testo.crazyllama.app"),
  });
});

// Обработка инлайн-запроса
bot.inlineQuery(/^invite_(.+)$/, async (ctx) => {
  const encryptedId = ctx.match[1]; // Получаем зашифрованный ID из инлайн-запроса
  const userLanguage = ctx.from.language_code || "en"; // Получаем язык пользователя
  ctx.i18n.useLocale(userLanguage);

  const user = new User(ctx.from);
  const thumbUrl = `${config.website}/media/lama_assets/inline_llama.jpg`;

  // Создаем результат для инлайн-меню
  const results = [
    {
      type: "article",
      id: encryptedId, // Уникальный идентификатор результата
      title: ctx.t("inline.title"),
      description: ctx.t("inline.description"),
      // thumb_url: thumbUrl, // Квадратное изображение
      input_message_content: {
        message_text: ctx.t("inline.message", {
          username: user.link(),
        }),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      },
      reply_markup: new InlineKeyboard().url(
        ctx.t("btn.study"),
        `${config.botUrl}?start=${encryptedId}`
      ),
    },
  ];

  await ctx.answerInlineQuery(results);
});

// Проверяем, есть ли реферальный код
async function checkReferralCode(ctx, text) {
  if (text.includes(" ")) {
    const args = text.split(" "); // Разделяем текст команды
    if (args.length > 1) {
      let referralCode = args[1].startsWith("invite_")
        ? (referralCode = args[1].replace("invite_", ""))
        : args[1]; // Извлекаем зашифрованный ID

      const user_id = ctx.from.id;
      const referral_id = Crypto.decryptUserId(referralCode); // Расшифровываем ID

      if (user_id == referral_id || referral_id == "") {
        // пользователь совпадает
        return;
      }

      console.log(
        `Пользователь с ID ${ctx.from.id} был приглашен пользователем с ID ${referral_id}`
      );
      //TODO Добавить логику добавления реферала в базу данных
    }
  }
}

// Запуск бота
bot.start();
