import { useEffect, useId, useRef, useState } from "react";
import type { Life } from "../game/types";
import type { translator } from "../lib/i18n";
type T = ReturnType<typeof translator>;
import {
  FURNITURE,
  ROOM_OPTIONS,
  readRoom,
  normalizeRoom,
  type Item,
  type Room,
} from "../lib/room-data";
import { ExtraObjectArt, Wallpaper, WindowView, CLOTHING, RoomPerson, isNightView } from "./RoomArt";
import { hairTone, skinTone } from "../lib/portrait";
import { albumPicture } from "../lib/album-picture";
import { sceneKind } from "../lib/pixel-art";
import { RoomMusic } from "./RoomMusic";
import "./memory-room.css";
function ObjectArt({ item, variant = 0 }: { item: Item; variant?: number }) {
  switch (item) {
    case "table":
    case "desk":
      return (
        <g>
          <path d="M-26-19h5v30h-5zM21-19h5v30h-5z" fill="#86644a" />
          <path d="M-23-19h2v30h-2zM24-19h2v30h-2z" fill="#6b4e38" />
          <path d="M-30-27h60v4h-60z" fill="#a8825f" />
          <path d="M-30-27h60v1h-60z" fill="#c9a47e" />
          <path d="M-30-23h60v4h-60z" fill="#7d5c42" />
          {item === "desk" ? (
            <g>
              <path d="M8-19h16v14H8z" fill="#9a7657" /><path d="M8-19h16v1H8z" fill="#b39070" /><path d="M14-13h4v2h-4z" fill="#e1cc9f" />
              <path d="M-22-33h16v3h-16z" fill="#b25e6d" /><path d="M-21-36h14v3h-14z" fill="#5f78b0" /><path d="M-22-39h12v3h-12z" fill="#d9b779" />
            </g>
          ) : (
            <g>
              <path d="M10-37h8v10h-8z" fill="#8fb3b5" /><path d="M15-37h3v10h-3z" fill="#6f9597" /><path d="M11-37h2v6h-2z" fill="#b8d3d3" />
              <path d="M13-45h2v8h-2z" fill="#6d8a55" /><path d="M10-50h8v6h-8z" fill="#e7a3a8" /><path d="M10-50h8v1h-8z" fill="#f2c3c6" /><path d="M13-48h2v2h-2z" fill="#f4d27a" />
            </g>
          )}
        </g>
      );
    case "chair":
      return (
        <g>
          <path d="M-14-40h28v32h-28z" fill="#8f654e" /><path d="M-14-40h28v2h-28z" fill="#aa7f63" />
          <path d="M-9-34h18v20H-9z" fill="#d6bb92" /><path d="M-9-34h18v2H-9z" fill="#e6d0aa" />
          <path d="M-16-8h32v6h-32z" fill="#a57a5e" /><path d="M-16-8h32v1h-32z" fill="#c09474" />
          <path d="M-13-2h4v16h-4zM10-2h4v16h-4z" fill="#7a5541" />
        </g>
      );
    case "plant":
      return (
        <g>
          <path d="M0-8C-2-20-4-30-3-40M0-8c4-8 8-14 10-20M0-8c-4-6-8-12-10-16" stroke="#5f7d45" strokeWidth="1.5" fill="none" />
          <g fill="#557d47">
            <ellipse cx="-13" cy="-13" rx="9" ry="4" transform="rotate(-14 -13 -13)" />
            <ellipse cx="5" cy="-36" rx="5" ry="10" transform="rotate(22 5 -36)" />
          </g>
          <g fill="#6f9a5a">
            <ellipse cx="-10" cy="-25" rx="10" ry="5" transform="rotate(-30 -10 -25)" />
            <ellipse cx="11" cy="-27" rx="11" ry="5" transform="rotate(28 11 -27)" />
            <ellipse cx="-3" cy="-41" rx="6" ry="11" transform="rotate(-8 -3 -41)" />
            <ellipse cx="10" cy="-14" rx="9" ry="4" transform="rotate(15 10 -14)" />
          </g>
          <g fill="#94bd78">
            <ellipse cx="-13" cy="-27" rx="4" ry="1.6" transform="rotate(-30 -13 -27)" />
            <ellipse cx="8" cy="-30" rx="4" ry="1.6" transform="rotate(28 8 -30)" />
            <ellipse cx="-5" cy="-45" rx="1.8" ry="4" transform="rotate(-8 -5 -45)" />
          </g>
          <path d="M-12-9h24v2h-24z" fill="#5a4636" />
          <path d="M-13-4h26l-4 20h-18z" fill="#b5785c" /><path d="M4-4h9l-4 20H4z" fill="#985f47" />
          <path d="M-15-8h30v5h-30z" fill="#c98d6f" /><path d="M-15-8h30v1h-30z" fill="#ddaa8b" />
        </g>
      );
    case "bed":
      return (
        <g>
          <path d="M-35-34h12v46h-12z" fill="#8a6c55" /><path d="M-35-34h12v2h-12z" fill="#a8876c" />
          <path d="M-33-12h68v18h-68z" fill="#987c66" />
          <path d="M-24-16h58v14h-58z" fill="#ede6d6" />
          <path d="M-23-24h18v9h-18z" fill="#f7f2e8" /><path d="M-23-16h18v1h-18z" fill="#d8cfbd" />
          <path d="M-4-18h39v16H-4z" fill="#84978b" /><path d="M-4-18h39v3H-4z" fill="#a6b8ac" /><path d="M-4-6h39v4H-4z" fill="#6d8074" />
          <path d="M-31 6h4v8h-4zM29 6h4v8h-4z" fill="#5d4a3a" />
        </g>
      );
    case "sofa":
      return (
        <g>
          <path d="M-35-30h70v22h-70z" fill="#6f8579" /><path d="M-35-30h70v2h-70z" fill="#8aa194" /><path d="M-1-28h2v18h-2z" fill="#5f7469" />
          <path d="M-31-8h62v12h-62z" fill="#86a090" /><path d="M-31-8h62v2h-62z" fill="#a1b9aa" /><path d="M-1-8h2v12h-2z" fill="#6f8879" />
          <path d="M-27-19h13v11h-13z" fill="#d9b779" /><path d="M-27-19h13v2h-13z" fill="#ead096" /><path d="M-16-19h2v11h-2z" fill="#bf9d61" />
          <path d="M-41-16h11v27h-11zM30-16h11v27H30z" fill="#7c9586" /><path d="M-41-16h11v3h-11zM30-16h11v3H30z" fill="#9ab1a2" /><path d="M38-16h3v27h-3z" fill="#647a6d" />
          <path d="M-41 4h82v7h-82z" fill="#647a6d" />
          <path d="M-37 11h4v5h-4zM33 11h4v5h-4z" fill="#4f4436" />
        </g>
      );
    case "piano":
      return (
        <g>
          <path d="M-30-43h60v53h-60z" fill="#4c433a" /><path d="M-30-43h60v2h-60z" fill="#6b6056" /><path d="M26-43h4v53h-4z" fill="#3a332c" />
          <path d="M-22-38h44v16h-44z" fill="#5a5047" />
          <path d="M-32-14h64v10h-64z" fill="#eee9dc" /><path d="M-32-6h64v2h-64z" fill="#cfc8b8" />
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x={-26 + i * 6} y="-14" width="2" height="6" fill="#292b29" />
          ))}
          <path d="M-12-48h3v5h-3zM6-48h3v5H6z" fill="#e9d7a0" /><path d="M-13-50h5v2h-5zM5-50h5v2H5z" fill="#fff3c8" />
        </g>
      );
    case "tv":
      return (
        <g>
          <path d="M-29-40h58v38h-58zM-24-2h5v12h-5zM19-2h5v12h-5z" fill="#786653" />
          <path d="M-29-40h58v2h-58z" fill="#96826c" />
          <path d="M-24-35h40v28h-40z" fill="#91a9ab" /><path d="M-24-35h40v28h-40z" fill="#c9dcdc" opacity=".25" /><path d="M-20-31l10-0-14 14v-10z" fill="#e3eeee" opacity=".5" />
          <path d="M20-34h5v4h-5zM20-26h5v4h-5z" fill="#d9c49a" />
          <path d="m-12-52 12 12 13-12" fill="none" stroke="#675e51" strokeWidth="3" />
        </g>
      );
    case "bookshelf": {
      const books = [[5, 15, "#81988c"], [4, 13, "#b08d76"], [6, 16, "#5f78b0"], [3, 14, "#ccbb91"], [5, 12, "#a37b80"], [4, 15, "#9eaaad"], [6, 13, "#c9705a"]] as const;
      return (
        <g>
          <path d="M-26-60h52v74h-52z" fill="#7b5a43" />
          <path d="M-22-56h44v66h-44z" fill="#5a4231" />
          <path d="M-26-60h52v2h-52z" fill="#9a7559" /><path d="M22-60h4v74h-4z" fill="#664a37" />
          {[-37, -15, 10].map((shelf, row) => {
            let x = -21;
            return (
              <g key={row}>
                {books.slice(row, row + 6).map(([bw, bh, color], i) => {
                  const bx = x; x += bw + 1;
                  return <g key={i}><rect x={bx} y={shelf - bh} width={bw} height={bh} fill={color} /><rect x={bx} y={shelf - bh + 3} width={bw} height="1" fill="#fff4dc" opacity=".45" /><rect x={bx + bw - 1} y={shelf - bh} width="1" height={bh} fill="#2a2340" opacity=".18" /></g>;
                })}
                {row < 2 && <path d={`M-22 ${shelf}h44v3h-44z`} fill="#9a7559" />}
              </g>
            );
          })}
          <path d="M-27 10h54v4h-54z" fill="#664a37" />
        </g>
      );
    }
    case "clock":
      return (
        <g>
          <circle cy="-10" r="19" fill="#826a50" /><circle cx="-2" cy="-12" r="17" fill="#9a7f61" opacity=".6" />
          <circle cy="-10" r="15" fill="#f4ecd4" />
          <path d="M-1-24h2v3h-2zM-1 2h2v3h-2zM-15-11h3v2h-3zM12-11h3v2h-3z" fill="#6e6355" />
          <path d="M0-21v11l7 4" fill="none" stroke="#3f3a33" strokeWidth="2" />
          <circle cy="-10" r="1.6" fill="#a5343f" />
        </g>
      );
    case "lamp":
      return (
        <g>
          <ellipse cy="-24" rx="22" ry="14" fill="#ffe2a0" opacity=".25" />
          <path d="M-2-37h4v49H-2zM-15 10h30v4h-30z" fill="#87775c" /><path d="M0-37h2v49H0z" fill="#6d5f49" />
          <path d="M-13-52h26l8 19h-42z" fill="#e2cb92" /><path d="M-13-52h7l-6 19h-9z" fill="#f3e2b6" /><path d="M7-52h6l8 19h-8z" fill="#c4ab72" />
          <path d="M-21-33h42v2h-42z" fill="#b39860" />
        </g>
      );
    case "picture":
      return (
        <g>
          <path d="M-30-36h60v46h-60z" fill="#8a6a4c" />
          <path d="M-30-36h60v2h-60zM-30-36h2v46h-2z" fill="#b08a63" /><path d="M28-36h2v46h-2zM-30 8h60v2h-60z" fill="#6a4f38" />
          <path d="M-26-32h52v38h-52z" fill="#efe6d2" />
          {variant % 3 === 0 ? (
            <g>
              <path d="M-22-28h44v8h-44z" fill="#a9cfe0" /><path d="M-22-20h44v6h-44z" fill="#c2dde7" /><path d="M-22-14h44v4h-44z" fill="#d8eaea" />
              <circle cx="12" cy="-21" r="4" fill="#f4d27a" />
              <path d="M-22-10l10-8 8 5 9-9 17 12v12h-44z" fill="#9cb8a4" /><path d="M-22-2l14-6 12 4 18-6V2h-44z" fill="#7c9e6f" />
            </g>
          ) : variant % 3 === 1 ? (
            <g>
              <path d="M-22-28h44v30h-44z" fill="#e7d8c0" /><path d="M-22-4h44v6h-44z" fill="#c9a985" />
              <path d="M-5-14h10v10H-5z" fill="#6f97a8" /><path d="M1-14h4v10H1z" fill="#577d8e" />
              <path d="M-1-20v6M-6-22l5 8M6-23l-5 9" stroke="#6d8a55" strokeWidth="1.5" />
              <circle cx="-1" cy="-21" r="3" fill="#e7a3a8" /><circle cx="-7" cy="-23" r="3" fill="#f4d27a" /><circle cx="6" cy="-24" r="3" fill="#f7f1e6" /><circle cx="-1" cy="-21" r="1" fill="#f4d27a" />
            </g>
          ) : (
            <g>
              <path d="M-22-28h44v8h-44z" fill="#e8b593" /><path d="M-22-20h44v6h-44z" fill="#f2cda0" />
              <circle cy="-14" r="5" fill="#f7d58a" />
              <path d="M-22-14h44v16h-44z" fill="#6d9bb0" /><path d="M-14-8h10M2-4h14M-18 0h8" stroke="#bfd9df" />
              <path d="M8-11h10l-2 3h-7z" fill="#6b4c3a" /><path d="M12-22v11h-6zM13-20v9h5z" fill="#f7f2e6" />
            </g>
          )}
        </g>
      );
    case "rug":
      return (
        <g>
          {Array.from({ length: 24 }, (_, i) => <path key={i} d={`M${-72 + i * 6.2} 23v3`} stroke="#e8d3ad" />)}
          <path d="M-56-8h112l18 31H-74z" fill="#9f6455" />
          <path d="M-51-5h102l14 25H-65z" fill="#c99a6e" />
          <path d="M-45-2h90l10 19H-55z" fill="#ead6b1" />
          <path d="m0 0 17 7.5L0 15l-17-7.5z" fill="#9f6455" /><path d="m0 3 9 4.5L0 12l-9-4.5z" fill="#d9b779" />
          <path d="m-32 5 5 2.5-5 2.5-5-2.5zM32 5l5 2.5-5 2.5-5-2.5z" fill="#7d8f80" />
        </g>
      );
    default:
      return <ExtraObjectArt item={item} />;
  }
}
export function MemoryRoom({
  life,
  t,
}: {
  life: Pick<Life, "id" | "name" | "events"> & Partial<Pick<Life, "family"|"seed"|"sex"|"age"|"birthYear"|"alive"|"residence"|"pets"|"stats">>;
  t: T;
}) {
  const [room, setRoom] = useState<Room>(() => normalizeRoom(null)),
    [slot, setSlot] = useState(0),
    [tab, setTab] = useState("room"),
    [loaded, setLoaded] = useState(false),
    [failed, setFailed] = useState(false);
  const canvas = useRef<SVGSVGElement>(null);
  const [downloadError, setDownloadError] = useState("");
  const id = useId().replaceAll(":", "");
  const seed = life.seed ?? [...life.id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
  useEffect(() => {
    setLoaded(false);
    setRoom(readRoom(life.id));
    setLoaded(true);
  }, [life.id]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(`1in8bn-room-${life.id}`, JSON.stringify(room));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [room, loaded, life.id]);
  const update = (key: keyof Room, value: unknown) =>
    setRoom((r) => ({ ...r, [key]: value }));
  const night = isNightView(room.window);
  const positions = [
    [100, 240],
    [76, 260],
    [345, 260],
    [350, 232],
    [215, 275],
    [225, 100],
    [300, 90],
    [365, 100],
  ];
  const label = (value:string) => {const key=`feature.room.${value}`;return t(key)!==key?t(key):t(`ui.${value}`);};
  const choices = (key: keyof typeof ROOM_OPTIONS, values: readonly string[]) => (
    <fieldset>
      <legend>{label(key)}</legend>
      <div className="segments">
        {values.map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={room[key] === value}
            onClick={() => setRoom(r=>({...r,[key]:value,...(key==="people"&&value==="family"?{occupants:Math.min(6,1+(life.family?.partner?.alive?1:0)+(life.family?.children.filter(c=>c.alive).length??0))}:{})}))}
          >
            {label(value)}
          </button>
        ))}
      </div>
    </fieldset>
  );
  async function saveRoom() {
    if(!canvas.current)return;
    try {
      setDownloadError("");
      const copy=canvas.current.cloneNode(true) as SVGSVGElement;
      copy.querySelectorAll('[role="button"]').forEach(e=>e.remove());
      copy.setAttribute("xmlns","http://www.w3.org/2000/svg");
      copy.setAttribute("width","1320");copy.setAttribute("height","990");
      const image=new Image(); image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
      await image.decode(); const output=document.createElement("canvas");output.width=1320;output.height=990;
      const context=output.getContext("2d");if(!context)throw new Error("Canvas unavailable");context.imageSmoothingEnabled=false;context.drawImage(image,0,0);
      const blob=await new Promise<Blob>((resolve,reject)=>output.toBlob(b=>b?resolve(b):reject(new Error("No image")),"image/png"));
      const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`${life.id}-room.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch{setDownloadError(t("feature.roomSaveError"));}
  }
  const milestones = life.events
    .filter((e) => e.kind !== "everyday" && e.key !== "event.choice")
    .slice(-30);
  return (
    <div className="memory-room">
      <div className="segments room-tabs">
        {["room", "album", "words"].map((value) => (
          <button
            key={value}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {t(value === "room" || value === "words" ? `ui.${value}` : value)}
          </button>
        ))}
      </div>
      <h2>{room.title || life.name}</h2>
      {room.words && <p>{room.words}</p>}
      {tab === "room" && (
        <>
          <svg
            ref={canvas}
            className="room-canvas"
            viewBox="0 0 440 330"
            role="group"
            aria-label={`${life.name} · ${t("ui.room")}`}
            shapeRendering="crispEdges"
          >
            <defs>
              <pattern
                id={`${id}wall`}
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <Wallpaper room={room} />
              </pattern>
              <clipPath id={`${id}view`}>
                <rect x="35" y="45" width="115" height="112" />
              </clipPath>
              <linearGradient id={`${id}wallShade`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff8e8" stopOpacity=".2" />
                <stop offset=".5" stopColor="#fff8e8" stopOpacity="0" />
                <stop offset="1" stopColor="#2b1d10" stopOpacity=".24" />
              </linearGradient>
              <linearGradient id={`${id}floorShade`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2b1d10" stopOpacity=".32" />
                <stop offset=".35" stopColor="#2b1d10" stopOpacity=".04" />
                <stop offset="1" stopColor="#2b1d10" stopOpacity=".2" />
              </linearGradient>
              <linearGradient id={`${id}sun`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={night ? "#b9cdfa" : "#fff1c4"} stopOpacity={night ? ".22" : ["rain", "snow"].includes(room.window) ? ".28" : ".55"} />
                <stop offset="1" stopColor={night ? "#b9cdfa" : "#fff1c4"} stopOpacity="0" />
              </linearGradient>
              <radialGradient id={`${id}lamp`}>
                <stop offset="0" stopColor="#ffd88a" stopOpacity={night ? ".5" : ".22"} />
                <stop offset="1" stopColor="#ffd88a" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={`${id}vignette`} cx=".5" cy=".46" r=".72">
                <stop offset=".62" stopColor="#1a1008" stopOpacity="0" />
                <stop offset="1" stopColor="#1a1008" stopOpacity={night ? ".5" : ".36"} />
              </radialGradient>
              <filter id={`${id}outline`} x="-30%" y="-10%" width="160%" height="120%">
                <feMorphology in="SourceAlpha" operator="dilate" radius="1" result="grown" />
                <feFlood floodColor="#2a1c12" floodOpacity=".85" />
                <feComposite in2="grown" operator="in" result="line" />
                <feMerge><feMergeNode in="line" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id={`${id}drop`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="3" dy="3" stdDeviation="0" floodColor="#1d130a" floodOpacity=".24" />
              </filter>
            </defs>
            <path d="M0 0h440v330H0z" fill="#6e5d4b" />
            <path d="M8 8h424v218H8z" fill={`url(#${id}wall)`} />
            <path d="M8 8h424v218H8z" fill={`url(#${id}wallShade)`} />
            <path
              d="M8 226h424v96H8z"
              fill={({wood:"#b79979",ondol:"#cfb98e",tatami:"#a7b08a",tiles:"#d7d7c7",carpet:"#8c9586",marble:"#e0ded5"} as Record<string,string>)[room.floor]}
            />
            {room.floor==="tiles"&&Array.from({length:24},(_,i)=><rect key={i} x={8+i%8*53} y={226+Math.floor(i/8)*32} width="53" height="32" fill={(i+Math.floor(i/8))%2?"#929d94":"#dedfd0"}/>)}
            {room.floor==="tatami"&&<path d="M148 226v96M290 226v96M8 274h424" stroke="#6f8264" strokeWidth="5"/>}
            {room.floor==="marble"&&<path d="m20 226 75 31 27-7 83 72m25-96 48 16 20 39 102 41" stroke="#bbc0b6" fill="none" strokeWidth="2"/>}
            {Array.from({ length: 6 }, (_, i) => (
              <path
                key={i}
                d={`M8 ${230 + i * 16}h424`}
                stroke="#74644f"
                opacity=".3"
              />
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <path
                key={i}
                d={`M${i * 65} 226v96`}
                stroke="#74644f"
                opacity=".25"
              />
            ))}
            <path d="M8 226h424v96H8z" fill={`url(#${id}floorShade)`} />
            <path d="M35 226h115l100 96H125z" fill={`url(#${id}sun)`} />
            <path d="M8 218h424v8H8z" fill="#8a6f57" />
            <path d="M8 218h424v1H8z" fill="#c9ae8f" />
            <path d="M8 226h424v4H8z" fill="#1d130a" opacity=".2" />
            <path d="M30 39h137v133H30z" fill="#1d130a" opacity=".18" />
            <rect x="26" y="35" width="134" height="132" fill="#9d856b" />
            <g clipPath={`url(#${id}view)`}>
              <WindowView view={room.window} />
            </g>
            <path d="M90 42h5v118h-5zM31 101h124v5H31z" fill="#eee5d2" />
            <path
              d="M24 33h138v5H24zM22 38h12v128H22zM151 38h12v128h-12z"
              fill="#c1a48d"
            />
            <path d="M35 45h115v4H35zM35 45h4v112h-4z" fill="#1d130a" opacity=".22" />
            <path d="M18 165h150v6H18z" fill="#dcc6a8" />
            <path d="M18 171h150v3H18z" fill="#1d130a" opacity=".2" />
            <circle cx="275" cy="38" r={night ? 120 : 70} fill={`url(#${id}lamp)`} />
            <path d="M274 8h2v17h-2z" fill="#6f624c" />
            <path d="M264 25h22l6 9h-34z" fill="#e2cd94" />
            <path d="M264 25h6l-3 9h-9z" fill="#fff6d9" opacity=".5" />
            <path d="M280 25h6l6 9h-8z" fill="#5a4a2e" opacity=".22" />
            <path d="M271 34h8v3h-8z" fill={night ? "#fff1b8" : "#f1dfa8"} />
            {positions.map((p, i) => [p[0], p[1], i] as const).sort((a, b) => a[1] - b[1]).map(([x, y, i]) => (
              <g key={i} transform={`translate(${x},${y})`}>
                {y >= 200 && <ellipse cy="16" rx="33" ry="5" fill="#1d130a" opacity=".22" />}
                <g filter={`url(#${id}drop)`}><ObjectArt item={room.items[i]} variant={i} /></g>
                {(
                  <rect
                    role="button"
                    tabIndex={0}
                    aria-label={`${t("ui.furniture")} ${i + 1}`}
                    x="-37"
                    y="-60"
                    width="74"
                    height="81"
                    fill="transparent"
                    stroke={slot === i ? "#8c1d3c" : "transparent"}
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    onClick={() => setSlot(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSlot(i);
                      }
                    }}
                  />
                )}
              </g>
            ))}
            {Array.from({length:room.people==="family"?room.occupants:1},(_,i)=><g key={i} transform={`translate(${room.people==="family"?160+i*26:220},${i>1?252:244}) scale(${i>1?.8:1})`}>
              <ellipse cx="7" cy="46" rx="12" ry="3" fill="#1d130a" opacity=".24" />
              <g filter={`url(#${id}outline)`}><RoomPerson shirt={i===0?CLOTHING[room.clothes]:["#a17c86","#7c91a4","#b6a06e"][i%3]} skin={skinTone(seed)} hair={hairTone(seed + i * 7919)} long={(life.sex === "F") !== (i % 2 === 1)} /></g>
            </g>)}
            {night && <path d="M8 8h424v314H8zM35 45h115v112H35z" fillRule="evenodd" fill="#141a36" opacity=".3" pointerEvents="none" />}
            {night && <circle cx="275" cy="38" r="110" fill={`url(#${id}lamp)`} pointerEvents="none" />}
            <path d="M8 8h424v314H8z" fill={`url(#${id}vignette)`} pointerEvents="none" />
            <path d="M8 8h424v314H8z" fill="none" stroke="#3f3428" strokeWidth="2" pointerEvents="none" />
          </svg>
          <div className="room-actions"><button type="button" onClick={saveRoom}>{t("feature.roomSave")}</button><RoomMusic track={room.music} t={t} /></div>
          {downloadError&&<p role="alert">{downloadError}</p>}
          {(
            <>
              <p className="muted">{t("ui.roomHelp")}</p>
              {choices("wall", ROOM_OPTIONS.wall)}
              {choices("floor", ROOM_OPTIONS.floor)}
              {choices("window", ROOM_OPTIONS.window)}
              {choices("clothes", ROOM_OPTIONS.clothes)}
              {choices("people", ROOM_OPTIONS.people)}
              {room.people==="family"&&<p className="tiny">{t("feature.roomFamily")}</p>}
              {choices("music", ROOM_OPTIONS.music)}
              <fieldset>
                <legend>
                  {t("ui.furniture")} · {slot + 1}
                </legend>
                <div className="furniture-picker">
                  {FURNITURE.map((item) => (
                    <button
                      key={item}
                      aria-pressed={room.items[slot] === item}
                      onClick={() =>
                        setRoom((r) => ({
                          ...r,
                          items: r.items.map((v, i) => (i === slot ? item : v)),
                        }))
                      }
                    >
                      <svg viewBox="-75 -65 150 100" aria-hidden="true">
                        <ObjectArt item={item} />
                      </svg>
                      {label(item)}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}
        </>
      )}
      {tab === "words" && (
        <>
          <label>
            {t("ui.title")}
            <input
              maxLength={80}
              value={room.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </label>
          <label>
            {t("ui.finalThought")}
            <textarea
              maxLength={400}
              value={room.words}
              onChange={(e) => update("words", e.target.value)}
            />
          </label>
        </>
      )}
      {tab === "album" && (
        <div className="room-album">
          {milestones.map((e) => (
            <article key={e.id}>
              {life.seed!==undefined&&life.sex&&life.stats&&life.family&&life.pets&&life.age!==undefined&&life.birthYear!==undefined&&life.alive!==undefined&&life.residence&&<img className="album-picture" src={albumPicture({age:e.age,year:e.year,text:"",caption:"",scene:{kind:sceneKind({seed:life.seed,sex:life.sex,age:life.age,birthYear:life.birthYear,alive:life.alive,residence:life.residence,pets:life.pets,stats:life.stats,family:life.family},e),seed:life.seed,sex:life.sex}})} alt={t("feature.pixelMemory",{age:e.age})} width="960" height="540" loading="lazy"/>}
              <small>
                {t("age")} {e.age} · {e.year}
              </small>
              <p>{t(e.key, e.params)}</p>
              <label>
                {t("ui.caption")}
                <textarea
                  maxLength={240}
                  value={room.captions[e.id] ?? ""}
                  onChange={(event) =>
                    setRoom((r) => ({
                      ...r,
                      captions: { ...r.captions, [e.id]: event.target.value },
                    }))
                  }
                />
              </label>
            </article>
          ))}
        </div>
      )}

      {(
        <p className="tiny" role="status">
          {t(failed ? "storageError" : "saved")}
        </p>
      )}
    </div>
  );
}
