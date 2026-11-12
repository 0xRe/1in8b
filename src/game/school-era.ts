import {privateSchoolShare} from './primary-school-access';
/** Source simulation cutoffs; these are not live education-policy claims. */
const reopening:Record<string,number>={
 RUS:1991,UKR:1991,BLR:1991,KAZ:1991,KGZ:1991,TJK:1991,TKM:1991,UZB:1991,AZE:1991,GEO:1991,ARM:1991,MDA:1991,
 LTU:1990,LVA:1990,EST:1990,POL:1989,CZE:1990,SVK:1990,HUN:1990,ROU:1990,BGR:1990,ALB:1991,
 SRB:1990,HRV:1990,SVN:1990,BIH:1990,MKD:1990,MNE:1990,MNG:1990,CHN:1993,VNM:1989,LAO:1990,KHM:1989,CUB:9999,PRK:9999,
};
export interface GermanSchoolHistory {
 eastGermanOrigin:boolean;leftEastGermany:boolean;currentCountry:string;
}
/** Country may be the birth country; the divided-Germany branch additionally checks current residence. */
export function publicOnlySchoolEra(country:string,year:number,germanHistory?:GermanSchoolHistory):boolean {
 if(country==='DEU')return !!germanHistory?.eastGermanOrigin&&!germanHistory.leftEastGermany&&germanHistory.currentCountry==='DEU'&&year<1990;
 if(country==='KHM')return year>=1979&&year<1989;
 return reopening[country]!==undefined&&year<reopening[country];
}
export function historicalPrivateSchoolShare(country:string,region:string,year:number,germanHistory?:GermanSchoolHistory):number {
 return privateSchoolShare(country,region,publicOnlySchoolEra(country,year,germanHistory));
}
