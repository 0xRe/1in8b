import type { Locale, translator } from './i18n';
import type { Life } from '../game/types';
import { countryName, countryProbability } from '../game/countries';
import { lifeGrain } from './life-insights';
import { lifeTable } from '../game/engine';
import type { Country } from '../game/types';

/** Copy for shared-life links: the link preview, the friend's invitation and the sharer's post. */
type ViralCopy = {
  ogTitle: string; ogTitleNoName: string; ogDescription: string; ogBorn: string;
  inviteLife: string; inviteGrain: string; inviteTurn: string; inviteCta: string;
  postLife: string; postGrain: string; postChallenge: string; shareVideo: string;
  rare: string; replyTitle: string; replyCta: string; replyYou: string;
  bornName: string; bornOdds: string;
};
const en: ViralCopy = {
  ogTitle: '{name} lived to {age} in {country}', ogTitleNoName: 'A life of {age} years in {country}',
  ogDescription: 'One of 8 billion lives: born where chance put them, shaped by every choice. What life would you get? Free to play.',
  ogBorn: 'Just born in {country}. Where will you be born?',
  inviteLife: '{name} lived to {age} in {country}.', inviteGrain: 'The pattern of that life: “{grain}”.',
  inviteTurn: 'Your turn. Where will chance place you?', inviteCta: 'Begin my life',
  postLife: 'I lived to {age} as {name} in {country}.', postGrain: 'The pattern of my life: “{grain}”.', postChallenge: 'What life would you get?', shareVideo: 'Share video',
  rare: 'Only {pct}% of people born in {country} reach {age}.', replyTitle: 'You and {name}', replyCta: 'Send your life back', replyYou: 'You',
  bornName: '{name} was just born in {country}. Where will you be born?', bornOdds: 'About 1 in {n} babies in the world is born in {country}.',
};
const copy: Partial<Record<Locale, ViralCopy>> = {
  en,
  'zh-hans': {
    ogTitle: '{name}在{country}活到了{age}岁', ogTitleNoName: '在{country}度过的{age}年人生',
    ogDescription: '80亿人生之一：出生由命运决定，人生由每一个选择塑造。你会过上怎样的一生？免费游玩。',
    ogBorn: '刚刚出生在{country}。你会出生在哪里？',
    inviteLife: '{name}在{country}活到了{age}岁。', inviteGrain: '那段人生的印记：“{grain}”。',
    inviteTurn: '轮到你了。命运会把你放在哪里？', inviteCta: '开始我的人生',
    postLife: '我以{name}的身份在{country}活到了{age}岁。', postGrain: '我的人生印记：“{grain}”。', postChallenge: '你会过上怎样的一生？', shareVideo: '分享视频',
    rare: '在{country}出生的人中，只有{pct}%能活到{age}岁。', replyTitle: '你和{name}', replyCta: '把你的人生发回去', replyYou: '你',
    bornName: '{name}刚刚出生在{country}。你会出生在哪里？', bornOdds: '全世界大约每{n}个婴儿中，就有1个出生在{country}。',
  },
  zh: {
    ogTitle: '{name}在{country}活到了{age}歲', ogTitleNoName: '在{country}度過的{age}年人生',
    ogDescription: '80億人生之一：出生由命運決定，人生由每一個選擇塑造。你會過上怎樣的一生？免費遊玩。',
    ogBorn: '剛剛出生在{country}。你會出生在哪裡？',
    inviteLife: '{name}在{country}活到了{age}歲。', inviteGrain: '那段人生的印記：「{grain}」。',
    inviteTurn: '輪到你了。命運會把你放在哪裡？', inviteCta: '開始我的人生',
    postLife: '我以{name}的身分在{country}活到了{age}歲。', postGrain: '我的人生印記：「{grain}」。', postChallenge: '你會過上怎樣的一生？', shareVideo: '分享影片',
    rare: '在{country}出生的人中，只有{pct}%能活到{age}歲。', replyTitle: '你和{name}', replyCta: '把你的人生傳回去', replyYou: '你',
    bornName: '{name}剛剛出生在{country}。你會出生在哪裡？', bornOdds: '全世界大約每{n}個嬰兒中，就有1個出生在{country}。',
  },
  ja: {
    ogTitle: '{name}は{country}で{age}歳まで生きた', ogTitleNoName: '{country}での{age}年の人生',
    ogDescription: '80億の人生のひとつ。生まれる場所は偶然、人生は選択で形づくられる。あなたはどんな人生を送る？無料でプレイ。',
    ogBorn: '{country}に生まれました。あなたはどこに生まれる？',
    inviteLife: '{name}は{country}で{age}歳まで生きました。', inviteGrain: 'その人生のかたち：「{grain}」。',
    inviteTurn: '次はあなたの番。偶然はあなたをどこに置く？', inviteCta: '人生を始める',
    postLife: '{name}として{country}で{age}歳まで生きました。', postGrain: '私の人生のかたち：「{grain}」。', postChallenge: 'あなたはどんな人生を送る？', shareVideo: '動画を共有',
    rare: '{country}に生まれた人のうち、{age}歳まで生きるのは{pct}%だけ。', replyTitle: 'あなたと{name}', replyCta: 'あなたの人生を送り返す', replyYou: 'あなた',
    bornName: '{name}が{country}に生まれました。あなたはどこに生まれる？', bornOdds: '世界の赤ちゃんのおよそ{n}人に1人が{country}で生まれます。',
  },
  ko: {
    ogTitle: '{name}, {country}에서 {age}세까지 살다', ogTitleNoName: '{country}에서의 {age}년 인생',
    ogDescription: '80억 개의 삶 중 하나. 태어난 곳은 우연, 삶은 선택이 만든다. 당신은 어떤 삶을 살게 될까요? 무료 플레이.',
    ogBorn: '방금 {country}에서 태어났어요. 당신은 어디에서 태어날까요?',
    inviteLife: '{name}의 삶은 {country}에서 {age}세까지 이어졌습니다.', inviteGrain: '그 삶의 결: “{grain}”.',
    inviteTurn: '이제 당신 차례. 우연은 당신을 어디에 둘까요?', inviteCta: '내 삶 시작하기',
    postLife: '나는 {country}에서 {name}의 삶을 살며 {age}세까지 살았어요.', postGrain: '내 삶의 결: “{grain}”.', postChallenge: '당신은 어떤 삶을 살게 될까요?', shareVideo: '영상 공유',
    rare: '{country}에서 태어난 사람 중 {age}세까지 사는 사람은 {pct}%뿐입니다.', replyTitle: '당신과 {name}', replyCta: '내 삶을 답장으로 보내기', replyYou: '당신',
    bornName: '{name}이(가) 방금 {country}에서 태어났어요. 당신은 어디에서 태어날까요?', bornOdds: '세계의 아기 약 {n}명 중 1명이 {country}에서 태어납니다.',
  },
  vi: {
    ogTitle: '{name} sống đến {age} tuổi ở {country}', ogTitleNoName: 'Một đời {age} năm ở {country}',
    ogDescription: 'Một trong 8 tỷ cuộc đời: sinh ra nơi ngẫu nhiên đặt để, định hình bởi từng lựa chọn. Bạn sẽ có cuộc đời nào? Chơi miễn phí.',
    ogBorn: 'Vừa chào đời ở {country}. Bạn sẽ chào đời ở đâu?',
    inviteLife: '{name} đã sống đến {age} tuổi ở {country}.', inviteGrain: 'Dấu ấn của cuộc đời ấy: “{grain}”.',
    inviteTurn: 'Đến lượt bạn. Ngẫu nhiên sẽ đặt bạn ở đâu?', inviteCta: 'Bắt đầu cuộc đời tôi',
    postLife: 'Tôi đã sống đến {age} tuổi trong vai {name} ở {country}.', postGrain: 'Dấu ấn cuộc đời tôi: “{grain}”.', postChallenge: 'Bạn sẽ có cuộc đời nào?', shareVideo: 'Chia sẻ video',
    rare: 'Chỉ {pct}% người sinh ra ở {country} sống đến {age} tuổi.', replyTitle: 'Bạn và {name}', replyCta: 'Gửi lại cuộc đời của bạn', replyYou: 'Bạn',
    bornName: '{name} vừa chào đời ở {country}. Bạn sẽ chào đời ở đâu?', bornOdds: 'Khoảng 1 trong {n} em bé trên thế giới chào đời ở {country}.',
  },
  fr: {
    ogTitle: '{name} a vécu jusqu’à {age} ans ({country})', ogTitleNoName: 'Une vie de {age} ans ({country})',
    ogDescription: 'Une vie parmi 8 milliards : née là où le hasard l’a placée, façonnée par chaque choix. Quelle vie aurez-vous ? Gratuit.',
    ogBorn: 'Une naissance ({country}). Où allez-vous naître ?',
    inviteLife: '{name} a vécu jusqu’à {age} ans ({country}).', inviteGrain: 'L’empreinte de cette vie : « {grain} ».',
    inviteTurn: 'À vous. Où le hasard va-t-il vous placer ?', inviteCta: 'Commencer ma vie',
    postLife: 'J’ai vécu jusqu’à {age} ans dans la peau de {name} ({country}).', postGrain: 'L’empreinte de ma vie : « {grain} ».', postChallenge: 'Quelle vie auriez-vous ?', shareVideo: 'Partager la vidéo',
    rare: 'Seulement {pct} % des personnes nées dans ce pays ({country}) atteignent {age} ans.', replyTitle: 'Vous et {name}', replyCta: 'Renvoyer votre vie', replyYou: 'Vous',
    bornName: '{name} vient de naître ({country}). Où allez-vous naître ?', bornOdds: 'Environ 1 bébé sur {n} dans le monde naît dans ce pays ({country}).',
  },
  th: {
    ogTitle: '{name} มีชีวิตถึง {age} ปีใน{country}', ogTitleNoName: 'ชีวิต {age} ปีใน{country}',
    ogDescription: 'หนึ่งในชีวิต 8 พันล้าน เกิดที่ไหนขึ้นกับโชค ชีวิตถูกหล่อหลอมด้วยทุกการเลือก คุณจะได้ชีวิตแบบไหน? เล่นฟรี',
    ogBorn: 'เพิ่งเกิดที่{country} คุณจะเกิดที่ไหน?',
    inviteLife: '{name} มีชีวิตถึง {age} ปีใน{country}', inviteGrain: 'ร่องรอยของชีวิตนั้น: “{grain}”',
    inviteTurn: 'ถึงตาคุณแล้ว โชคจะพาคุณไปเกิดที่ไหน?', inviteCta: 'เริ่มชีวิตของฉัน',
    postLife: 'ฉันมีชีวิตถึง {age} ปีในฐานะ {name} ที่{country}', postGrain: 'ร่องรอยของชีวิตฉัน: “{grain}”', postChallenge: 'คุณจะได้ชีวิตแบบไหน?', shareVideo: 'แชร์วิดีโอ',
    rare: 'คนที่เกิดใน{country} มีเพียง {pct}% ที่อายุถึง {age} ปี', replyTitle: 'คุณกับ {name}', replyCta: 'ส่งชีวิตของคุณกลับไป', replyYou: 'คุณ',
    bornName: '{name} เพิ่งเกิดที่{country} คุณจะเกิดที่ไหน?', bornOdds: 'ทารกทั่วโลกประมาณ 1 ใน {n} คนเกิดที่{country}',
  },
  es: {
    ogTitle: '{name} vivió hasta los {age} años en {country}', ogTitleNoName: 'Una vida de {age} años en {country}',
    ogDescription: 'Una de 8.000 millones de vidas: nacida donde la puso el azar, moldeada por cada decisión. ¿Qué vida te tocaría? Gratis.',
    ogBorn: 'Acaba de nacer en {country}. ¿Dónde nacerás tú?',
    inviteLife: '{name} vivió hasta los {age} años en {country}.', inviteGrain: 'La huella de esa vida: «{grain}».',
    inviteTurn: 'Te toca. ¿Dónde te pondrá el azar?', inviteCta: 'Empezar mi vida',
    postLife: 'Viví hasta los {age} años como {name} en {country}.', postGrain: 'La huella de mi vida: «{grain}».', postChallenge: '¿Qué vida te tocaría a ti?', shareVideo: 'Compartir vídeo',
    rare: 'Solo el {pct} % de quienes nacen en {country} llega a los {age} años.', replyTitle: 'Tú y {name}', replyCta: 'Devolver tu vida', replyYou: 'Tú',
    bornName: '{name} acaba de nacer en {country}. ¿Dónde nacerás tú?', bornOdds: 'Alrededor de 1 de cada {n} bebés del mundo nace en {country}.',
  },
  de: {
    ogTitle: '{name} wurde {age} Jahre alt ({country})', ogTitleNoName: 'Ein Leben von {age} Jahren ({country})',
    ogDescription: 'Eines von 8 Milliarden Leben: geboren, wo der Zufall es hinstellte, geformt von jeder Entscheidung. Welches Leben bekommst du? Kostenlos.',
    ogBorn: 'Gerade geboren ({country}). Wo wirst du geboren?',
    inviteLife: '{name} wurde {age} Jahre alt ({country}).', inviteGrain: 'Das Muster dieses Lebens: „{grain}“.',
    inviteTurn: 'Jetzt du. Wohin stellt dich der Zufall?', inviteCta: 'Mein Leben beginnen',
    postLife: 'Als {name} wurde ich {age} Jahre alt ({country}).', postGrain: 'Das Muster meines Lebens: „{grain}“.', postChallenge: 'Welches Leben bekommst du?', shareVideo: 'Video teilen',
    rare: 'Nur {pct} % der Menschen, die hier geboren werden ({country}), werden {age}.', replyTitle: 'Du und {name}', replyCta: 'Dein Leben zurückschicken', replyYou: 'Du',
    bornName: '{name} wurde gerade geboren ({country}). Wo wirst du geboren?', bornOdds: 'Etwa jedes {n}. Baby der Welt wird hier geboren ({country}).',
  },
  tr: {
    ogTitle: '{name}, {country} ülkesinde {age} yaşına kadar yaşadı', ogTitleNoName: '{country} ülkesinde {age} yıllık bir hayat',
    ogDescription: '8 milyar hayattan biri: şansın koyduğu yerde doğdu, her seçimle şekillendi. Sen nasıl bir hayat yaşardın? Ücretsiz.',
    ogBorn: '{country} ülkesinde yeni doğdu. Sen nerede doğacaksın?',
    inviteLife: '{name}, {country} ülkesinde {age} yaşına kadar yaşadı.', inviteGrain: 'O hayatın izi: “{grain}”.',
    inviteTurn: 'Sıra sende. Şans seni nereye koyacak?', inviteCta: 'Hayatıma başla',
    postLife: '{name} olarak {country} ülkesinde {age} yaşına kadar yaşadım.', postGrain: 'Hayatımın izi: “{grain}”.', postChallenge: 'Sen nasıl bir hayat yaşardın?', shareVideo: 'Videoyu paylaş',
    rare: '{country} ülkesinde doğanların yalnızca %{pct}\'i {age} yaşına ulaşıyor.', replyTitle: 'Sen ve {name}', replyCta: 'Hayatını geri gönder', replyYou: 'Sen',
    bornName: '{name}, {country} ülkesinde yeni doğdu. Sen nerede doğacaksın?', bornOdds: 'Dünyadaki bebeklerin yaklaşık {n}\'de 1\'i {country} ülkesinde doğuyor.',
  },
  ru: {
    ogTitle: '{name}: возраст — {age}, {country}', ogTitleNoName: 'Возраст — {age}, {country}',
    ogDescription: 'Одна из 8 миллиардов жизней: родиться там, где выпал случай, и прожить её через выборы. Какая жизнь достанется вам? Бесплатно.',
    ogBorn: 'Только что родился(ась): {country}. Где родитесь вы?',
    inviteLife: 'Жизнь {name}: возраст — {age}. Страна: {country}.', inviteGrain: 'Узор этой жизни: «{grain}».',
    inviteTurn: 'Ваша очередь. Куда вас поместит случай?', inviteCta: 'Начать мою жизнь',
    postLife: 'Моя жизнь в игре: {name}, возраст — {age}. Страна: {country}.', postGrain: 'Узор моей жизни: «{grain}».', postChallenge: 'Какая жизнь досталась бы вам?', shareVideo: 'Поделиться видео',
    rare: 'Лишь {pct}% родившихся в этой стране ({country}) доживают до {age}-летнего возраста.', replyTitle: 'Вы и {name}', replyCta: 'Отправить свою жизнь в ответ', replyYou: 'Вы',
    bornName: '{name} только что родился(ась). Страна: {country}. Где родитесь вы?', bornOdds: 'Примерно 1 из {n} младенцев в мире рождается здесь ({country}).',
  },
  pt: {
    ogTitle: '{name} viveu até os {age} anos ({country})', ogTitleNoName: 'Uma vida de {age} anos ({country})',
    ogDescription: 'Uma entre 8 bilhões de vidas: nascida onde o acaso a colocou, moldada por cada escolha. Que vida você teria? Grátis.',
    ogBorn: 'Acabou de nascer ({country}). Onde você vai nascer?',
    inviteLife: '{name} viveu até os {age} anos ({country}).', inviteGrain: 'A marca dessa vida: “{grain}”.',
    inviteTurn: 'Sua vez. Onde o acaso vai colocar você?', inviteCta: 'Começar minha vida',
    postLife: 'Vivi até os {age} anos como {name} ({country}).', postGrain: 'A marca da minha vida: “{grain}”.', postChallenge: 'Que vida você teria?', shareVideo: 'Compartilhar vídeo',
    rare: 'Só {pct}% das pessoas nascidas nesse país ({country}) chegam aos {age} anos.', replyTitle: 'Você e {name}', replyCta: 'Enviar sua vida de volta', replyYou: 'Você',
    bornName: '{name} acabou de nascer ({country}). Onde você vai nascer?', bornOdds: 'Cerca de 1 em cada {n} bebês do mundo nasce nesse país ({country}).',
  },
  id: {
    ogTitle: '{name} hidup hingga {age} tahun di {country}', ogTitleNoName: 'Hidup {age} tahun di {country}',
    ogDescription: 'Satu dari 8 miliar kehidupan: lahir di tempat yang ditentukan kebetulan, dibentuk oleh setiap pilihan. Hidup seperti apa yang akan kamu dapat? Gratis.',
    ogBorn: 'Baru lahir di {country}. Di mana kamu akan lahir?',
    inviteLife: '{name} hidup hingga {age} tahun di {country}.', inviteGrain: 'Jejak kehidupan itu: “{grain}”.',
    inviteTurn: 'Giliranmu. Di mana kebetulan akan menempatkanmu?', inviteCta: 'Mulai hidupku',
    postLife: 'Aku hidup hingga {age} tahun sebagai {name} di {country}.', postGrain: 'Jejak hidupku: “{grain}”.', postChallenge: 'Hidup seperti apa yang akan kamu dapat?', shareVideo: 'Bagikan video',
    rare: 'Hanya {pct}% orang yang lahir di {country} mencapai usia {age} tahun.', replyTitle: 'Kamu dan {name}', replyCta: 'Kirim balik hidupmu', replyYou: 'Kamu',
    bornName: '{name} baru lahir di {country}. Di mana kamu akan lahir?', bornOdds: 'Sekitar 1 dari {n} bayi di dunia lahir di {country}.',
  },
};
export const viralCopy = (locale: Locale): ViralCopy => copy[locale] ?? en;
export const fillViral = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

