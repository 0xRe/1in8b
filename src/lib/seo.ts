import { LOCALES, translator, type Locale } from './i18n';
import { localeUrl } from './site-url';
import { SITE, OG_IMAGE } from './site-identity';
export { SITE, OG_IMAGE } from './site-identity';
export const ogLocales: Record<Locale,string> = {en:'en_US',ko:'ko_KR',ja:'ja_JP',zh:'zh_TW','zh-hans':'zh_CN',vi:'vi_VN',fr:'fr_FR',th:'th_TH',es:'es_ES',de:'de_DE',tr:'tr_TR',ru:'ru_RU',pt:'pt_BR',id:'id_ID'};
export function seoHead(locale:Locale) {
 const t=translator(locale), title=t('seo.title'), description=t('seo.description');
 return {
  meta:[{title},{name:'description',content:description},{name:'application-name',content:'1in8bn'},
   {name:'robots',content:'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'},
   ...Object.entries({title,description,url:localeUrl(locale),type:'website',site_name:'1in8bn',locale:ogLocales[locale],image:OG_IMAGE,'image:secure_url':OG_IMAGE,'image:type':'image/png','image:width':'1200','image:height':'630','image:alt':'1in8bn — free browser life simulator, 172 countries'}).map(([key,content])=>({property:`og:${key}`,content})),
   ...Object.entries({card:'summary_large_image',title,description,image:OG_IMAGE,'image:alt':'1in8bn — free browser life simulator, 172 countries'}).map(([key,content])=>({name:`twitter:${key}`,content}))],
  links:[{rel:'canonical',href:localeUrl(locale)},{rel:'alternate',hrefLang:'x-default',href:localeUrl('en')},...LOCALES.map(l=>({rel:'alternate',hrefLang:l.html,href:localeUrl(l.code)}))]
 };
}
export function structuredData(locale:Locale) {
 const t=translator(locale),url=localeUrl(locale),language=LOCALES.find(l=>l.code===locale)!.html;
 return {'@context':'https://schema.org','@graph':[
  {'@type':'WebSite','@id':`${SITE}/#website`,name:'1in8bn',url:`${SITE}/`,inLanguage:LOCALES.map(l=>l.html)},
  {'@type':'ImageObject','@id':`${SITE}/#share-image`,url:OG_IMAGE,contentUrl:OG_IMAGE,width:1200,height:630,caption:'1in8bn — free browser life simulator'},
  {'@type':'WebPage','@id':`${url}#webpage`,url,name:t('seo.title'),description:t('seo.description'),inLanguage:language,isPartOf:{'@id':`${SITE}/#website`},mainEntity:{'@id':`${url}#game`},primaryImageOfPage:{'@id':`${SITE}/#share-image`}},
  {'@type':['VideoGame','WebApplication'],'@id':`${url}#game`,name:'1in8bn',alternateName:t('title'),url,description:t('intro'),inLanguage:language,genre:'Life simulation',gamePlatform:'Web browser',applicationCategory:'GameApplication',operatingSystem:'Any',browserRequirements:'JavaScript enabled; modern browser',playMode:'SinglePlayer',isAccessibleForFree:true,image:OG_IMAGE,offers:{'@type':'Offer',price:'0',priceCurrency:'USD',url},mainEntityOfPage:{'@id':`${url}#webpage`}}
 ]};
}
export const robotsText = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`;
