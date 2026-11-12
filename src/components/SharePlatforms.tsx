import {FaXTwitter,FaThreads,FaFacebookF,FaWhatsapp,FaTelegram,FaRedditAlien,FaLine,FaVk} from 'react-icons/fa6';
import {shareIntents} from '../lib/social-sharing';

const platforms=[
 ['x','X',FaXTwitter],['threads','Threads',FaThreads],['facebook','Facebook',FaFacebookF],
 ['whatsapp','WhatsApp',FaWhatsapp],['telegram','Telegram',FaTelegram],['reddit','Reddit',FaRedditAlien],
 ['line','LINE',FaLine],['vk','VK',FaVk],
] as const;

/** Brand artwork comes from React Icons / Font Awesome Brands; never substitute letters. */
export function SharePlatforms({text,url,label}:{text:string;url:string;label:string}){
 return <div className="social-platforms">{platforms.map(([key,name,Icon])=><a key={key} className={`social-platform social-platform--${key}`} href={shareIntents(text,url)[key]} target="_blank" rel="noopener noreferrer" aria-label={`${label} · ${name}`}><span className={`social-mark social-mark--${key}`} aria-hidden="true"><Icon size={20}/></span><span>{name}</span></a>)}</div>;
}
