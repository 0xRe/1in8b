import catalog from '../data/study-languages.json';
const englishPrograms=new Set(['DEU','NLD','SWE','DNK','FIN','NOR','CHE','BEL','AUT','FRA','ITA','ESP','POL','CZE','HUN','MYS','KOR','JPN','CHN']);
/** Reference simulation language access; unrelated to the name-generation country.lang field. */
export function studyLanguages(country:string,education:number):Set<string>{
 const result=new Set<string>();
 for(const [language,countries] of Object.entries(catalog.base))if(countries.includes(country))result.add(language);
 for(const row of catalog.education)if(education>=row.level&&row.countries.includes(country))result.add(row.language);
 return result;
}
export function studyLanguageMatches(birthCountry:string,destination:string,qualification:number,graduate:boolean,known:readonly string[]=[]):boolean{
 const origin=studyLanguages(birthCountry,qualification+1),target=studyLanguages(destination,9);
 if(graduate)origin.add('en');
 for(const language of [...origin,...known])if(target.has(language))return true;
 return graduate&&englishPrograms.has(destination);
}
