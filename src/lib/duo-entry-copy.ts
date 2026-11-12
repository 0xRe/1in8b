import type { Locale } from './i18n';

export type DuoEntryCopy = {
  label: string;
  soloLabel: string;

  endingTitle: string;
  endingBody: string;
  endingCta: string;
  footerLabel: string;
};

const copy: Record<Locale, DuoEntryCopy> = {
  en: {
    label: 'Invite a friend. Share a lifetime.',
    soloLabel: 'Live a life on your own',

    endingTitle: 'What if you lived a lifetime alongside a friend?',
    endingBody: 'Play Together: Start two parallel lives from birth to endings, share milestones, letters, and choices in a private room.',
    endingCta: 'Play Together',
    footerLabel: 'Play together',
  },
  ko: {
    label: '친구와 함께 인생 살아보기',
    soloLabel: '혼자 인생 살아보기',

    endingTitle: '다음 생은 친구와 함께 걸어가 볼까요?',
    endingBody: '함께 살아보기: 친구를 초대해 태어남부터 마지막까지 두 개의 삶을 함께 살아보세요. 편지와 선택, 추억을 공유합니다.',
    endingCta: '함께 살아보기 시작',
    footerLabel: '함께 살아보기',
  },
  ja: {
    label: '友達を招待して、一緒に人生を歩む',
    soloLabel: 'ひとりで人生を歩む',

    endingTitle: '次の人生、大切な人と一緒に歩んでみませんか？',
    endingBody: '二人でプレイ：友達を招待し、誕生から晩年まで二つの人生を並走。手紙やマイルストーンを共有し、思い出を刻みます。',
    endingCta: '二人でプレイを始める',
    footerLabel: '二人でプレイ',
  },
  zh: {
    label: '邀請朋友，一起經歷人生',
    soloLabel: '獨自經歷一生',

    endingTitle: '如果下一世，和朋友一起經歷？',
    endingBody: '雙人同遊：邀請好友，在平行的時空中從出生到終老，分享童年信件、共同決策並留下專屬回憶。',
    endingCta: '開啟雙人模式',
    footerLabel: '雙人同遊',
  },
  'zh-hans': {
    label: '邀请朋友，一起经历人生',
    soloLabel: '独自经历一生',

    endingTitle: '如果下一生，和朋友一起经历？',
    endingBody: '双人同游：邀请好友，在平行时空中从出生到终老，分享童年信件、共同决策并留下专属回忆。',
    endingCta: '开启双人模式',
    footerLabel: '双人同游',
  },
  vi: {
    label: 'Mời bạn cùng trải nghiệm cuộc đời',
    soloLabel: 'Tự mình trải qua một cuộc đời',

    endingTitle: 'Nếu kiếp sau có một người bạn đồng hành?',
    endingBody: 'Chơi cùng nhau: Mời một người bạn, cùng trải qua hai cuộc đời song hành từ khi sinh ra đến tuổi già trong phòng riêng.',
    endingCta: 'Bắt đầu chơi cùng nhau',
    footerLabel: 'Chơi cùng nhau',
  },
  fr: {
    label: 'Inviter un ami à vivre cette aventure',
    soloLabel: 'Vivre une vie en solo',

    endingTitle: 'Et si votre prochaine vie se vivait à deux ?',
    endingBody: 'Jouer ensemble : Invitez un ami pour vivre deux vies parallèles de la naissance à la fin, partager lettres et souvenirs.',
    endingCta: 'Commencer à deux',
    footerLabel: 'Jouer ensemble',
  },
  th: {
    label: 'ชวนเพื่อนมาใช้ชีวิตไปด้วยกัน',
    soloLabel: 'ใช้ชีวิตหนึ่งคนเดียว',

    endingTitle: 'ถ้าชาติหน้าได้ใช้ชีวิตเคียงข้างเพื่อนล่ะ?',
    endingBody: 'เล่นด้วยกัน: ชวนเพื่อนหนึ่งคนมาเริ่มต้นสองชีวิตคู่ขนานตั้งแต่เกิดจนสิ้นอายุขัย แบ่งปันจดหมายและช่วงเวลาพิเศษ',
    endingCta: 'เริ่มเล่นด้วยกัน',
    footerLabel: 'เล่นด้วยกัน',
  },
  es: {
    label: 'Invita a un amigo a vivir esta aventura',
    soloLabel: 'Vivir una vida en solitario',

    endingTitle: '¿Y si vivieras una vida junto a un amigo?',
    endingBody: 'Jugar juntos: Invita a un amigo a vivir dos vidas paralelas desde el nacimiento hasta el final, compartiendo recuerdos y elecciones.',
    endingCta: 'Jugar juntos',
    footerLabel: 'Jugar juntos',
  },
  de: {
    label: 'Lade einen Freund auf die Lebensreise ein',
    soloLabel: 'Ein Leben allein erleben',

    endingTitle: 'Was, wenn du dein nächstes Leben zu zweit lebst?',
    endingBody: 'Gemeinsam spielen: Lade einen Freund ein, um zwei parallele Leben von der Geburt bis zum Lebensende zu teilen.',
    endingCta: 'Gemeinsam spielen',
    footerLabel: 'Gemeinsam spielen',
  },
  tr: {
    label: 'Bir arkadaşınla hayatı keşfet',
    soloLabel: 'Bir hayatı tek başına yaşa',

    endingTitle: 'Ya bir sonraki hayatını bir dostunla birlikte yaşasaydın?',
    endingBody: 'Birlikte Oyna: Bir arkadaşını davet et; doğumdan sona kadar iki paralel hayatı paylaşın, mektuplar ve anılar biriktirin.',
    endingCta: 'Birlikte Oyna',
    footerLabel: 'Birlikte Oyna',
  },
  ru: {
    label: 'Пригласить друга в путешествие по жизни',
    soloLabel: 'Прожить жизнь самому',

    endingTitle: 'А что, если прожить следующую жизнь вместе с другом?',
    endingBody: 'Играть вместе: Пригласите друга прожить две параллельные жизни от рождения до финала, делясь письмами и воспоминаниями.',
    endingCta: 'Начать вдвоём',
    footerLabel: 'Играть вместе',
  },
  pt: {
    label: 'Convida um amigo para esta aventura',
    soloLabel: 'Viver uma vida a solo',

    endingTitle: 'E se vivesse uma vida inteira ao lado de um amigo?',
    endingBody: 'Jogar em conjunto: Convide um amigo para viver duas vidas paralelas desde o nascimento até ao fim, partilhando escolhas e memórias.',
    endingCta: 'Jogar em conjunto',
    footerLabel: 'Jogar em conjunto',
  },
  id: {
    label: 'Ajak teman menjalani kehidupan bersama',
    soloLabel: 'Jalani kehidupan sendiri',

    endingTitle: 'Bagaimana jika hidup berikutnya dijalani bersama teman?',
    endingBody: 'Bermain bersama: Ajak seorang teman menjalani dua kehidupan paralel dari lahir hingga akhir, berbagi surat dan kenangan.',
    endingCta: 'Mulai bermain bersama',
    footerLabel: 'Bermain bersama',
  },
};

export function getDuoEntryCopy(locale: Locale): DuoEntryCopy {
  return copy[locale] ?? copy.en;
}