/** The sharer's post: first person, the life in one line, then the question that invites a reply. */
export function lifePost(life: Life, locale: Locale, t: ReturnType<typeof translator>, comment = ''): string {
  const copy = viralCopy(locale), grain = lifeGrain(life), country = countryName(life.migration?.birthCountry ?? life.country, locale);
  return [comment.trim().slice(0, 300), fillViral(copy.postLife, { age: life.age, name: life.name, country }),
    grain.insufficient || grain.mixed ? '' : fillViral(copy.postGrain, { grain: t(grain.nameKey) }), rareAge(life.migration?.birthCountry ?? life.country, life.sex, life.age, locale), copy.postChallenge].filter(Boolean).join('\n');
}

/** A line worth bragging about: only when most people born in that country never reach this age. */
export function rareAge(country: Country, sex: 'M' | 'F', age: number, locale: Locale): string {
  const survival = lifeTable(country, sex).survival, reached = survival[Math.min(age, survival.length - 1)] ?? 1;
  if (age < 40 || reached > 0.5) return '';
  const pct = reached < 0.01 ? '<1' : String(Math.max(1, Math.round(reached * 100)));
  return fillViral(viralCopy(locale).rare, { pct, country: countryName(country, locale), age });
}

/** World odds of a birth in this country (share of births), as "1 in N". */
export function birthOdds(country: Country, locale: Locale): string {
  const p = countryProbability(country, 'births');
  return p > 0 ? fillViral(viralCopy(locale).bornOdds, { n: Math.max(1, Math.round(1 / p)).toLocaleString(locale === 'zh-hans' ? 'zh-CN' : locale), country: countryName(country, locale) }) : '';
}
