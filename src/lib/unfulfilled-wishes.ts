import type { Life } from '../game/types';
import type { Locale, translator } from './i18n';
import { countryName } from '../game/countries';

export interface UnfulfilledWish {
  id: 'kid' | 'home' | 'school' | 'read' | 'peace';
  icon: string;
  title: string;
  regret: string;
  dream: string;
  quote: string;
}

export function generateUnfulfilledWishes(life: Life, locale: Locale, t: ReturnType<typeof translator>): UnfulfilledWish[] {
  const wishes: UnfulfilledWish[] = [];
  const cName = countryName(life.migration?.birthCountry || life.country, locale);

  // 1. Child's milestone (if has children)
  if (life.family.children && life.family.children.length > 0) {
    const child = life.family.children[0];
    wishes.push({
      id: 'kid',
      icon: '🎓',
      title: t('ui.wishKidTitle', { name: child.name }),
      regret: t('ui.wishKidRegret', { name: child.name }),
      dream: t('ui.wishKidDream', { name: child.name }),
      quote: t('ui.wishKidQuote', { name: child.name }),
    });
  }

  // 2. Returning Home (if migrated away and didn't move back)
  if (life.migration?.moves && life.migration.moves.length > 0) {
    wishes.push({
      id: 'home',
      icon: '🏡',
      title: t('ui.wishHomeTitle', { country: cName }),
      regret: t('ui.wishHomeRegret', { country: cName }),
      dream: t('ui.wishHomeDream', { country: cName }),
      quote: t('ui.wishHomeQuote', { country: cName }),
    });
  }

  // 3. First Day of School (if had child labor or low schooling)
  if (life.schooling.childLabor || life.schooling.years < 6) {
    wishes.push({
      id: 'school',
      icon: '🎒',
      title: t('ui.wishSchoolTitle'),
      regret: t('ui.wishSchoolRegret'),
      dream: t('ui.wishSchoolDream'),
      quote: t('ui.wishSchoolQuote'),
    });
  }

  // 4. Reading a Book in Solitude (if knowledge is low or dropped out)
  if (life.stats.knowledge < 40 || life.schooling.droppedOut) {
    wishes.push({
      id: 'read',
      icon: '📖',
      title: t('ui.wishReadTitle'),
      regret: t('ui.wishReadRegret'),
      dream: t('ui.wishReadDream'),
      quote: t('ui.wishReadQuote'),
    });
  }

  // 5. Universal peaceful evening porch dream
  wishes.push({
    id: 'peace',
    icon: '🍵',
    title: t('ui.wishPeaceTitle'),
    regret: t('ui.wishPeaceRegret'),
    dream: t('ui.wishPeaceDream'),
    quote: t('ui.wishPeaceQuote'),
  });

  return wishes;
}
