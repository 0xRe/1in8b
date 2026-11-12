import type { Locale } from './i18n';
import { duoPath } from './site-url';

/** An intentional private invitation. Nicknames stay in the message, never public metadata. */
export function duoInvitationShare(name:string,origin:string,roomId:string,secret:string,locale:Locale='en'){
 const inviter=name.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,40)||'A friend';
 const url=`${origin}${duoPath(locale)}?room=${encodeURIComponent(roomId)}#invite=${encodeURIComponent(secret)}`;
 const text=`${inviter} invited you to a free life story on 1in8bn.com. Two whole lives, side by side: we are each born somewhere in the world by chance, make our own choices from birth to old age, and decide the big things together.`;
 return {title:'A life, together · 1in8bn',text,url,copyText:`${text}\n${url}`};
}
