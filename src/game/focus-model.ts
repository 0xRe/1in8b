/** New focus IDs are separate from legacy histories, where career meant work intensity. */
export type StageFocus = 'study' | 'play' | 'help' | 'sport' | 'hobby' | 'work' | 'balance' | 'family' | 'health' | 'learn' | 'faith' | 'rest' | 'mind' | 'parttime' | 'careerPrep';
export const STAGE_FOCUSES: readonly StageFocus[] = ['study', 'play', 'help', 'sport', 'hobby', 'work', 'balance', 'family', 'health', 'learn', 'faith', 'rest', 'mind', 'parttime', 'careerPrep'];

export interface FocusContext {
  age: number;
  service: boolean;
  school: 'basic' | 'university' | 'graduate' | 'phd' | null;
  betweenSchool: boolean;
  retaking: boolean;
  retired: boolean;
  working: boolean;
  /** Original elder eligibility uses job sector, distinct from adult isWorking. */
  elderWorking: boolean;
  faithHidden: boolean;
}

export function stageFocusOptions(context: FocusContext): StageFocus[] {
  if (context.age < 6) return [];
  if (context.service) return ['balance', 'sport', 'family'];
  if (context.school || context.betweenSchool || context.retaking) {
    if (context.school === 'university' || context.school === 'graduate' || context.school === 'phd')
      return ['study', 'play', 'parttime', 'careerPrep', 'sport', 'hobby'];
    return context.retaking ? ['study', 'play', 'parttime', 'sport', 'hobby'] : ['study', 'play', 'help', 'sport', 'hobby'];
  }
  if (context.age < 15) return ['help', 'play', 'sport', 'hobby'];
  if (context.age >= 65 || context.retired) {
    const options: StageFocus[] = context.elderWorking
      ? ['work', 'family', 'health', 'mind', 'hobby', 'faith']
      : ['family', 'health', 'mind', 'hobby', 'faith', 'rest'];
    return context.faithHidden ? options.filter(focus => focus !== 'faith') : options;
  }
  return context.working ? ['work', 'balance', 'family', 'health', 'learn', 'hobby'] : ['family', 'health', 'learn', 'hobby', 'rest'];
}

export interface FocusSelection {
  current: StageFocus | null;
  picked: StageFocus | null;
  returnTo: StageFocus | null;
  automaticFallback: StageFocus | null;
}
const related: Partial<Record<StageFocus, StageFocus[]>> = {
  study: ['learn', 'mind', 'careerPrep'], learn: ['study', 'mind', 'careerPrep'],
  mind: ['learn', 'study'], careerPrep: ['learn', 'study'],
  play: ['family'], family: ['play'], sport: ['health'], health: ['sport'],
  hobby: ['hobby'], faith: ['family'], rest: ['health'],
  work: ['parttime', 'balance'], parttime: ['work', 'balance'],
};

export function reconcileFocus(selection: FocusSelection, options: StageFocus[], educationTransition: boolean): FocusSelection {
  if (!options.length) return { ...selection, current: null };
  const { current, picked, returnTo, automaticFallback } = selection;
  if (returnTo && returnTo !== current && current === automaticFallback && options.includes(returnTo))
    return { current: returnTo, picked: returnTo, returnTo: null, automaticFallback: null };
  if (current && (options.includes(current) || current === picked && educationTransition)) return selection;
  const manual = current !== null && current === picked;
  const nearest = manual ? related[current]?.find(focus => options.includes(focus)) : undefined;
  const next = nearest ?? (current === 'learn' && options.includes('mind') ? 'mind' : options.includes('balance') ? 'balance' : options[0]);
  return manual
    ? { current: next, picked: nearest ?? null, returnTo: current, automaticFallback: next }
    : { ...selection, current: next };
}

export function chooseStageFocus(selection: FocusSelection, focus: StageFocus, options: StageFocus[]): FocusSelection {
  return options.includes(focus) ? { current: focus, picked: focus, returnTo: null, automaticFallback: null } : selection;
}
