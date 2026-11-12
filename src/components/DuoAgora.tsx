import { ArrowUpRight } from 'lucide-react';

const AGORA_URL = 'https://www.agora.io/en/';

type Variant = 'pill' | 'inline' | 'card' | 'feature';

function AgoraLogo() {
  return <img className="duo-agora-logo" src="/brand/agora-logo.png" alt="Agora" width={480} height={166} loading="lazy" decoding="async"/>;
}

export function PoweredByAgora({ variant = 'pill' }: { variant?: Variant }) {
  const large = variant === 'card' || variant === 'feature';
  return <a className={`duo-agora duo-agora-${variant}`} href={AGORA_URL} target="_blank" rel="noopener" >
    {large ? <>
      <span className="duo-agora-top"><small>{variant === 'feature' ? 'Voice chat powered by' : 'Real-time voice powered by'}</small><ArrowUpRight size={18} aria-hidden="true"/></span>
      <span className="duo-agora-brand"><AgoraLogo/><b>WebRTC</b></span>
      {variant === 'feature' && <em>Talk to your friend in real time while you play. Free, with no time limit.</em>}
    </> : <>
      <span className="duo-agora-by">Powered by</span><span className="duo-agora-brand"><AgoraLogo/><b>WebRTC</b></span>
      <ArrowUpRight size={variant === 'inline' ? 12 : 14} aria-hidden="true"/>
    </>}
    <span className="duo-sr-only"> (opens in a new tab)</span>
  </a>;
}
