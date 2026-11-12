import { getCountryById } from '../game/countries';
import { localeUrl } from './site-url';
import type { Locale } from './i18n';
export function birthInvitationUrl(locale:Locale,country:string) {
 const url=new URL(localeUrl(locale));if(getCountryById(country))url.searchParams.set('born',country);return url.href;
}
export function readBirthInvitation(search:string) {return getCountryById(new URLSearchParams(search).get('born')??'')??null;}
/** Keep the invitation intact in a Threads draft. Count code points, never split a surrogate pair. */
export function threadsPost(text:string,url:string){
 if(Array.from(url).length>480){
  try{const invitation=new URL(url);for(const key of ['n'])if(Array.from(invitation.href).length>480)invitation.searchParams.delete(key);url=Array.from(invitation.href).length>480?`${invitation.origin}${invitation.pathname}`:invitation.href;}catch{/* Internal invitations are valid URLs. */}
 }
 const budget=Math.max(0,500-Array.from(url).length-1),chars=Array.from(text);
 return `${chars.length>budget?chars.slice(0,Math.max(0,budget-1)).join('').trimEnd()+'…':text}\n${url}`;
}
export function shareIntents(text:string,url:string) {
 return {x:`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,threads:`https://www.threads.net/intent/post?text=${encodeURIComponent(threadsPost(text,url))}`,whatsapp:`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,facebook:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,telegram:`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,reddit:`https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,line:`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,vk:`https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`};
}
type ShareBrowser={canShare?:(data:ShareData)=>boolean;share?:(data:ShareData)=>Promise<void>};
export async function shareImageAction(browser:ShareBrowser,file:File,content:{title:string;text:string;url:string}):Promise<'shared'|'unsupported'|'cancelled'|'unavailable'> {
 return shareImagesAction(browser,[file],content);
}
/** Check the exact file group: support for one PNG does not imply support for several. */
export async function shareImagesAction(browser:ShareBrowser,files:File[],content:{title:string;text:string;url:string}):Promise<'shared'|'unsupported'|'cancelled'|'unavailable'> {
 try{
  if(!files.length||files.length>4||!browser.share||!browser.canShare?.({files}))return 'unsupported';
  await browser.share({files,title:content.title,text:`${content.text}\n${content.url}`});return 'shared';
 }catch(error){return error instanceof DOMException&&error.name==='AbortError'?'cancelled':'unavailable';}
}

export async function shareLinkAction(browser:ShareBrowser,content:{title:string;text:string;url:string}):Promise<'shared'|'unsupported'|'cancelled'|'unavailable'>{
 if(!browser.share)return 'unsupported';
 try{await browser.share(content);return 'shared';}catch(error){return error instanceof DOMException&&error.name==='AbortError'?'cancelled':'unavailable';}
}
export async function copyImageAction(browser:{clipboard?:{write?:(items:ClipboardItem[])=>Promise<void>}},blob:Blob,Item:typeof ClipboardItem|undefined=globalThis.ClipboardItem):Promise<boolean>{
 if(!browser.clipboard?.write||!Item)return false;
 try{await browser.clipboard.write([new Item({'image/png':blob})]);return true;}catch{return false;}
}
