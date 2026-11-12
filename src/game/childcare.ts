import {physicalCountry} from './physical-residence';
import type { Life } from './types';

export function localPartnerPresent(life: Life): boolean {
  return !!life.family.partner?.alive && life.family.partner.country === physicalCountry(life);
}

export function hasLocalYoungChild(life: Life): boolean {
  return life.family.children.some(child => child.alive && child.age < 5 && child.country === physicalCountry(life) && life.descendants.children.some(state => state.childId === child.id && state.residence === 'home'));
}

/** Care is offered for a local infant; overseas relatives cannot provide it. */
export function childcareChoices(life: Life): string[] {
  return ['selfCare',
    ...(localPartnerPresent(life) ? ['partnerCare'] : []),
    ...(life.family.parents.some(parent => parent.alive && parent.country === physicalCountry(life)) ? ['grandparents'] : []),
    'daycare'];
}
