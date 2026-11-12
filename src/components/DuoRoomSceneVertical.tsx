import { Portrait } from './Visuals';

/** Decorative preview. Both portraits share the background's SVG coordinate system. */
export function DuoRoomSceneVertical() {
  return (
    <div className="duo-scene-vertical" aria-hidden="true">
      <svg className="duo-scene-v-bg" viewBox="55 22 250 365" preserveAspectRatio="xMidYMid meet">
        {/* Wall background */}
        <rect width="360" height="480" fill="#f4efe6" />
        <path d="M0 0H360V310H0Z" fill="#ece4d4" />
        <path d="M0 310H360V480H0Z" fill="#d8c5aa" />
        {/* Floor plank lines */}
        <path
          d="M0 310H360M0 355H360M0 405H360M0 455H360M60 310V355M240 310V355M140 355V405M310 355V405M80 405V455M220 405V455"
          stroke="#c5af92"
          strokeWidth="2"
        />

        {/* Vertical Picture Window: Split Sky (Day on left, Dawn/Dusk on right) */}
        <rect x="50" y="32" width="260" height="180" rx="8" fill="#3c5257" />
        {/* Left sky (Clear teal-blue with sun) */}
        <path d="M56 38H178V206H56Z" fill="#9bbcc2" />
        <circle cx="95" cy="75" r="18" fill="#f7e19f" />
        <path d="M56 160L90 135L120 152L150 128L178 148V206H56Z" fill="#698577" />

        {/* Right sky (Warm sunset golden-coral) */}
        <path d="M182 38H304V206H182Z" fill="#d99f82" />
        <circle cx="260" cy="85" r="15" fill="#f8eed6" />
        <path d="M182 155L210 138L240 158L275 132L304 150V206H182Z" fill="#7d6a63" />

        {/* Window frame grid */}
        <path d="M180 38V206M56 122H304" stroke="#e9e1d2" strokeWidth="6" />
        <rect x="44" y="206" width="272" height="10" rx="2" fill="#886f5b" />

        {/* Wall Art on Left & Potted Plant on Right */}
        <rect x="12" y="70" width="28" height="38" fill="#c4b299" rx="2" />
        <rect x="15" y="73" width="22" height="32" fill="#fcf7ec" />
        <circle cx="26" cy="88" r="4" fill="#a47458" />

        {/* Potted Plant */}
        <path d="M326 295V245M326 270C305 268 308 240 322 250M328 260C346 257 348 235 336 242" stroke="#486e5b" strokeWidth="6" fill="none" />
        <path d="M316 292H338L334 316H320Z" fill="#b06c50" />

        {/* Shared Dining / Living Table in foreground */}
        <path d="M60 275H300V294H60Z" fill="#8f6c4f" rx="3" />
        <path d="M85 294V375M275 294V375" stroke="#715239" strokeWidth="8" />

        {/* Tabletop Items: Letters & Warm Teacups */}
        <path d="M160 268L178 262L200 270L182 276Z" fill="#fdf8ed" />
        <rect x="125" y="260" width="14" height="15" rx="2" fill="#3b6973" />
        <rect x="220" y="260" width="14" height="15" rx="2" fill="#9e5845" />

        {/* Left Chair (Solid) */}
        <path d="M38 290H88V300H38Z M44 300V355M82 300V355M38 290V235H45V290" stroke="#5d726b" strokeWidth="6" fill="none" />

        <path d="M272 290H322V300H272Z M278 300V355M316 300V355M315 290V235H322V290"
          stroke="#5d726b" strokeWidth="6" fill="none" />
        <foreignObject x="66" y="210" width="68" height="82">
          <div className="duo-v-character"><Portrait seed={17} age={20} /></div>
        </foreignObject>
        <foreignObject x="226" y="210" width="68" height="82">
          <div className="duo-v-character"><Portrait seed={42} age={20} sex="F" /></div>
        </foreignObject>
      </svg>
    </div>
  );
}
