import type {Life} from './types';
import {educationEraInputs} from './education-era';
import {getCountryById} from './countries';
export interface StudyAccessFacts {ethnicity:'none'|'uyghur'|'rohingya';naturalized:boolean;eastGerman:boolean;recentlyFled:boolean;}
const closures:readonly [readonly string[],number,number][]=[
 [['RUS','UKR','BLR','KAZ','KGZ','TJK','TKM','UZB','AZE','GEO'],1950,1990],
 [['POL','CZE','SVK','HUN','ROU','BGR','MNG'],1950,1989],
 [['EST','LVA','LTU','ARM','MDA','ALB'],1950,1990],
 [['CHN'],1950,1978],[['VNM','LAO'],1975,1988],[['KHM'],1975,1991],[['CUB'],1961,1994],[['MMR'],1962,1988],
];
/** Missing facts stay unknown. Country/ancestry alone never supplies personal status. */
export function studyAccess(life:Life):{freeExit:boolean;papersValid:boolean;familyAbroad:boolean;recentlyFled:boolean;abroadCost:number}|null{
 const a=life.academics,f=a?.studyAccess,upper=a?.upperFacts,primary=a?.primaryFacts;
 if(!f||!upper||!primary||!Number.isFinite(life.year))return null;
 const country=life.country.id,year=life.year;
 const closed=life.era!=='today'&&(closures.some(([countries,start,end])=>countries.includes(country)&&year>=start&&year<=end)||country==='DEU'&&f.eastGerman&&year<1990);
 const uyghurRestricted=f.ethnicity==='uyghur'&&country==='CHN'&&life.migration.birthCountry.id==='CHN'&&year>=2016&&year<=2025;
 const freeExit=!!getCountryById(country)&&country!=='WLD'&&country!=='PRK'&&!closed&&!uyghurRestricted&&!(f.ethnicity==='rohingya'&&!f.naturalized);
 const ppp=educationEraInputs(life.country,life.era,year).statistics.ppp;
 return {freeExit,papersValid:!upper.unregisteredBirth,familyAbroad:primary.rich||life.stats.incomeQuintile>=5||life.stats.incomeQuintile>=4&&ppp<30000,recentlyFled:f.recentlyFled,abroadCost:30000/Math.max(.22,Math.min(1.25,.11*Math.sqrt(ppp/1000)))};
}
