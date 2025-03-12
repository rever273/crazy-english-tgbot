// // Функция для обработки имени
// export default function trimDisplayName(item) {
//     const removeEmojisAndSymbols = (str) =>
//         str
//             .replace(
//                 /[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]|[^a-zA-Zа-яА-ЯёЁ0-9\s.]/gu,
//                 ''
//             )
//             .trim();

//     // Удаляем эмодзи и лишние символы из имени и фамилии
//     let firstName = removeEmojisAndSymbols(item.firstName || '');
//     let lastName = removeEmojisAndSymbols(item.lastName || '');

//     // Объединяем имя и фамилию
//     let displayName = (firstName + ' ' + lastName).trim();

//     // Если имя слишком короткое (меньше 3 символов), используем username
//     if (displayName.length < 3) {
//         if (item.username) {
//             return `${item.username}`;
//         }
//     }

//     // Ограничиваем длину до 30 символов
//     const maxLength = 30;
//     if (displayName.length > maxLength) {
//         displayName = displayName.slice(0, maxLength).trim();

//         // Обрезаем по последнему пробелу, чтобы не разрывать слова
//         const lastSpaceIndex = displayName.lastIndexOf(' ');
//         if (lastSpaceIndex > 0) {
//             displayName = displayName.slice(0, lastSpaceIndex).trim();
//         }
//     }

//     return displayName;
// }
