import type { Locale } from './i18n';

export type PhoneTab = 'life' | 'me' | 'family' | 'world';
type Copy = Record<PhoneTab, string> & { nav: string };

/** Labels for the phone game screen's bottom tabs. */
const COPY: Record<Locale, Copy> = {
  en: { nav: 'Life sections', life: 'Life', me: 'Me', family: 'Family', world: 'World' },
  'zh-hans': { nav: '人生分区', life: '人生', me: '我', family: '家人', world: '世界' },
  zh: { nav: '人生分區', life: '人生', me: '我', family: '家人', world: '世界' },
  ko: { nav: '보기 전환', life: '인생', me: '나', family: '가족', world: '세계' },
  ja: { nav: '表示の切り替え', life: '人生', me: 'わたし', family: '家族', world: '世界' },
  vi: { nav: 'Các phần', life: 'Cuộc đời', me: 'Tôi', family: 'Gia đình', world: 'Thế giới' },
  fr: { nav: 'Sections', life: 'Vie', me: 'Moi', family: 'Famille', world: 'Monde' },
  th: { nav: 'ส่วนต่างๆ', life: 'ชีวิต', me: 'ฉัน', family: 'ครอบครัว', world: 'โลก' },
  es: { nav: 'Secciones', life: 'Vida', me: 'Yo', family: 'Familia', world: 'Mundo' },
  de: { nav: 'Bereiche', life: 'Leben', me: 'Ich', family: 'Familie', world: 'Welt' },
  tr: { nav: 'Bölümler', life: 'Hayat', me: 'Ben', family: 'Aile', world: 'Dünya' },
  ru: { nav: 'Разделы', life: 'Жизнь', me: 'Я', family: 'Семья', world: 'Мир' },
  pt: { nav: 'Seções', life: 'Vida', me: 'Eu', family: 'Família', world: 'Mundo' },
  id: { nav: 'Bagian', life: 'Hidup', me: 'Saya', family: 'Keluarga', world: 'Dunia' },
};
export const phoneTabsCopy = (locale: Locale): Copy => COPY[locale] ?? COPY.en;
