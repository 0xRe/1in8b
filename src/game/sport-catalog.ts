/** Factual closed sport identities; no life-state dependencies. */
export const SPORT_NAMES={
 "football": "Football",
 "cricket": "Cricket",
 "baseball": "Baseball",
 "basketball": "Basketball",
 "running": "Running",
 "badminton": "Badminton",
 "tabletennis": "Table tennis",
 "volleyball": "Volleyball",
 "wrestling": "Wrestling",
 "icehockey": "Ice hockey",
 "rugby": "Rugby",
 "muaythai": "Muay Thai",
 "boxing": "Boxing",
 "ski": "Skiing",
 "cycling": "Cycling",
 "kabaddi": "Kabaddi",
 "chinlone": "Chinlone",
 "takraw": "Sepak takraw",
 "laamb": "Laamb",
 "kokboru": "Kok boru",
 "archery": "Archery",
 "aussie": "Australian rules football",
 "amfootball": "American football",
 "gaelic": "Gaelic football",
 "handball": "Handball",
 "waterpolo": "Water polo",
 "netball": "Netball",
 "polo": "Polo",
 "surf": "Surfing",
 "hockey": "Field hockey",
 "kunkhmer": "Kun Khmer"
} as const;
export type SportId=keyof typeof SPORT_NAMES;
export type NamedSportId=`sp_${SportId}`;
export const NAMED_SPORT_IDS=Object.keys(SPORT_NAMES).map(id=>`sp_${id}` as NamedSportId);
