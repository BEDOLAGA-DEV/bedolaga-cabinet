import TwemojiModule from 'react-twemoji';

// react-twemoji собран Babel в CommonJS: `exports.default = Twemoji` + `__esModule`.
// Vite 8 (Rolldown) в пакете с "type": "module" отдаёт на default-импорт весь
// module.exports, как Node, — то есть `{ default: Twemoji }`, и React падает с #130
// на первом же рендере. Старые сборщики отдавали сам класс. Разворачиваем оба случая,
// поэтому импортировать Twemoji нужно отсюда, а не из 'react-twemoji'.
const Twemoji =
  (TwemojiModule as unknown as { default?: typeof TwemojiModule }).default ?? TwemojiModule;

export default Twemoji;
