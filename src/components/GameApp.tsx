import {SiteHeader} from './SiteHeader';
import {LocaleFlag} from './LocaleFlag';
import './social-sharing.css';
import {Share2, Sprout, UserRound, UsersRound, Globe2} from "lucide-react";
import { phoneTabsCopy, type PhoneTab } from "../lib/phone-tabs-copy";
import {collectionCopy} from '../lib/share-collection-copy';
import {LifeShareStrip} from './LifeShareStrip';
import {hobbyDisplayKey} from '../game/physical-hobbies';
import{isPhysicalEquipmentDecision}from'../game/physical-decisions';
import{physicalAccess,physicalEnvironment}from'../game/physical-access';
import {MajorChoiceDetails} from './MajorChoiceDetails';
import {GraduateStudyNotice} from './GraduateStudyNotice';
import {physicalCountry} from '../game/physical-residence';
import {createNewGame} from '../game/new-game';
import {newFocusOptions,selectNewFocus} from '../game/school-focus';
import { BirthDraw } from "./BirthDraw";
import { BirthInvitation } from "./BirthInvitation";
import { InvitedComparison } from "./InvitedComparison";
import { DuoEndingCard, DuoFooterLink } from "./DuoDiscoveryCard";
import { birthInvitationUrl, readBirthInvitation, shareImageAction, shareLinkAction } from "../lib/social-sharing";
import { lifeShareUrl, readInviter } from "../lib/life-share";
import { lifePost, fillViral, viralCopy } from "../lib/viral-copy";
import { momentPost } from "../lib/share-story";
import { readLifeInvitation } from "../lib/life-share";
import { prepareMomentShare, prepareQuickShare, type QuickShare } from "../lib/quick-share";
import { createBirthTicket } from "../lib/birth-journey";
import { birthCopy } from "../lib/birth-experience-copy";
import {qualificationLabel} from '../lib/qualification-label';
import { archiveCopy } from "../lib/archive-copy";
import { planArchiveRemoval } from "../lib/archive-management";
import { playbackElapsed, stopsFastForward, setAutomaticChoices, setPlayback } from "../game/playback";
import { MoneyRegionPicker } from "./MoneyRegionPicker";
import { MoneyRegionSelect } from "./MoneyRegionSelect";
import { readMoneyRegion, defaultMoneyRegion, moneyPlaceName, MONEY_PREFERENCE, MONEY_REGIONS, type MoneyRegion } from "../lib/money-display";
import { householdPartners } from "../game/descendants";
import { readSessionPreference } from "../lib/session-preferences";
import { FamilyDescendants } from "./FamilyDescendants";
import { localePath } from "../lib/site-url";
import { exportBackup, importBackup } from "../lib/transfer";
import { getLifeMilestones } from "../game/life-milestones";
import { worldSurvivalCurve } from "../game/world-survival";
import { calmMusic, lifeCueFor, type LifeCue } from "../lib/calm-music";
import { CalmMusicButton } from "./CalmMusicButton";
import { UnlivedStones } from "./UnlivedStones";
import { LiveCompanions } from "./LiveCompanions";
import { LifeSceneBanner } from "./LifeSceneBanner";
import { addUnlivedLife, isStonesHidden, setStonesHidden } from "../lib/unlived";
import { ShareLife } from "./ShareLife";
import { isPeakMoment } from "../lib/share-story";
import { storyCopy } from "../lib/share-story-copy";
import { LastMoments } from "./LastMoments";
import { Healthcare } from "./Healthcare";
import { LifeGrain } from "./LifeGrain";
import { LifeRecord } from "./LifeRecord";
import { AutoInclinationPicker } from "./AutoInclinationPicker";
import { RateNote } from "./RateNote";
import { PastLivesShowcase } from "./PastLivesShowcase";
import { type AutoLean, selectAutoChoice } from "../lib/auto-lean";
import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
// Dialogs load when first opened, so the game page does not ship them up front.
const DIALOGS = {
  ArchiveManager: () => import("./ArchiveManager").then((m) => ({ default: m.ArchiveManager })),
  CountryExplorer: () => import("./CountryExplorer").then((m) => ({ default: m.CountryExplorer })),
  FilmStudio: () => import("./FilmStudio").then((m) => ({ default: m.FilmStudio })),
  MemoryRoom: () => import("./MemoryRoom").then((m) => ({ default: m.MemoryRoom })),
  PastLivesVillage: () => import("./PastLivesVillage").then((m) => ({ default: m.PastLivesVillage })),
  SimulationLab: () => import("./SimulationLab").then((m) => ({ default: m.SimulationLab })),
  LifeWishExplorer: () => import("./LifeWishExplorer").then((m) => ({ default: m.LifeWishExplorer })),
};
const ArchiveManager = lazy(DIALOGS.ArchiveManager);
const CountryExplorer = lazy(DIALOGS.CountryExplorer);
const FilmStudio = lazy(DIALOGS.FilmStudio);
const MemoryRoom = lazy(DIALOGS.MemoryRoom);
const PastLivesVillage = lazy(DIALOGS.PastLivesVillage);
const SimulationLab = lazy(DIALOGS.SimulationLab);
const LifeWishExplorer = lazy(DIALOGS.LifeWishExplorer);
/** Fetched once the page is idle, so a dialog (the film studio above all) opens without a wait. */
function preloadDialogs() {
  const load = () => { for (const loader of Object.values(DIALOGS)) void loader().catch(() => {}); };
  const idle = (window as Window & { requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) idle(load, { timeout: 4000 }); else setTimeout(load, 2500);
}

import {
  Moon,
  Sun,
  Play,
  Pause,
  ChevronRight,
  ChevronDown,
  Download,
  Upload,
  X,
  Music,
  Star,
  ArrowUpRight,
  BookOpen,
  Settings2,
  Check,
  Users,
} from "lucide-react";
import { LOCALES, translator, type Locale } from "../lib/i18n";
import { duoPath } from "../lib/site-url";
import { getDuoEntryCopy } from "../lib/duo-entry-copy";
import {
  getCountries,
  getCountryById,
  countryName,
  countryProbability,
  COUNTRY_TOTALS,
} from "../game/countries";
import {
  DEFAULT_SETTINGS,
  getDailyTheme,
  ALLOCATIONS,
  availableFocuses,
  advanceYear,
  makeChoice,
  setFocus,
  spend,
  invest,
  addReflection,
  lifeTable,
} from "../game/engine";
import {
  readLocalSave,
  writeLocalSave,
  SaveConflict,
} from "../lib/persistence";
import { enableOffline } from "../lib/offline";
import { encodeSave, decodeSave, MAX_PAST_LIVES } from "../game/storage";
import type { Life, Settings, Country, Choice, GameEvent } from "../game/types";
import {
  LifeDetails,
  Budget,
  LifeActions,
  ActualComparison,
} from "./GameDetails";
import { Portrait, Scene, WorldMap, LineChart } from "./Visuals";
import {
  downloadFile,
  saveBirthCard,
  saveStory,
  saveAlbum,
  saveRecordBook,
  saveRecordTable,
} from "../lib/keepsakes";
import { ConsequenceCard, ChapterCard, StatDelta, ChoiceJournal, EndingBar, choiceLabel } from "./GameFeedback";
import { chapterCrossed, describeConsequence, openingTempo, readJournal, recordChoice, type Consequence } from "../lib/game-feedback";
type T = ReturnType<typeof translator>;
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const MONEY_DECISIONS = /^decision\.(apprenticeship|business|children|college|debt|dreamJob|education|job|migration|relocation|returnWork|nightSchool|opportunity|risky|upperSecondary|academicAfterUniversity|academicPhd|studyDestination|studyDomestic|universityRetake|pet|physicalAid|divorce|marriage|militaryRetirement|care|secondWife|schoolWithdrawal\.(money|work))$/;
function Modal({
  title,
  children,
  onClose,
  closeLabel,
  canClose = true,
  backdropCloses = true,
  headerActions,
}: {
  title: string;
  closeLabel: string;
  children: ReactNode;
  onClose: () => void;
  canClose?: boolean;
  /** Decisions ignore stray taps outside the dialog; the close button still sets them aside. */
  backdropCloses?: boolean;
  headerActions?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={headingId}
      onCancel={(event) => { if (!canClose) event.preventDefault(); else onClose(); }}
      onClick={(e) => {
        if (canClose && backdropCloses && e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <span id={headingId}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {headerActions}
          <button className="icon-button" disabled={!canClose} onClick={onClose} aria-label={closeLabel}>
            <X size={20} />
          </button>
        </div>
      </header>
      <div className="modal-body"><Suspense fallback={<p className="modal-loading" aria-busy="true">…</p>}>{children}</Suspense></div>
    </dialog>
  );
}
function Segments<TValue extends string | number>({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: TValue;
  values: [TValue, string][];
  onChange: (v: TValue) => void;
}) {
  return (
    <fieldset className="setting">
      <legend>{label}</legend>
      <div className="segments" role="group" aria-label={label}>
        {values.map(([v, l]) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
          >
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
function CountryPicker({
  value,
  onChange,
  locale,
  t,
}: {
  value?: string;
  onChange: (v: string) => void;
  locale: Locale;
  t: T;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const chosen = value ? getCountryById(value) : undefined;
  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = getCountries();
    if (!q) return all;
    return all.filter((c) =>
      (countryName(c, locale) + c.name_en)
        .toLowerCase()
        .includes(q),
    );
  }, [query, locale]);
  return (
    <div className="country-picker">
      <button
        className="select-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {chosen
          ? `${chosen.flag} ${countryName(chosen, locale)}`
          : t("optional")}
        <ChevronRight size={16} />
      </button>
      {open && (
        <div className="select-popover">
          <input
            autoFocus
            placeholder={t("searchCountry")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
          />
          <div className="country-options" role="listbox">
            <button
              role="option"
              aria-selected={!chosen}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              {t("none")}
            </button>
            {filteredCountries.map((c) => (
                <button
                  role="option"
                  aria-selected={c.id === value}
                  key={c.id}
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  {c.flag} {countryName(c, locale)}
                  {c.id === value && <Check size={15} />}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
export function GameApp({ locale, search = "" }: { locale: Locale; search?: string }) {
  const duoEntry = getDuoEntryCopy(locale);
  const [moneyRegion, setMoneyRegion] = useState<MoneyRegion>(() => defaultMoneyRegion(locale));
  useEffect(() => {
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* Optional browser preference. */ }
    setMoneyRegion(readMoneyRegion(storage, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.languages, locale));
  }, [locale]);
  const selectMoneyRegion = (region: MoneyRegion) => {
    setMoneyRegion(region);
    try { localStorage.setItem(MONEY_PREFERENCE, region); } catch { /* Keep in memory. */ }
  };
  const t = useMemo(() => translator(locale, moneyRegion), [locale, moneyRegion]),
    [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS),
    [life, setLife] = useState<Life | null>(null),
    [past, setPast] = useState<Life[]>([]),
    [view, setView] = useState<"home" | "draw" | "birth" | "game" | "ending">("home");
  const birthAttempt = useRef<{ticket:ReturnType<typeof createBirthTicket<Life>>;settings:Settings;previous:Life|null;selected:boolean}|null>(null);
  const [birthRun,setBirthRun]=useState(0);
  const currentLocation=life?(getCountryById(physicalCountry(life))??life.country):null;
  const paused = life?.playback?.paused ?? false;
  const speed = life?.playback?.speed ?? 1;
  const setPaused = (value: boolean | ((previous: boolean) => boolean)) => {
    setLife(current => current ? setPlayback(current, {
      paused: typeof value === "function" ? value(current.playback?.paused ?? false) : value,
    }) : current);
  };
  const setSpeed = (value: number) => setLife(current => current ? setPlayback(current, { speed: value }) : current);
  const auto = life?.settings.autoChoices ?? settings.autoChoices;
  // Automatic choices belong to the current life only; the next life starts with the player deciding.
  const setAuto = (enabled: boolean) => {
    setSettings(current => (current.autoChoices ? { ...current, autoChoices: false } : current));
    setLife(current => current ? setAutomaticChoices(current, enabled) : current);
  };
  const [autoLean, setAutoLean] = useState<AutoLean>(() => {
    try {
      return (localStorage.getItem("one8b.lean") as AutoLean) || "balanced";
    } catch {
      return "balanced";
    }
  });
  const updateAutoLean = (lean: AutoLean) => {
    setAutoLean(lean);
    try {
      localStorage.setItem("one8b.lean", lean);
    } catch {}
  };
  const [classCode, setClassCode] = useState<string>(() => {
    try {
      return localStorage.getItem("one8b.classCode") || "";
    } catch {
      return "";
    }
  });
  const [unlivedRefresh, setUnlivedRefresh] = useState(0);
  const [speedHintDismissed, setSpeedHintDismissed] = useState(() => typeof window !== "undefined" && !!localStorage.getItem("1in8bn.speedHintSeen"));
  const [consequence, setConsequence] = useState<Consequence | null>(null),
    [chapter, setChapter] = useState<ReturnType<typeof chapterCrossed>>(null),
    [quiet, setQuiet] = useState(false),
    [endingBar, setEndingBar] = useState(false);
  const journal = useMemo(() => (life ? readJournal(life.id) : []), [life?.id, life?.events.length, view]);
  const journalByEvent = useMemo(() => new Map(journal.map((entry) => [entry.eventId, entry])), [journal]);
  const lifeMilestones = useMemo(
    () => (life ? getLifeMilestones(life) : new Map()),
    [life?.events, life?.alive, life?.deathAge, life?.family?.marriageAge, life?.family?.children?.length],
  );
  const shownAge = useRef<number | null>(null), lastDecisionAt = useRef(Date.now()), decisionsMade = useRef(0);
  const [languagesOpen, setLanguagesOpen] = useState(false),
    [floatVisible, setFloatVisible] = useState(false);
  const [ready, setReady] = useState(false),
    [fastForward, setFastForward] = useState(false),
    [reflections, setReflections] = useState(true),
    [modal, setModal] = useState(""),
    [aside, setAside] = useState(false),
    [theme, setTheme] = useState("light"),
    [toast, setToast] = useState(""),
    [music, setMusic] = useState(() => calmMusic.isPlaying()),
    [toolsOpen, setToolsOpen] = useState(false),
    [volume, setVolume] = useState(35),
    [stars, setStars] = useState<string[]>([]),
    [shareMoment, setShareMoment] = useState(""),
    [phoneTab, setPhoneTab] = useState<PhoneTab>("life"),
    [selected, setSelected] = useState<Life | null>(null),
    [reflection, setReflection] = useState(""),
    [busy, setBusy] = useState(false),
    [onlyStarred, setOnlyStarred] = useState(false),
    [clock, setClock] = useState(0);
  const [fxExpanded, setFxExpanded] = useState<string[]>([]);
  const [saveEnabled, setSaveEnabled] = useState(false),
    [recovery, setRecovery] = useState<string | null>(null);
  const [archiveDeleting, setArchiveDeleting] = useState(false);
  const archiveWrite = useRef(false);
  const removeArchive = async (ids: readonly string[]) => {
    if (!ready || !saveEnabled || archiveWrite.current) throw new Error("Archive is not writable");
    archiveWrite.current = true;
    setArchiveDeleting(true);
    try {
      const next = planArchiveRemoval(life, past, ids);
      await writeLocalSave(encodeSave(next.life, next.past), next.metadata);
      setLife(next.life);
      setPast(next.past);
      setSelected(null);
    } catch (error) {
      if (error instanceof SaveConflict) { setSaveEnabled(false); setPaused(true); }
      throw error;
    } finally {
      archiveWrite.current = false;
      setArchiveDeleting(false);
    }
  };
  useEffect(() => { if (ready) preloadDialogs(); }, [ready]);
  // Fixed overlays (choice results, chapter cards) sit just below the sticky game header, whose
  // height changes with its rows (tools open, long names), so it is measured rather than assumed.
  const gameHeaderRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = gameHeaderRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const set = () => document.documentElement.style.setProperty("--game-header-h", `${Math.round(el.getBoundingClientRect().height)}px`);
    set();
    const observer = new ResizeObserver(set);
    observer.observe(el);
    return () => observer.disconnect();
  }, [view, life?.id]);
  // Phones show one part of a living life at a time, chosen from a bottom tab bar.
  const phoneTabsOn = view === "game" && !!life?.alive;
  // The life record is the story players follow; when it is off screen (another tab, or scrolled
  // past) a one-line strip above the tabs shows its newest entry.
  const recordRef = useRef<HTMLElement | null>(null);
  const [recordInView, setRecordInView] = useState(true);
  useEffect(() => {
    const node = recordRef.current;
    if (!phoneTabsOn || !node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setRecordInView(entry.isIntersecting), { rootMargin: "0px 0px -80px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [phoneTabsOn, phoneTab, life?.id]);
  const latestEvent = life?.events[life.events.length - 1];
  const recordStripOn = phoneTabsOn && !recordInView && !!latestEvent;
  useEffect(() => {
    document.documentElement.classList.toggle("record-strip-on", recordStripOn);
    return () => document.documentElement.classList.remove("record-strip-on");
  }, [recordStripOn]);
  useEffect(() => { setPhoneTab("life"); }, [life?.id]);
  useEffect(() => {
    document.documentElement.classList.toggle("phone-tabs-on", phoneTabsOn);
    return () => document.documentElement.classList.remove("phone-tabs-on");
  }, [phoneTabsOn]);
  // A moment chosen from the record preselects only the share card it opened.
  useEffect(() => { if (modal !== "shareCard") setShareMoment(""); }, [modal]);
  const openedAt = useRef(0);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  useEffect(() => {
    calmMusic.setVolume(volume / 100);
  }, [volume]);
  useEffect(() => {
    void enableOffline().catch(() => {});
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);
  const previousPlaybackLife = useRef<Life | null>(null);
  useEffect(() => {
    const previous = previousPlaybackLife.current;
    previousPlaybackLife.current = life;
    if (fastForward && (view !== "game" || !!modal || !life || (previous && stopsFastForward(previous, life))))
      setFastForward(false);
  }, [life, view, modal, fastForward]);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void (async () => {
      try {
        const raw = await readLocalSave();
        setRecovery(raw);
        if (raw) {
          const saved = decodeSave(raw);
          setLife(saved.life);
          setPast(saved.past);
          if (saved.life) setSettings(saved.life.settings);
          const previousView = readSessionPreference("1in8bn-view");
          if (
            saved.life &&
            !readBirthInvitation(window.location.search) &&
            !readLifeInvitation(window.location.search) &&
            ["birth", "game", "ending"].includes(previousView ?? "")
          )
            setView(
              saved.life.alive
                ? previousView === "birth"
                  ? "birth"
                  : "game"
                : "ending",
            );
        }
        // Optional preferences must not disable a successfully restored game save.
        try {
          setTheme(localStorage.getItem("1in8bn-theme") || "light");
          const savedStars=JSON.parse(localStorage.getItem("1in8bn-stars")||"[]");
          setStars(Array.isArray(savedStars)?savedStars.filter((id):id is string=>typeof id==="string").slice(0,10000):[]);
        } catch { /* Keep default preferences when storage is denied or malformed. */ }
        setSaveEnabled(true);
        setRecovery(null);
      } catch {
        setToast(t("importError"));
      }
      setReady(true);
    })();
    openedAt.current = Date.now();
    setClock(Date.now());
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        if(view !== "draw") sessionStorage.setItem("1in8bn-view", view);
        else if(birthAttempt.current?.selected) sessionStorage.setItem("1in8bn-view", "birth");
      } catch {}
  }, [ready, view, life?.id]);
  useEffect(() => {
    if (!ready || !saveEnabled) return;
    try {
      void writeLocalSave(encodeSave(life, past)).catch((error) => {
        if (error instanceof SaveConflict) {
          setSaveEnabled(false);
          setPaused(true);
          setToast(t("ui.saveConflict"));
        } else setToast(t("storageError"));
      });
    } catch {
      setToast(t("storageError"));
    }
  }, [life, past, ready, saveEnabled]);
  useEffect(() => {
    if (!life || view !== "game" || paused || modal || !life.alive) return;
    let lastTick = performance.now();
    const id = setInterval(
      () => {
        const now = performance.now();
        const elapsed = playbackElapsed(now - lastTick, life.settings.duration, speed, fastForward);
        lastTick = now;
        if (document.hidden) return;
        setLife((l) => {
          if (!l) return l;
          if (l.pendingDecision) {
            if (
              auto ||
              (!reflections && l.pendingDecision.type === "reflection")
            )
              return l.pendingDecision.type === "reflection"
                ? addReflection(l, "")
                : makeChoice(l, l.pendingDecision.choices[0]?.id ?? "skip");
            return l;
          }
          return advanceYear(l, elapsed * openingTempo(l, fastForward));
        });
      },
      250,
    );
    return () => clearInterval(id);
  }, [
    view,
    paused,
    speed,
    fastForward,
    auto,
    modal,
    life?.alive,
    life?.settings.duration,
    reflections,
  ]);
  useEffect(() => {
    if (life && !life.alive && view === "game") {

      setView("ending");
      setModal("lastMoments");
      if (life.age < 5) {
        addUnlivedLife({
          name: life.name,
          country: (life.migration?.birthCountry ?? life.country).id,
          age: life.age,
          kind: 'early_loss',
        });
        setUnlivedRefresh((r) => r + 1);
      }
      setPast((p) =>
        [life, ...p.filter((l) => l.id !== life.id)].slice(0, MAX_PAST_LIVES),
      );
    }
  }, [life, view]);
  useEffect(() => {
    if (view !== "game" || !life?.pendingDecision) return;
    if (auto || (!reflections && life.pendingDecision.type === "reflection")) {
      setLife((current) =>
        current?.pendingDecision
          ? current.pendingDecision.type === "reflection"
            ? addReflection(current, "")
            : makeChoice(
                current,
                selectAutoChoice(current.pendingDecision, autoLean),
              )
          : current,
      );
    }
  }, [view, life?.pendingDecision?.id, auto, reflections, autoLean]);
  // One player for the home page, the game header and scenes, so every music button shows its real state.
  useEffect(() => calmMusic.subscribe(setMusic), []);
  useEffect(() => {
    if (life?.age !== undefined) {
      calmMusic.setStage(life.age);
    }
  }, [life?.age]);
  // Turning points get a short musical cue; a year with several plays the weightiest one.
  // Tracked by the last event seen, not the count: the record is capped, so long lives stop growing.
  const cuedEvents = useRef<{ life: string; last: string }>({ life: "", last: "" });
  const lastEventId = life?.events[life.events.length - 1]?.id ?? "";
  useEffect(() => {
    if (!life) return;
    const seen = cuedEvents.current;
    cuedEvents.current = { life: life.id, last: lastEventId };
    if (seen.life !== life.id || seen.last === lastEventId) return;
    let from = life.events.length - 1;
    while (from >= 0 && life.events[from].id !== seen.last) from--;
    if (from < 0) return;
    const order: LifeCue[] = ["loss", "wedding", "birth", "milestone"];
    const cues = life.events.slice(from + 1).map((e) => lifeCueFor(e.key)).filter((c): c is LifeCue => !!c);
    const cue = order.find((c) => cues.includes(c));
    if (cue) calmMusic.cue(cue);
  }, [life?.id, lastEventId]);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("1in8bn-theme", next);
    } catch {}
  };
  const begin = () => {
    if(birthAttempt.current)return;

    const snapshot={...settings};
    birthAttempt.current={ticket:createBirthTicket(()=>createNewGame(snapshot)),settings:snapshot,previous:life,selected:false};
    setBirthRun(run=>run+1);
    setView("draw");
    window.scrollTo(0,0);
  };
  const selectBirth = () => {
    const attempt=birthAttempt.current;
    if(!attempt)throw Error("No birth in progress");
    const born=attempt.ticket.select();
    if(!attempt.selected){
      attempt.selected=true;
      setSaveEnabled(true);setRecovery(null);
      if(attempt.previous){
        if(attempt.previous.alive && attempt.previous.age > 0){
          addUnlivedLife({
            name: attempt.previous.name,
            country: (attempt.previous.migration?.birthCountry ?? attempt.previous.country).id,
            age: attempt.previous.age,
            kind: 'abandoned',
          });
          setUnlivedRefresh(r => r + 1);
        }
        setPast(p=>[attempt.previous!,...p.filter(x=>x.id!==attempt.previous!.id)].slice(0,MAX_PAST_LIVES));
      }

      setLife(setPlayback(setAutomaticChoices(born,false),{paused:false,speed}));
      setPaused(false);setAside(false);setReflection("");
    }
    return born.country;
  };
  const enterBirth = () => {birthAttempt.current=null;setView("birth");window.scrollTo(0,0);};
  // Starting over archives the life in progress, so a returning player confirms it first.
  const beginFresh = () => {
    if (life?.alive && !window.confirm(t("confirmNew"))) return;
    begin();
  };
  const resume = () => {
    if (!life?.alive) return;

    lastDecisionAt.current = Date.now();
    if (life.alive) setView(life.age === 0 ? "birth" : "game");
  };
  // The floating call to action only appears while no other start button is on screen.
  useEffect(() => {
    if (view !== "home" || typeof IntersectionObserver === "undefined") return;
    const targets = [...document.querySelectorAll(".home-mode-actions, .hero-actions, .setup-launch, footer")];
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target);
      setFloatVisible(visible.size === 0);
    });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [view, ready]);
  /** Applies a decision and shows the player what it changed. */
  const choose = (choice: Choice) => {
    if (!life?.pendingDecision) return;
    const before = life, after = makeChoice(life, choice.id);
    setConsequence(describeConsequence(before, after, choice));
    recordChoice(before, after, choice);
    decisionsMade.current++;
    lastDecisionAt.current = Date.now();

    change((l) => (l === before ? after : makeChoice(l, choice.id)));
  };
  // Chapter cards and quiet-stretch hints follow the life's age while it is being played.
  useEffect(() => {
    if (!life || view !== "game") { shownAge.current = life?.age ?? null; return; }
    const previous = shownAge.current;
    shownAge.current = life.age;
    if (previous === null) return;
    const crossed = chapterCrossed(previous, life.age);
    if (crossed) { setChapter(crossed);  }
  }, [life?.age, view]);
  useEffect(() => {
    if (life?.pendingDecision) lastDecisionAt.current = Date.now();
  }, [life?.pendingDecision?.id]);
  useEffect(() => {
    if (view !== "game") { setQuiet(false); return; }
    // Before the first choice the hint comes early: a quarter of starters left during the
    // ~30 s wait for it, and the usual 45 s threshold never fired in that window.
    const timer = setInterval(() => setQuiet(Date.now() - lastDecisionAt.current > (decisionsMade.current === 0 ? 9000 : 45000)), 3000);
    return () => clearInterval(timer);
  }, [view]);
  useEffect(() => {
    if (view !== "ending" || typeof IntersectionObserver === "undefined") { setEndingBar(false); return; }
    const target = document.querySelector(".ending-actions");
    if (!target) return;
    // The record's own sticky action bar (#deadFoot) offers the same actions; never stack both.
    const foot = document.querySelector("#deadFoot");
    let actionsBelow = false, footVisible = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === target) actionsBelow = !entry.isIntersecting && entry.boundingClientRect.top > 0;
        else footVisible = entry.isIntersecting;
      }
      setEndingBar(actionsBelow && !footVisible);
    });
    observer.observe(target);
    if (foot) observer.observe(foot);
    return () => observer.disconnect();
  }, [view, life?.id]);
  // Phones share the finished life's card straight from the record, without the share dialog.
  const quickShare = useRef<QuickShare | null>(null);
  useEffect(() => {
    quickShare.current = null;
    if (view !== "ending" || !life || life.alive || typeof navigator === "undefined" || !navigator.share) return;
    let active = true;
    const timer = setTimeout(() => { void prepareQuickShare(life, locale, t).then((ready) => { if (active) quickShare.current = ready; }).catch(() => {}); }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [view, life, locale, t]);
  const shareLife = (from: string) => {
    if (!life) return;
    if (typeof navigator === "undefined" || !navigator.share) {
      setSelected(life);
      setModal("shareCard");
      return;
    }
    const country = life.migration?.birthCountry ?? life.country;
    const defaultUrl = lifeShareUrl(birthInvitationUrl(locale, country.id), life);
    const defaultTitle = life.name || "1in8bn";
    const defaultText = lifePost(life, locale, t);

    const inviter = from === "reply" ? readInviter() : null;
    const inviterName = inviter?.name?.trim();
    const replyPrefix = inviterName ? fillViral(viralCopy(locale).replyTitle, { name: inviterName }) : "";

    const ready = quickShare.current;
    const isCached = ready?.lifeId === life.id && ready.locale === locale;
    const file = isCached ? ready.file : null;
    const title = isCached ? ready.title : defaultTitle;
    const baseText = isCached ? ready.text : defaultText;
    const text = (from === "reply" && replyPrefix && !baseText.includes(replyPrefix)) ? `${replyPrefix}\n${baseText}` : baseText;
    const url = isCached ? ready.url : defaultUrl;

    if (file) {
      void shareImageAction(navigator, file, { title, text, url }).then(async (result) => {

        if (result === "unsupported" || result === "unavailable") {
          const link = await shareLinkAction(navigator, { title, text, url });

          if (link !== "shared" && link !== "cancelled") { setSelected(life); setModal("shareCard"); }
        } else if (result !== "cancelled" && result !== "shared") {
          setSelected(life); setModal("shareCard");
        }
      });
    } else {
      void shareLinkAction(navigator, { title, text, url }).then((link) => {

        if (link !== "shared" && link !== "cancelled") {
          setSelected(life);
          setModal("shareCard");
        }
      });
    }
  };
  // Moments share in one tap too: the newest peak is prepared ahead, others are drawn on the tap
  // (well inside the gesture's activation); without file sharing the share dialog opens as before.
  const momentShares = useRef(new Map<string, QuickShare>());
  const newestPeak = life ? [...life.events].reverse().find((e) => isPeakMoment(life, e)) : undefined;
  useEffect(() => { momentShares.current.clear(); }, [life?.id, locale]);
  useEffect(() => {
    if (!life || !newestPeak || typeof navigator === "undefined" || !navigator.share || momentShares.current.has(newestPeak.id)) return;
    let active = true;
    const timer = setTimeout(() => { void prepareMomentShare(life, newestPeak, locale, t).then((ready) => { if (active && ready) momentShares.current.set(newestPeak.id, ready); }).catch(() => {}); }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [life?.id, newestPeak?.id, locale, t]);
  const shareMomentNow = (event: GameEvent) => {
    if (!life) return;

    const openDialog = () => { setShareMoment(event.id); setSelected(life); setModal("shareCard"); };
    if (typeof navigator === "undefined" || !navigator.share) { openDialog(); return; }

    const country = life.migration?.birthCountry ?? life.country;
    const defaultUrl = lifeShareUrl(birthInvitationUrl(locale, country.id), life);
    const defaultTitle = life.name || "1in8bn";
    const defaultText = momentPost(life, event, locale, t);

    const send = (ready: QuickShare | null) => {
      const file = ready?.file ?? null;
      const title = ready?.title ?? defaultTitle;
      const text = ready?.text ?? defaultText;
      const url = ready?.url ?? defaultUrl;

      if (file) {
        void shareImageAction(navigator, file, { title, text, url }).then(async (result) => {

          if (result === "unsupported" || result === "unavailable") {
            const link = await shareLinkAction(navigator, { title, text, url });

            if (link !== "shared" && link !== "cancelled") openDialog();
          } else if (result !== "cancelled" && result !== "shared") {
            openDialog();
          }
        });
      } else {
        void shareLinkAction(navigator, { title, text, url }).then((link) => {

          if (link !== "shared" && link !== "cancelled") {
            openDialog();
          }
        });
      }
    };
    const cached = momentShares.current.get(event.id);
    if (cached && cached.locale === locale) send(cached);
    else void prepareMomentShare(life, event, locale, t).then((ready) => { if (ready) momentShares.current.set(event.id, ready); send(ready); }).catch(() => send(null));
  };
  const bornAgain = () => {

    begin();
  };
  const jump = () => {
    if (!life?.alive || life.pendingDecision) return;

    setFastForward((active) => !active);
    setPaused(false);
    setAside(false);
  };
  const selectSpeed = (value: number) => {
    setSpeed(value);
    setFastForward(false);
    setPaused(false);
    if (value > 1 && !speedHintDismissed) {
      try { localStorage.setItem("1in8bn.speedHintSeen", "1"); } catch {}
      setSpeedHintDismissed(true);
    }
  };
  const change = (fn: (l: Life) => Life) => setLife((l) => (l ? fn(l) : l));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const node = e.target as HTMLElement;
      if (
        node.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(node.tagName) ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      // The archive transaction owns the current life until it commits or fails.
      // In particular, '?' must not replace the locked dialog and reopen play.
      if (archiveWrite.current) return;
      if (e.key === "?") {
        e.preventDefault();
        setModal((m) => (m === "shortcuts" ? "" : "shortcuts"));
        return;
      }
      if (modal || view === "draw") return;
      if (view === "game" && life?.pendingDecision && !aside) {
        const n = Number(e.key);
        const choice = life.pendingDecision.choices[n - 1];
        if (choice && life.pendingDecision.type === "choice") {
          e.preventDefault();
          choose(choice);
        }
        return;
      }
      if (view === "game") {
        if (e.code === "Space") {
          e.preventDefault();
          setPaused((p) => !p);
        }
        if (["1", "2", "4", "8"].includes(e.key)) selectSpeed(Number(e.key));
        if (e.key.toLowerCase() === "n") jump();
        if (e.key.toLowerCase() === "m") calmMusic.toggle();
      }
      if (e.key.toLowerCase() === "i") setView("home");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, view, life, aside]);
  const favorite = (id: string) =>
    setStars((s) => {
      const v = s.includes(id) ? s.filter((x) => x !== id) : [...s, id];
      try {
        localStorage.setItem("1in8bn-stars", JSON.stringify(v));
      } catch {}
      return v;
    });
  const keep = async (kind: string, record = selected ?? life) => {
    if (!record) return;

    setBusy(true);
    try {
      if (kind === "certificate") await saveBirthCard(record, locale, t);
      if (kind === "story") saveStory(record, locale, t);
      if (kind === "album")
        saveAlbum(
          record,
          locale,
          t,
          onlyStarred
            ? stars.filter((id) => record.events.some((e) => e.id === id))
            : [],
        );
      if (kind === "film") setModal("filmStudio");
      if (kind === "recordBook") saveRecordBook(record, locale, t);
      if (kind === "csv") saveRecordTable(record, t, locale);
    } catch {
      setToast(t("error"));
    } finally {
      setBusy(false);
    }
  };
  const currentLanguage = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];
  const languageBar = (
    <nav
      className="languages"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setLanguagesOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setLanguagesOpen(false);
          event.currentTarget.querySelector<HTMLButtonElement>(".language-toggle")?.focus();
        }
      }}
      aria-label={t("language")}
    >
      <button
        type="button"
        className="language-toggle"
        aria-expanded={languagesOpen}
        aria-controls="header-languages"
        onClick={() => setLanguagesOpen((open) => !open)}
      >
        <LocaleFlag locale={locale}/>
        <span lang={currentLanguage.html}>{currentLanguage.label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      <div id="header-languages" className="language-options" hidden={!languagesOpen}>
      {LOCALES.map((l) => (
        <a
          key={l.code}
          href={localePath(l.code)}
          onClick={async (e) => {
            if (!saveEnabled) return;
            e.preventDefault();
            try {
              await writeLocalSave(encodeSave(life, past));
              window.location.assign(localePath(l.code));
            } catch {
              setToast(t("storageError"));
            }
          }}
          lang={l.html}
          aria-current={locale === l.code ? "page" : undefined}
        >
          <LocaleFlag locale={l.code}/><span>{l.label}</span><span className="locale-check" aria-hidden="true">{locale===l.code?"✓":""}</span>
        </a>
      ))}
      </div>
      <button
        className="icon-button"
        onClick={toggleTheme}
        aria-label={t("theme")}
      >
        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </nav>
  );
  const foot = (
    <footer>
      <nav className="footer-languages" aria-label={t("language")}>
      {LOCALES.map((l) => (
        <a
          key={l.code}
          href={localePath(l.code)}
          onClick={async (e) => {
            if (!saveEnabled) return;
            e.preventDefault();
            try {
              await writeLocalSave(encodeSave(life, past));
              window.location.assign(localePath(l.code));
            } catch {
              setToast(t("storageError"));
            }
          }}
          lang={l.html}
          aria-current={locale === l.code ? "page" : undefined}
        >
          {l.label}
        </a>
      ))}
      </nav>
      <button onClick={() => setModal("currency")}>{t("ui.amountsIn")}: {moneyPlaceName(moneyRegion, locale)} · {MONEY_REGIONS[moneyRegion].currency}</button>
      <div>
        <a href="/THIRD_PARTY_NOTICES.txt">{t("feature.license")}</a>

        <DuoFooterLink locale={locale} />
        <button onClick={() => setModal("transfer")}>{t("transfer")}</button>
        <button onClick={() => setModal("shortcuts")}>
          {t("ui.shortcuts")}
        </button>
        {isStonesHidden() && (
          <button
            type="button"
            onClick={() => {
              setStonesHidden(false);
              setUnlivedRefresh((r) => r + 1);
            }}
          >
            {t("unlived.show")}
          </button>
        )}
        <button
          onClick={async () => {
            if (installPrompt) {
              await installPrompt.prompt();
              await installPrompt.userChoice;
              setInstallPrompt(null);
            } else setModal("install");
          }}
        >
          {t("install")}
        </button>
      </div>
      <small>1in8bn.com · {t("keepsakesFree")}</small>
    </footer>
  );
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            if (f.size > 10_000_000) throw Error();
            const data = importBackup(await f.text());
            await writeLocalSave(encodeSave(data.life,data.past),data.metadata);
            setLife(data.life);
            setPast(data.past);
            if (data.life) setSettings(data.life.settings);
            setSaveEnabled(true);
            setRecovery(null);
            setView("home");
            setModal("");
            setToast(t("imported"));
          } catch(error) {
            if(error instanceof SaveConflict){setSaveEnabled(false);setPaused(true);setToast(t("ui.saveConflict"));}
            else setToast(t("importError"));
          }
          e.target.value = "";
        }}
      />
      {view === "home" ? (
        <>
          <SiteHeader locale={locale} controls={languageBar} onHome={()=>{setView("home");window.scrollTo(0,0);}}/>
          <main className="wrap home">
            <BirthInvitation locale={locale} onBegin={beginFresh} disabled={!ready} search={search}/>
            <section className="hero">
              <div>
                <p className="eyebrow">
                  {t("version")} <span>·</span> {t("free")}
                </p>
                <h1 className={locale === "en" ? "" : "localized-title"}>
                  {locale === "en" ? (
                    <>
                      <em>1</em> in 8<br />
                      Billion
                    </>
                  ) : (
                    t("title")
                      .split("1")
                      .map((part, i) => (
                        <span key={i}>
                          {i > 0 && <em>1</em>}
                          {part}
                        </span>
                      ))
                  )}
                </h1>
                <p className="intro">{t("intro")}</p>
                <div className="home-mode-actions">
                  <a className="duo-entry button" href={duoPath(locale)}
                    >
                    <Users size={22} className="duo-entry-icon" aria-hidden="true" />
                    <span className="duo-entry-main">
                      <strong>{duoEntry.footerLabel}</strong>
                      <small>{duoEntry.label}</small>
                    </span>
                    <ChevronRight size={20} aria-hidden="true" />
                  </a>
                  {life?.alive && <button className="hero-resume-btn" onClick={resume}>
                    <span className="hero-resume-text">
                      <b>{t("resume")}</b>
                      <span className="hero-resume-name">{life.name}, {life.age}</span>
                    </span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>}
                  <div className="hero-secondary-row">
                    <button className="solo-entry" disabled={!ready} onClick={beginFresh}>
                      <span>{duoEntry.soloLabel}</span>
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                    <CalmMusicButton t={t} />
                  </div>
                </div>
                <p className="daily-theme tdband" id="tdBand">
                  <b>{t("ui.dailyTheme")}</b>{" "}
                  <span className="tdt">{t(`theme.${getDailyTheme().id}`)}</span>{" "}
                  <span className="td-note">{t("ui.dailyThemeDesc")}</span>
                </p>

              </div>
            <section className="setup panel hero-setup" id="setup">
              <div>
                <h2>{t("settings")}</h2>
                <p className="muted">{t("eraHelp")}</p>
              </div>
              <div className="setup-controls">
                <Segments
                  label={t("era")}
                  value={settings.era}
                  values={(["past", "today", "future", "random"] as const).map(
                    (x) => [x, t(x)],
                  )}
                  onChange={(era) => setSettings((s) => ({ ...s, era }))}
                />
                <Segments
                  label={t("weight")}
                  value={settings.weightMode}
                  values={["births", "population"].map((x) => [
                    x as Settings["weightMode"],
                    t(`${x}Weight`),
                  ])}
                  onChange={(weightMode) =>
                    setSettings((s) => ({ ...s, weightMode }))
                  }
                />
                <Segments
                  label={t("duration")}
                  value={settings.duration}
                  values={([30, 60, 90] as const).map((n) => [
                    n,
                    t("minutes", { n }),
                  ])}
                  onChange={(duration) =>
                    setSettings((s) => ({ ...s, duration }))
                  }
                />
                {/* Amounts follow the player's own place, so the choice sits with the main setup, not under more controls. */}
                <div className="setting setting-money">
                  <label htmlFor="curSel">{t("ui.amountsIn")}</label>
                  <MoneyRegionSelect id="curSel" value={moneyRegion} onChange={selectMoneyRegion} locale={locale} label={t("ui.amountsIn")} />
                </div>
                <details className="setup-more" >
                  <summary>{t("feel.moreControls")}<ChevronDown size={16} aria-hidden="true"/></summary>
                  <div className="setup-more-body">
                <div className="setting">
                  <label>{t("realCountry")}</label>
                  <CountryPicker
                    value={settings.realCountry}
                    onChange={(realCountry) =>
                      setSettings((s) => ({ ...s, realCountry }))
                    }
                    locale={locale}
                    t={t}
                  />
                </div>
                <div className="toggles">
                  {(["gentler", "classroom"] as const).map((k) => (
                    <label key={k} className="switch-row">
                      <input
                        type="checkbox"
                        checked={settings[k]}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, [k]: e.target.checked }))
                        }
                      />
                      <span className="switch" />
                      <span>
                        <b>{t(k === "gentler" ? "gentle" : k)}</b>
                        <small>
                          {t(k === "gentler" ? "gentleHelp" : "classroomHelp")}
                        </small>
                      </span>
                    </label>
                  ))}
                  {settings.classroom && (
                    <div className="optgroup" id="classGrp">
                      <label className="lbl" htmlFor="classCode">
                        {t("ui.classCodeLabel")}
                      </label>
                      <input
                        id="classCode"
                        className="sel classcode"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder={t("ui.classCodePlaceholder")}
                        value={classCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                          setClassCode(val);
                          try {
                            localStorage.setItem("one8b.classCode", val);
                          } catch {}
                        }}
                      />
                      <span className="hint">{t("ui.classCodeHint")}</span>
                      <button
                        type="button"
                        className="ghost sm"
                        id="labOpen"
                        onClick={() => setModal("lab")}
                        style={{ marginTop: "6px", alignSelf: "flex-start" }}
                      >
                        {t("ui.labOpen")}
                      </button>
                    </div>
                  )}
                </div>
                  </div>
                </details>
              </div>
              <div className="setup-launch">
                <button className="primary large" disabled={!ready} onClick={beginFresh}>
                  {t(life?.alive ? "again" : "born")}<ChevronRight size={20}/>
                </button>
                <details className="play-guidance">
                  <summary>{t("ui.rateNoteAge")} · {t("ui.rateNoteThemes")}<ChevronDown size={14}/></summary>
                  <RateNote t={t}/>
                  <p className="muted">{t("warning")}</p>
                </details>
              </div>
            </section>

            </section>
            <section className="how">
              <p className="eyebrow">{t("how")}</p>
              <div className="three-cards">
                {[1, 2, 3].map((n) => (
                  <article key={n}>
                    <span>0{n}</span>
                    <h3>{t(`how${n}`)}</h3>
                    <p>{t(`how${n}Text`)}</p>
                  </article>
                ))}
              </div>
            </section>
            {past.length > 0 && <section className="past-section">
              <div className="section-heading">
                <h2>{t("pastLives")}</h2>
                {!life?.settings.classroom && past.filter(l=>!l.alive&&!l.settings.classroom).length>=2&&<button className="archive-compare" type="button" onClick={()=>{setSelected(past.find(l=>!l.alive&&!l.settings.classroom)!);setModal("compareLives");}}><Share2 size={15}/>{collectionCopy(locale).comparison}</button>}
                <details className="archive-tools">
                  <summary>{archiveCopy[locale].title}<ChevronDown size={15}/></summary>
                  <div className="archive-tools-menu">
                    <button type="button" onClick={() => setModal("shelf")}>{t("ui.pastShelfTitle")}</button>
                <button
                  type="button"
                  id="shfVlg"
                  className="ghost sm"
                  disabled={!past.length}
                  onClick={() => setModal("village")}
                  title={t("ui.villageDesc")}
                >
                  {t("ui.seeAsVillage")}
                </button>
                <button
                  type="button"
                  id="shfWish"
                  className="ghost sm"
                  disabled={!past.length}
                  onClick={() => setModal("wish")}
                  title={t("ui.wishDesc")}
                >
                  {t("ui.seeAsWish")}
                </button>
                <button disabled={!ready || !saveEnabled || !past.length} onClick={() => setModal("archive")}>
                  {archiveCopy[locale].title}
                </button>
                <button onClick={() => setModal("transfer")}>
                  <Upload size={15} />
                  {t("transfer")}
                </button>
                  </div>
                </details>
              </div>
              {past.length > 0 && (() => {
                const born = past.filter((l) => !l.alive).map((l) => (l.migration?.birthCountry ?? l.country).id);
                if (!born.length) return null;
                const counts = [...born.reduce((m, id) => m.set(id, (m.get(id) ?? 0) + 1), new Map<string, number>())].map(([country, count]) => ({ country, count }));
                return (
                  <details className="personal-atlas"><summary>{t("feel.atlasTitle")}<ChevronDown size={15}/></summary><div className="life-atlas">
                    <WorldMap players={counts} />
                    <div>
                      <h3>{t("feel.atlasTitle")}</h3>
                      <p>{t("feel.atlasCount", { n: counts.length, lives: born.length, years: past.filter((l) => !l.alive).reduce((sum, l) => sum + l.age, 0).toLocaleString(locale) })}</p>
                    </div>
                  </div></details>
                );
              })()}
              {past.length ? (
                <div className="life-shelf">
                  {past.map((l) => (
                    <button
                      className="life-book"
                      key={l.id}
                      onClick={() => {
                        setSelected(l);
                        setModal("keepsakes");
                      }}
                    >
                      <Portrait seed={l.seed} age={l.age} sex={l.sex} />
                      <strong>{l.name}</strong>
                      <span>
                        {l.birthYear} — {l.year}
                      </span>
                      <small>
                        {countryName(l.country, locale)}
                        {!l.alive && ` · ${t("years", { n: l.age })}`}
                      </small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <BookOpen size={28} />
                  <p>{t("emptyLives")}</p>
                </div>
              )}
            </section>}
            {!past.length && <div className="save-transfer"><button onClick={() => setModal("transfer")}><Upload size={15}/>{t("transfer")}</button></div>}

            <section className="world-explore" aria-labelledby="world-heading">
              <header className="world-heading"><h2 id="world-heading">{t("world")}</h2><span>{t("statistics")} · 172</span></header>

              <div className="world-context">
                <div className="world-counts">
                  <div>
                    <span>{t("ui.birthsSince")}</span>
                    <strong>
                      {clock
                        ? Math.floor(
                            (((clock - openedAt.current) / 86400000) *
                              COUNTRY_TOTALS.births) /
                              365,
                          ).toLocaleString(locale)
                        : "—"}
                    </strong>
                  </div>
                  <div>
                    <span>{t("ui.deathsSince")}</span>
                    <strong>
                      {clock
                        ? Math.floor(
                            ((clock - openedAt.current) / 86400000) * 170000,
                          ).toLocaleString(locale)
                        : "—"}
                    </strong>
                  </div>
                </div>
                <small className="muted">{t("estimates")}</small>
              </div>
              <div className="hero-world">
                <WorldMap />
                <div className="identity-portraits" aria-hidden="true"><span><Portrait seed={17} age={8} sex="F"/></span><span><Portrait seed={82} age={29} sex="M"/></span><span><Portrait seed={35} age={72} sex="F"/></span></div>
                <div className="world-card">
                <div className="world-caption">
                  <span className="live-dot" />
                  <strong>{t("world")}</strong>
                  <p>{t("worldNote")}</p>
                </div>
                <div className="birth-distribution">
                  {getCountries()
                    .sort((a, b) => b.births - a.births)
                    .slice(0, 9)
                    .map((c) => (
                      <div key={c.id}>
                        <span>
                          {c.flag} {countryName(c, locale)}
                        </span>
                        <div>
                          <i
                            style={{
                              width: `${countryProbability(c, "births") * 350}%`,
                            }}
                          />
                        </div>
                        <b>
                          {(countryProbability(c, "births") * 100).toFixed(1)}%
                        </b>
                      </div>
                    ))}
                  <button
                    className="country-all"
                    onClick={() => setModal("countries")}
                  >
                    {t("statistics")} · 172 <ChevronRight size={14} />
                  </button>
                </div>
                </div>
              </div>
            </section>

          </main>
          <button
            className="primary home-float"
            data-visible={floatVisible ? "true" : undefined}
            aria-hidden={!floatVisible}
            tabIndex={floatVisible ? 0 : -1}
            onClick={life?.alive ? resume : () => {
              const setup = document.querySelector("#setup");
              setup?.querySelector<HTMLButtonElement>("button")?.focus({preventScroll:true});
              setup?.scrollIntoView({behavior:"smooth"});
            }}
            disabled={!ready}
          >
            {life?.alive ? t("resume") : t("settings")} <ChevronRight size={18} />
          </button>
          {foot}
        </>
      ) : null}
      {view === "draw" && birthAttempt.current && <BirthDraw key={birthRun} locale={locale} weight={birthAttempt.current.settings.weightMode} onSelect={selectBirth} onDone={enterBirth}/>}
      {view === "birth" && life && (
        <>
          <SiteHeader locale={locale} controls={languageBar} onHome={()=>{setView("home");window.scrollTo(0,0);}}/>
          <main className="birth-page wrap">
            <section className="birth-paper birth-paper--reveal" key={life.id}>
              <div className="certificate-top">
                <span>{t("birthRegistration")} <b className="certificate-domain">1in8bn.com</b></span>
                <span>{t("feature.certificateNumber",{n:life.certificate})}</span>
              </div>
              <div className="certificate-heading">
                <Portrait seed={life.seed} age={0} sex={life.sex} />
                <p className="eyebrow">
                  {t("bornIn", {
                    country: countryName(
                      life.migration?.birthCountry ?? life.country,
                      locale,
                    ),
                  })}
                </p>
                <h1>{life.name}</h1>
                <p>
                  {t("bornOn", { year: life.birthYear })} ·{" "}
                  {(life.migration?.birthCountry ?? life.country).flag}
                </p>
              </div>
              <div className="actions birth-actions">
                <button
                  className="primary large"
                  onClick={() => {
                    lastDecisionAt.current = Date.now();
                    decisionsMade.current = 0;

                    setView("game");
                  }}
                >
                  {t("begin")}
                  <ChevronRight size={20} />
                </button>
              </div>
              <p className="birth-share-hint">{birthCopy(locale).challenge} <span>1in8bn.com</span></p>
              <LifeShareStrip life={life} locale={locale} t={t} onOpenCard={()=>{setSelected(life);setModal("shareCard");}}/>
              <div className="birth-details">
                {[
                  ["sex", t(life.sex === "M" ? "male" : "female")],
                  [
                    "country",
                    countryName(
                      life.migration?.birthCountry ?? life.country,
                      locale,
                    ),
                  ],
                  ["place", t(life.stats.birthPlaceType)],
                  ["familyBackground", `${life.stats.incomeQuintile} / 5`],
                  ["religion", t(`religion.${life.stats.religion}`)],
                  ["siblings", life.family.siblings.length],
                  [
                    "lifeExpectancy",
                    lifeTable(
                      life.migration?.birthCountry ?? life.country,
                      life.sex,
                    ).expectancy.toFixed(1),
                  ],
                  [
                    "underFive",
                    `${(life.migration?.birthCountry ?? life.country).u5} / 1,000`,
                  ],
                  [
                    "gdp",
                    t.money((life.migration?.birthCountry ?? life.country).ppp),
                  ],
                ].map(([k, v]) => (
                  <div key={k}>
                    <small>{t(String(k))}</small>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
              <p className="birth-probability">
                {t("birthOdds")}{" "}
                <strong>
                  {(
                    countryProbability(
                      life.migration?.birthCountry ?? life.country,
                      life.settings.weightMode,
                    ) * 100
                  ).toFixed(2)}
                  %
                </strong>
                <span>
                  {t("oneIn", {
                    n: Math.round(
                      1 /
                        countryProbability(
                          life.migration?.birthCountry ?? life.country,
                          life.settings.weightMode,
                        ),
                    ),
                  })}
                </span>
              </p>
              {past.some((l) => !l.alive) && !past.some((l) => !l.alive && (l.migration?.birthCountry ?? l.country).id === (life.migration?.birthCountry ?? life.country).id) && (
                <p className="new-country">{t("feel.newCountry")}</p>
              )}
              <LiveCompanions life={life} locale={locale} t={t} />
            </section>
          </main>
          {foot}
        </>
      )}
      {(view === "game" || view === "ending") && life && (
        <>
          <header className="game-header" ref={gameHeaderRef}>
            <a className="brand" href={localePath(locale)}>
              {locale === "en" ? (
                <>
                  <em>1</em> in 8 Billion
                </>
              ) : (
                t("title")
              )}
            </a>
            <div className="age-heading">
              <span>
                {t("age")} <strong>{life.age}</strong>
              </span>
              <small>
                {life.year} · {life.name}
              </small>
            </div>
            <div className="time-controls" data-tools={toolsOpen ? "open" : undefined}>
              {view === "game" && life.alive && (
                <div className="playback-group">
                  <button
                    className="play-toggle"
                    data-paused={paused ? "true" : undefined}
                    onClick={() => setPaused(!paused)}
                    aria-label={t(paused ? "play" : "pause")}
                  >
                    {paused ? <Play size={14} /> : <Pause size={14} />}{" "}
                    {t(paused ? "play" : "pause")}
                  </button>
                  <div className="speed-group" role="group">
                    {[1, 2, 4, 8, 12, 16].map((n) => (
                      <button
                        aria-pressed={!paused && !fastForward && speed === n}
                        key={n}
                        onClick={() => selectSpeed(n)}
                      >
                        {n}×
                      </button>
                    ))}
                  </div>
                  {!speedHintDismissed && speed === 1 && life.age >= 6 && (
                    <div className="speed-hint" role="status">
                      <span>{t("ui.speedHint")}</span>
                      <button
                        className="speed-hint-close"
                        onClick={() => {
                          try { localStorage.setItem("1in8bn.speedHintSeen", "1"); } catch {}
                          setSpeedHintDismissed(true);
                        }}
                        aria-label={t("close")}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {life.pendingDecision && aside ? (
                    // A dismissed decision pauses the life; the way back stays in the header.
                    <button className="resume-decision" onClick={() => setAside(false)}>
                      {t("returnDecision")} »
                    </button>
                  ) : (
                    <button onClick={jump} aria-pressed={fastForward} disabled={!!life.pendingDecision} data-hint={quiet && !fastForward && !paused && speed <= 2 ? "true" : undefined}>
                      {t("nextDecision")} »
                    </button>
                  )}
                </div>
              )}
              <button type="button" className="game-share-entry" aria-label={t("feature.shareCard")} title={t("feature.shareCard")} onClick={()=>{setSelected(life);setModal("shareCard");}}><Share2 size={16}/><span>{t("feature.shareImage")}</span></button>
              {/* Phones fold the tools behind this toggle so playback controls stay on screen. */}
              <button className="more-tools icon-button" aria-expanded={toolsOpen} aria-label={t("feel.moreControls")} onClick={() => setToolsOpen((open) => !open)}>
                <Settings2 size={16} />
              </button>
              <div className="tool-group">
              {view === "game" && life.alive && (
              <button aria-pressed={auto} onClick={() => { setAuto(!auto);  }}>
                {t("auto")}
              </button>
              )}
              {view === "game" && life.alive && (
              <button
                type="button"
                id="softBtn"
                className="soft-toggle"
                aria-pressed={settings.gentler}
                title={t("gentleHelp")}
                onClick={() => {
                  const nextGentler = !settings.gentler;
                  setSettings(s => ({ ...s, gentler: nextGentler }));
                  setLife(l => l ? { ...l, settings: { ...l.settings, gentler: nextGentler } } : l);

                }}
              >
                {t("gentle")}
              </button>
              )}
              <button aria-pressed={music} onClick={() => calmMusic.toggle()}>
                <Music size={14} />
                {t("music")}
              </button>
              {music && (
                <input
                  className="music-volume"
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  aria-label={t("ui.volume")}
                  onChange={(e) => setVolume(Number(e.target.value))}
                />
              )}
              {view === "game" && life.alive && (
              <button
                aria-pressed={reflections}
                onClick={() => setReflections(!reflections)}
              >
                ✎ {t("pauses")}
              </button>
              )}
              </div>
              <button
                className="icon-button"
                onClick={toggleTheme}
                aria-label={t("theme")}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={() => {
                  setView("home");
                  setPaused(true);
                }}
              >
                {t("exit")}
              </button>
            </div>
          </header>
          {view === "ending" && (
            <EndingBar visible={endingBar && !modal} onAgain={() => bornAgain()} onKeep={() => { setSelected(life); setModal("keepsakes"); }} t={t} />
          )}
          {view === "game" && (
            <div className="game-feedback" aria-live="polite">
              <ChapterCard chapter={chapter} t={t} onDone={() => setChapter(null)} />
              <ConsequenceCard consequence={consequence} t={t} onDone={() => setConsequence(null)} />
            </div>
          )}
          {view === "ending" && (
            <section className="ending-banner wrap">
              <InvitedComparison life={life} locale={locale} onReply={() => shareLife("reply")} />
              <LifeRecord
                life={life}
                locale={locale}
                t={t}
                onSaveTribute={(text) => {
                  setLife((prev) => (prev ? { ...prev, tribute: text } : prev));
                }}
                onRewatchLast={() => setModal("lastMoments")}
                onOpenShare={() => shareLife("record")}
                onOpenShareEditor={() => {setSelected(life);setModal("shareCard");}}
                onOpenStudio={() => {
                  setSelected(life);
                  setModal("filmStudio");
                }}
                onOpenAlbum={() => {
                  setSelected(life);
                  setModal("keepsakes");
                }}
                onBornAgain={() => bornAgain()}
              />
              <ChoiceJournal entries={journal} t={t} />
              <LifeGrain life={life} locale={locale} onShare={() => shareLife("grain")} />
              <div className="actions"><button className="secondary" onClick={() => setModal("lastMoments")}>{t("feature.rewatchLast")}</button><button className="secondary" onClick={() => shareLife("actions")}>{t("feature.shareCard")}</button><button className="secondary" onClick={() => { setSelected(life); setModal("filmStudio"); }}>{t("feature.mediaStudio")}</button></div>
              <div className="actions ending-actions">
                <button className="primary" onClick={() => bornAgain()}>
                  {t("again")}
                  <ChevronRight size={18} />
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setSelected(life);
                    setModal("keepsakes");
                  }}
                >
                  {t("keepsakes")}
                  <Download size={16} />
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setSelected(life);
                    setModal("room");
                  }}
                >
                  {t("ui.room")}
                </button>

              </div>
              {!life.settings.classroom && <DuoEndingCard locale={locale} />}
              <p className="muted">{t("keepsakesFree")}</p>
            </section>
          )}
          <main className="game-grid wrap" data-tab={phoneTabsOn ? phoneTab : undefined}>
            <aside className="side-me">
              <section className="passport panel">
                <div className="passport-band">
                  {t("identity")} · {life.country.id}
                  <span>{life.birthYear}</span>
                </div>
                <div className="passport-content">
                  <Portrait seed={life.seed} age={life.age} sex={life.sex} />
                  <h2>{life.name}</h2>
                  <dl>
                    {[
                      ["sex", t(life.sex === "M" ? "male" : "female")],
                      [
                        "birth",
                        `${countryName(life.migration?.birthCountry ?? life.country, locale)} · ${life.birthYear}`,
                      ],
                      [
                        "livesIn",
                        life.academics?.overseasResidence?t("studyResidence",{country:countryName(currentLocation!,locale)}):`${t(life.residence ?? life.stats.birthPlaceType)}, ${countryName(life.country, locale)}`,
                      ],
                      ["religion", t(`religion.${life.stats.religion}`)],
                      ["familyBackground", `${life.stats.incomeQuintile} / 5`],
                      ["education", qualificationLabel(life.stats.education,life.academics,t)],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt>{t(k)}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="mrz">
                  I&lt;{life.country.id}
                  {life.name.toUpperCase().replaceAll(" ", "<")}
                  &lt;&lt;&lt;&lt;&lt;
                  <br />
                  {life.birthYear}
                  {life.sex}
                  {life.country.id}&lt;{String(life.age).padStart(3, "0")}
                  &lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                </div>
              </section>
              <section className="panel status">
                <h3>
                  {t("status")}
                  <small>0–100</small>
                </h3>
                {(["health", "happiness", "knowledge", "social"] as const).map(
                  (k) => (
                    <div className={`stat stat-${k}`} key={k}>
                      <div>
                        <span>{t(k)}</span>
                        <strong>{Math.round(life.stats[k])}<StatDelta value={life.stats[k]} /></strong>
                      </div>
                      <meter
                        min="0"
                        max="100"
                        value={life.stats[k]}
                        aria-label={t(k)}
                      />
                    </div>
                  ),
                )}
                <details>
                  <summary>{t("statusHelp")}</summary>
                  <p>{t("statusHelpText")}</p>
                </details>
                <div className="money-grid">
                  <div>
                    <small>{t("netWorth")}</small>
                    <strong>{t.money(life.stats.netAssets)}</strong>
                  </div>
                  <div>
                    <small>{t("annualIncome")}</small>
                    <strong>{t.money(life.stats.annualIncome)}</strong>
                  </div>
                </div>
                {life.alive && (
                  <button
                    type="button"
                    className="ghost shopbtn"
                    onClick={() => setModal("finances")}
                    title={t("ui.spendInvest")}
                  >
                    💼 {t("ui.spendInvest")}
                  </button>
                )}
                <Budget life={life} t={t} locale={locale} />
              </section>
              {view === "ending" && (
                <section className="panel">
                  <h3>{t("trajectory")}</h3>
                  <LineChart
                    values={life.history.map((h) => h.happiness)}
                    label={t("happiness")}
                  />
                </section>
              )}
            </aside>
            <section className="main-life">
              <Healthcare life={life} t={t} locale={locale} />
              <div className="minibar" id="miniBar" role="group" aria-label={t("status")}>
                <div className="mb-st">
                  <span className="mb-i" title={`${t("health")} ${Math.round(life.stats.health)}`}>
                    <span className="mb-n">{t("health")}</span>
                    <b>{Math.round(life.stats.health)}</b>
                    <span className="mb-b" aria-hidden="true">
                      <i style={{ width: `${Math.min(100, Math.max(0, life.stats.health))}%`, background: "var(--teal)" }} />
                    </span>
                  </span>
                  <span className="mb-i" title={`${t("happiness")} ${Math.round(life.stats.happiness)}`}>
                    <span className="mb-n">{t("happiness")}</span>
                    <b>{Math.round(life.stats.happiness)}</b>
                    <span className="mb-b" aria-hidden="true">
                      <i style={{ width: `${Math.min(100, Math.max(0, life.stats.happiness))}%`, background: "var(--accent)" }} />
                    </span>
                  </span>
                  <span className="mb-i" title={`${t("knowledge")} ${Math.round(life.stats.knowledge)}`}>
                    <span className="mb-n">{t("knowledge")}</span>
                    <b>{Math.round(life.stats.knowledge)}</b>
                    <span className="mb-b" aria-hidden="true">
                      <i style={{ width: `${Math.min(100, Math.max(0, life.stats.knowledge))}%`, background: "#4a7c59" }} />
                    </span>
                  </span>
                  <span className="mb-i" title={`${t("netWorth")} ${t.money(life.stats.netAssets)}`}>
                    <span className="mb-n">{t("netWorth")}</span>
                    <b>{t.money(life.stats.netAssets)}</b>
                  </span>
                </div>
                {life.alive && (
                  <button
                    type="button"
                    className="mb-fo"
                    onClick={() => {
                      const el = document.querySelector(".focus-panel");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    title={t("focus")}
                  >
                    <span className="mb-fl">{t("focus")}</span>
                    <b>{t(`focus.${life.focus}`)}</b>
                  </button>
                )}
                {life.alive && (
                  <button
                    type="button"
                    className="mb-sh"
                    onClick={() => setModal("finances")}
                    title={t("finances")}
                  >
                    {t("finances")}
                  </button>
                )}
              </div>
              {auto && life.alive && (
                <div className="auto-active-bar">
                  <span>{t("ui.autoActive")}</span>
                  <button
                    type="button"
                    id="leanBtn"
                    className="ghost sm lean-btn"
                    onClick={() => setModal("lean")}
                    title={t("ui.leanDesc")}
                  >
                    {t(
                      autoLean === "balanced"
                        ? "ui.leanBalanced"
                        : autoLean === "cautious"
                        ? "ui.leanCautious"
                        : autoLean === "adventurous"
                        ? "ui.leanAdventurous"
                        : "ui.leanFamily",
                    )}{" "}
                    ▾
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuto(false);

                    }}
                  >
                    {t("feel.pause")}
                  </button>
                </div>
              )}
              <div className="scene-panel">
                <Scene
                  life={life}
                  label={t("sceneHome", {
                    country: countryName(life.country, locale),
                  })}
                />
                <LifeSceneBanner life={life} locale={locale} t={t} />
              </div>
              {life.alive && (
                <section className="panel focus-panel">
                  <h3>{t("focus")}</h3>
                  <p className="occupation">
                    {t(`job.${life.stats.job}`)} ·{" "}
                    {countryName(currentLocation!, locale)}
                  </p>
                  {life.age < 6 ? (
                    <p className="muted">{t("babyFocus")}</p>
                  ) : (
                    <div className="focus-options">
                      {life.academics?.origin === 'birth' && life.stageFocus ? newFocusOptions(life).map((f) => (
                        <button aria-pressed={life.stageFocus?.selection.current === f} key={f} onClick={() => change(l => selectNewFocus(l,f))}>{t(`stageFocus.${f}`)}</button>
                      )) : availableFocuses(life).map((f) => (
                        <button
                          aria-pressed={life.focus === f}
                          key={f}
                          onClick={() => change((l) => setFocus(l, f))}
                        >
                          {t(`focus.${f}`)}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    className="secondary focus-finances"
                    onClick={() => setModal("finances")}
                  >
                    {t("finances")} <ArrowUpRight size={14} />
                  </button>
                  {life.pendingDecision && aside && (
                    <button className="primary" onClick={() => setAside(false)}>
                      {t("returnDecision")}
                    </button>
                  )}
                </section>
              )}
              <section className="panel record" ref={recordRef}>

                <h3>
                  {t("record")}
                  <small>{t("newestFirst")}</small>
                </h3>
                <ol>
                  {[...life.events].reverse().map((e, i, list) => {
                    const isYearHeader = i === 0 || list[i - 1].age !== e.age;
                    const curr = life.history[e.age];
                    const prev = e.age > 0 ? life.history[e.age - 1] : undefined;
                    const fxParts: string[] = [];
                    if (isYearHeader && curr && prev) {
                      const hDiff = Math.round(curr.health - prev.health);
                      const hapDiff = Math.round(curr.happiness - prev.happiness);
                      const kDiff = Math.round(curr.knowledge - prev.knowledge);
                      const sDiff = Math.round(curr.social - prev.social);
                      if (hapDiff !== 0) fxParts.push(`${t("happiness")} ${hapDiff > 0 ? `+${hapDiff}` : hapDiff}`);
                      if (hDiff !== 0) fxParts.push(`${t("health")} ${hDiff > 0 ? `+${hDiff}` : hDiff}`);
                      if (kDiff !== 0) fxParts.push(`${t("knowledge")} ${kDiff > 0 ? `+${kDiff}` : kDiff}`);
                      if (sDiff !== 0) fxParts.push(`${t("social")} ${sDiff > 0 ? `+${sDiff}` : sDiff}`);
                    }
                    const hasFx = fxParts.length > 0;
                    const isFxOpen = fxExpanded.includes(e.id);
                    const isStarred = stars.includes(e.id);
                    return (
                      <li
                        key={e.id}
                        className={`event-${e.kind}${isYearHeader ? " age-start" : ""}${hasFx ? " hasfx" : ""}${isStarred ? " starred" : ""}`}
                      >
                        <span className="event-age">
                          {t("age")} {e.age}
                        </span>
                        <div>
                          <span className="event-icon">{e.icon}</span>
                          {e.key === "event.decision" && journalByEvent.get(e.id) ? (
                            <span className="journal-choice">
                              {t("feel.youChose")}: <b>{choiceLabel(journalByEvent.get(e.id)!, t)}</b>
                            </span>
                          ) : (
                            t(e.key, e.params)
                          )}
                          {hasFx && (
                            <span className="fx-wrap">
                              <button
                                type="button"
                                className="fxk"
                                aria-label={t("ui.statEffects")}
                                title={t("ui.statEffects")}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setFxExpanded((p) => p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]);
                                }}
                              >
                                ±
                              </button>
                              {isFxOpen && <span className="fx">{fxParts.join(" · ")}</span>}
                            </span>
                          )}
                          {isPeakMoment(life, e) && (
                            <button
                              type="button"
                              className="moment-share"
                              onClick={() => shareMomentNow(e)}
                            >
                              <Share2 size={13} aria-hidden="true" />{storyCopy(locale).shareThis}
                            </button>
                          )}
                          {e.kind === "reflection" &&
                            life.reflections[String(e.age)] && (
                              <blockquote>
                                {life.reflections[String(e.age)]}
                              </blockquote>
                            )}
                        </div>
                        <button
                          type="button"
                          className="stb"
                          aria-label={t(isStarred ? "ui.momentRemembered" : "ui.momentToRemember")}
                          title={t(isStarred ? "ui.momentRemembered" : "ui.momentToRemember")}
                          aria-pressed={isStarred}
                          onClick={() => favorite(e.id)}
                        >
                          <Star
                            size={14}
                            fill={isStarred ? "currentColor" : "none"}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </section>
            <aside className="side-world">
              <section className="panel family">
                <h3>{t("family")}</h3>
                <dl>
                  {life.family.parents.map((p, i) => (
                    <div key={p.id}>
                      <dt>{t(i === 0 ? "mother" : "father")}</dt>
                      <dd>
                        {p.name} · {p.age}
                        <small>
                          {t(`job.${p.job}`)}
                          {!p.alive && ` · ${t("died")}`}
                        </small>
                      </dd>
                    </div>
                  ))}
                  {[
                    ["siblings", life.family.siblings],
                    [
                      "partner",
                      householdPartners(life),
                    ],
                  ].map(([key, people]) => (
                    <div key={String(key)}>
                      <dt>{t(String(key))}</dt>
                      <dd>
                        {(people as Life["family"]["siblings"]).length
                          ? (people as Life["family"]["siblings"]).map((p) => (
                              <span key={p.id}>
                                {p.name} · {p.age}
                                {!p.alive ? " †" : ""}
                                <br />
                              </span>
                            ))
                          : "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
                <FamilyDescendants life={life} locale={locale} t={t} />
                <LifeDetails life={life} t={t} />
              </section>
              <LiveCompanions life={life} locale={locale} t={t} />
              <section className="panel">
                <h3>
                  {t("lifeMap")}
                  <small>{t("square")}</small>
                </h3>
                <div className="life-map">
                  {Array.from(
                    { length: Math.max(80, life.age + 1) },
                    (_, i) => {
                      const milestone = lifeMilestones.get(i);
                      return (
                        <button
                          key={i}
                          type="button"
                          title={`${t("age")} ${i}${life.history[i] ? ` · ${t("happiness")} ${Math.round(life.history[i].happiness)}` : ""}${milestone ? ` · ${t(milestone.labelKey, milestone.params)}` : ""}`}
                          aria-label={`${t("age")} ${i}${milestone ? ` · ${milestone.symbol}` : ""}`}
                          style={{
                            background: !life.alive && life.deathAge === i
                              ? "var(--loss, #8c1d3c)"
                              : life.history[i]
                              ? `color-mix(in srgb, var(--teal) ${20 + life.history[i].happiness * 0.7}%, var(--paper))`
                              : undefined,
                          }}
                          className={[
                            Math.round(lifeTable(life.country, life.sex).expectancy) === i ? "expected" : "",
                            i === life.age && life.alive ? "cur" : "",
                            !life.alive && life.deathAge === i ? "dead" : "",
                          ].filter(Boolean).join(" ")}
                          onClick={() => {
                            const e = life.events.find((e) => e.age === i);
                            if (e) setToast(t(e.key, e.params));
                            else if (milestone) setToast(t(milestone.labelKey, milestone.params));
                          }}
                        >
                          {milestone && <span className="m" aria-hidden="true">{milestone.symbol}</span>}
                        </button>
                      );
                    },
                  )}
                </div>
                <div className="grid-key">
                  <span>{t("ui.gridKeyYear")}</span>
                  <span>
                    {t("ui.gridKeyExpectancy", {
                      country: countryName(life.country, locale),
                      sex: t(life.sex === "M" ? "male" : "female"),
                      age: lifeTable(life.country, life.sex).expectancy.toFixed(1),
                    })}
                  </span>
                  <span className="grid-milestone-key">
                    {t("ui.gridMilestones")}
                  </span>
                </div>
              </section>
              <section className="panel">
                <h3>{t("survival")}</h3>
                <p className="tiny muted">{t("survivalHint")}</p>
                <LineChart
                  values={lifeTable(life.country, life.sex).survival.map(
                    (v) => v * 100,
                  )}
                  secondaryValues={worldSurvivalCurve(life.sex)}
                  primaryLabel={t("feature.countrySurvival", {
                    country: countryName(life.country, locale),
                    sex: t(life.sex === "M" ? "male" : "female"),
                  })}
                  secondaryLabel={t("feature.worldSurvival")}
                  age={life.age}
                  label={t("survival")}
                />
                <p className="survival-readout">
                  {t("feature.chanceSurvival", {
                    pct: Math.round((lifeTable(life.country, life.sex).survival[Math.min(life.age, lifeTable(life.country, life.sex).survival.length - 1)] ?? 0) * 100),
                    age: life.age,
                    country: countryName(life.country, locale),
                    worldPct: Math.round(worldSurvivalCurve(life.sex)[Math.min(life.age, worldSurvivalCurve(life.sex).length - 1)] ?? 0),
                  })}
                </p>
              </section>
              <ActualComparison life={life} t={t} locale={locale} />
              <CountryStats country={life.country} locale={locale} t={t} />
            </aside>
          </main>
          {recordStripOn && life && latestEvent && (
            <div className="record-strip" aria-live="polite">
              <button
                key={latestEvent.id}
                type="button"
                className="record-strip-text"
                aria-label={t("record")}
                onClick={() => {

                  setPhoneTab("life");
                  setTimeout(() => recordRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 60);
                }}
              >
                <b>{t("age")} {latestEvent.age}</b>
                <span>{latestEvent.key === "event.decision" && journalByEvent.get(latestEvent.id) ? `${t("feel.youChose")}: ${choiceLabel(journalByEvent.get(latestEvent.id)!, t)}` : t(latestEvent.key, latestEvent.params)}</span>
              </button>
              {isPeakMoment(life, latestEvent) && (
                <button
                  type="button"
                  className="record-strip-share"
                  aria-label={storyCopy(locale).shareThis}
                  title={storyCopy(locale).shareThis}
                  onClick={() => shareMomentNow(latestEvent)}
                >
                  <Share2 size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          {phoneTabsOn && life && (
            <nav className="phone-tabs" aria-label={phoneTabsCopy(locale).nav}>
              {([["life", Sprout], ["me", UserRound], ["family", UsersRound], ["world", Globe2]] as const).map(([id, Icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={phoneTab === id}
                  onClick={() => {

                    setPhoneTab(id);
                    window.scrollTo({ top: 0 });
                  }}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span>{phoneTabsCopy(locale)[id]}</span>
                </button>
              ))}
            </nav>
          )}
          {foot}
        </>
      )}
      {life?.pendingDecision &&
        view === "game" &&
        !aside &&
        !modal &&
        !auto &&
        (life.pendingDecision.type !== "reflection" || reflections) && (
          <Modal closeLabel={t("close")} backdropCloses={false}
            title={`${t(life.pendingDecision.type === "reflection" ? "reflection" : "decision")} · ${t("age")} ${life.age}`}
            headerActions={
              <div className="decision-head-actions">
                <button
                  type="button"
                  className="decmin"
                  onClick={() => {

                    if (life.pendingDecision!.type === "reflection") {
                      change((l) => addReflection(l, ""));
                      setReflection("");
                    } else {
                      setAside(true);
                    }
                  }}
                >
                  {t("setAside")} ▾
                </button>
              </div>
            }
            onClose={() => {

              // Closing an optional reflection keeps it private and lets the life go on; a closed
              // decision is set aside until the player returns to it.
              if (life.pendingDecision!.type === "reflection") { change((l) => addReflection(l, "")); setReflection(""); }
              else setAside(true);
            }}
          >
            {!life.pendingDecision.key.startsWith("decision.health") && (
              <div className="decision-scene" aria-hidden="true">
                <Scene life={life} label="" />
              </div>
            )}
            <h2>{t(life.pendingDecision.key, life.pendingDecision.params)}</h2>
            {life.hobbyState?.offer?.age===life.age && /^hobby(?:-\d+)?$/.test(life.pendingDecision.id) && typeof life.pendingDecision.params.replace==='string' && life.pendingDecision.params.replace && <p>{t("hobby.replace",{hobby:t(hobbyDisplayKey(life,life.pendingDecision.params.replace))})}</p>}
            {life.pendingDecision.key.startsWith("decision.health") && <Healthcare life={life} t={t} locale={locale} decision />}
            {life.pendingDecision.id.includes("migration") &&
              life.migration.offerCountry && (
                <p>{countryName(life.migration.offerCountry, locale)}</p>
              )}
            {life.pendingDecision.type === "choice" && MONEY_DECISIONS.test(life.pendingDecision.key) && (
              // Players set these decisions aside to look up their money; keep it in view instead.
              <p className="decision-money">
                <span>{t("netWorth")} <strong>{t.money(life.stats.netAssets)}</strong></span>
                <span>{t("annualIncome")} <strong>{t.money(life.stats.annualIncome)}</strong></span>
              </p>
            )}
            {isPhysicalEquipmentDecision(life.pendingDecision.id)&&<>
              <p className="muted">{t('physical.equipmentHelp')}</p>
              {physicalAccess(physicalEnvironment(life))<.2&&<p>{t('physical.equipmentLimited')}</p>}
              {!life.pendingDecision.choices.some(c=>c.id==='physicalAidGet')&&<p>{t('physical.equipmentDebitUnavailable')}</p>}
            </>}
            {life.pendingDecision.type === "reflection" ? (
              <>
                <textarea
                  maxLength={1000}
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder={t("writeReflection")}
                />
                <button
                  className="primary wide"
                  onClick={() => {

                    change((l) => addReflection(l, reflection));
                    setReflection("");
                  }}
                >
                  {t("saveReflection")}
                </button>
                <button
                  className="secondary wide"
                  onClick={() => {

                    change((l) => addReflection(l, ""));
                  }}
                >
                  {t("skipReflection")}
                </button>
              </>
            ) : (
              <div className="choices decision-choices">
                {life.pendingDecision.choices.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => choose(c)}
                  >
                    <span>{i + 1}</span>
                    <span className="choice-body">
                      <span className="choice-label">{t(c.key, (life.pendingDecision?.id.startsWith("job-") || life.pendingDecision?.key.startsWith("decision.health") || life.pendingDecision?.id.startsWith("descendant-") || life.pendingDecision?.id.startsWith("studyDestination-") || c.id === "academicGraduateAbroad") && typeof c.params.amount === "number" ? { ...c.params, amount: t.money(c.params.amount) } : c.params)}</span>
                      {c.id.startsWith("major_") && <MajorChoiceDetails life={life} choice={c.id} t={t} />}
                      {c.id.startsWith("offer") &&
                        life.jobOffers?.[Number(c.id.slice(5))] && (
                          <small>
                            {t(
                              `job.${life.jobOffers[Number(c.id.slice(5))].job}`,
                            )}{" "}
                            ·{" "}
                            {t.money(life.jobOffers[Number(c.id.slice(5))].income)}{life.jobOffers[Number(c.id.slice(5))].terms && <> · {t(life.jobOffers[Number(c.id.slice(5))].terms!.formal ? "ui.formalJobOffer" : "ui.informalJobOffer")}</>}
                          </small>
                        )}
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
                <GraduateStudyNotice life={life} t={t} />
              </div>
            )}
            {life.pendingDecision.type !== "reflection" && (
              // Auto mode and its lean live at the foot so the first decision's header stays calm on phones.
              <div className="decision-auto">
                <button
                  className="text-button muted"
                  onClick={() => {
                    setAuto(true);
                    setAside(false);

                  }}
                >
                  {t("autoHelp")}
                </button>
                <button
                  type="button"
                  id="leanBtnModal"
                  className="ghost sm lean-btn"
                  onClick={() => setModal("lean")}
                  title={t("ui.leanDesc")}
                >
                  {t(
                    autoLean === "balanced"
                      ? "ui.leanBalanced"
                      : autoLean === "cautious"
                      ? "ui.leanCautious"
                      : autoLean === "adventurous"
                      ? "ui.leanAdventurous"
                      : "ui.leanFamily",
                  )}{" "}
                  ▾
                </button>
              </div>
            )}
          </Modal>
        )}
      {life?.pendingDecision &&
        aside &&
        view === "game" && (
          <aside className="decpeek" aria-label={t("decision.waitingTitle")}>
            <div className="dp-t">
              <small>{t("decision.waitingTitle")}</small>
              <b>{t(life.pendingDecision.key, life.pendingDecision.params)}</b>
            </div>
            <button className="cta primary" onClick={() => setAside(false)}>
              {t("decision.openAgain")} »
            </button>
          </aside>
        )}
      {modal && (
        <Modal closeLabel={t("close")}
          canClose={!archiveDeleting}
          title={modal === "compareLives" ? collectionCopy(locale).comparisonTitle : modal === "archive" ? archiveCopy[locale].title : modal === "currency" ? t("ui.amountsIn") : modal === "shelf" ? t("ui.pastShelfTitle") : modal === "wish" ? t("ui.wishTitle") : modal === "lab" ? t("ui.labOpen") : modal === "village" ? t("ui.villageTitle") : modal === "lean" ? t("ui.leanTitle") : ["filmStudio", "shareCard", "lastMoments", "lifeRecord"].includes(modal) ? t(({filmStudio:"feature.shapeFilm",shareCard:"feature.shareFriends",lastMoments:"feature.lastMoments",lifeRecord:"feature.recordGrain"} as Record<string,string>)[modal]) : t(
            modal === "countries"
              ? "statistics"
              : ["shortcuts", "storyPreview", "room"].includes(modal)
                ? `ui.${modal}`
                : modal,
          )}
          onClose={() => {
            setModal("");
            setSelected(null);
          }}
        >
          {modal === "archive" ? <ArchiveManager past={past} active={!!life?.alive} locale={locale} t={t} onRemove={removeArchive} onBackup={() => {
            try { downloadFile("1in8bn-lives.json", exportBackup(life, past), "application/json"); }
            catch { setToast(t("storageError")); }
          }} /> : modal === "currency" ? <MoneyRegionPicker value={moneyRegion} onChange={selectMoneyRegion} locale={locale} label={t("ui.amountsIn")} /> : modal === "lifeRecord" && (selected ?? life) ? (
            <>
              <LifeRecord
                life={(selected ?? life)!}
                locale={locale}
                t={t}
                onSaveTribute={(text) => {
                  const targetId = (selected ?? life)!.id;
                  setLife((prev) => (prev && prev.id === targetId ? { ...prev, tribute: text } : prev));
                  setSelected((prev) => (prev ? { ...prev, tribute: text } : prev));
                  setPast((prev) =>
                    prev.map((item) => (item.id === targetId ? { ...item, tribute: text } : item))
                  );
                }}
                onRewatchLast={() => setModal("lastMoments")}
                onOpenShare={() => setModal("shareCard")}
                onOpenStudio={() => setModal("filmStudio")}
                onOpenAlbum={() => setModal("keepsakes")}
                onOpenRoom={(l) => {
                  setSelected(l);
                  setModal("room");
                }}
                onBornAgain={() => {

                  setModal("");
                  beginFresh();
                }}
              />
              <LifeGrain life={(selected ?? life)!} locale={locale} onShare={() => setModal("shareCard")} />
            </>
          ) : modal === "filmStudio" && (selected ?? life) ? <FilmStudio key={(selected ?? life)!.id} life={(selected ?? life)!} locale={locale} t={t} /> : (modal === "shareCard" || modal === "compareLives") && (selected ?? life) ? <ShareLife key={`${(selected ?? life)!.id}-${modal}-${shareMoment}`} life={(selected ?? life)!} past={past} locale={locale} t={t} initialMode={modal==="compareLives"?"comparison":"single"} initialMoment={shareMoment} /> : modal === "lastMoments" && (selected ?? life) ? <LastMoments life={(selected ?? life)!} t={t} locale={locale} onDone={() => setModal(selected && selected.id !== life?.id ? "lifeRecord" : "")} onShare={life && !life.alive && (!selected || selected.id === life.id) ? () => shareLife("last_moments") : undefined} onAgain={life && !life.alive && (!selected || selected.id === life.id) ? () => { setModal(""); bornAgain(); } : undefined} /> : modal === "shortcuts" ? (
            <table className="shortcuts">
              <tbody>
                {[
                  ["Space", t("pause") + " / " + t("play")],
                  ["1 / 2 / 4 / 8", "1× / 2× / 4× / 8×"],
                  ["N", t("nextDecision")],
                  ["M", t("music")],
                  ["I", t("exit")],
                  ["?", t("ui.shortcuts")],
                ].map(([key, label]) => (
                  <tr key={key}>
                    <td>
                      <kbd>{key}</kbd>
                    </td>
                    <td>{label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : modal === "storyPreview" && (selected ?? life) ? (
            <>
              <h2>{(selected ?? life)!.name}</h2>
              <div className="story-preview">
                {(selected ?? life)!.events.map((e) => (
                  <article key={e.id}>
                    <small>
                      {t("age")} {e.age} · {e.year}
                    </small>
                    <p>{t(e.key, e.params)}</p>
                  </article>
                ))}
              </div>
              <button className="primary" onClick={() => keep("story")}>
                {t("download")}
              </button>
            </>
          ) : modal === "countries" ? (
            <CountryExplorer locale={locale} t={t} />
          ) : modal === "finances" && life ? (
            <Finance
              life={life}
              t={t}
              onChange={change}
              notify={setToast}
              onDecision={() => {
                setModal("");
                setAside(false);
              }}
            />
          ) : modal === "transfer" ? (
            <>
              <p>{t("confirmImport")}</p>
              <div className="actions">
                <button
                  className="primary"
                  onClick={() =>
                    downloadFile(
                      recovery ? "1in8bn-recovery.json" : "1in8bn-lives.json",
                      recovery ?? exportBackup(life, past),
                      "application/json",
                    )
                  }
                >
                  <Download size={16} />
                  {t("export")}
                </button>
                <button
                  className="secondary"
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload size={16} />
                  {t("import")}
                </button>
              </div>
            </>
          ) : modal === "room" && (selected ?? life) ? (
            <MemoryRoom
              key={(selected ?? life)!.id}
              life={(selected ?? life)!}
              t={t}
            />
          ) : modal === "keepsakes" ? (
            <div className="keep-modal">
              <div className="keep-heading">
                <h2>{(selected ?? life)?.name}</h2>
                <p>
                  {(selected ?? life)?.birthYear} — {(selected ?? life)?.year}
                  {(selected ?? life) && ` · ${countryName((selected ?? life)!.country, locale)}`}
                </p>
              </div>
              <div className="keep-feature">
                <button className="primary" onClick={() => setModal("filmStudio")}>{t("feature.mediaStudio")}<ChevronRight size={16} /></button>
                <button className="secondary" onClick={() => setModal("shareCard")}>{t("feature.shareCard")}</button>
              </div>
              <section className="keep-downloads" aria-labelledby="keepsake-downloads">
                <div className="keep-downloads-heading">
                  <h3 id="keepsake-downloads">{t("download")}</h3>
                  <label className="switch-row">
                    <input
                      type="checkbox"
                      checked={onlyStarred}
                      onChange={(e) => setOnlyStarred(e.target.checked)}
                    />
                    <span className="switch" />
                    {t("ui.savedMoments")}
                  </label>
                </div>
                <div className="keepsake-grid">
                  {[
                    "certificate",
                    "story",
                    "album",
                    "film",
                    "recordBook",
                    "csv",
                  ].map((k) => (
                    <button
                      disabled={busy}
                      className="secondary"
                      key={k}
                      onClick={() => keep(k)}
                    >
                      <Download size={18} />
                      {t(["recordBook", "csv"].includes(k) ? `ui.${k}` : k)}
                    </button>
                  ))}
                </div>
                <p className="keep-status" role="status">{busy ? t("loading") : `${t("saved")} · ${t("keepsakesFree")}`}</p>
              </section>
              <nav className="keep-links" aria-label={(selected ?? life)?.name}>
                {!(selected ?? life)?.alive && <><button onClick={() => setModal("lifeRecord")}>{t("feature.recordGrain")}<ChevronRight size={16} /></button><button onClick={() => setModal("lastMoments")}>{t("feature.rewatchLast")}<ChevronRight size={16} /></button></>}
                <button onClick={() => setModal("storyPreview")}>
                  {t("ui.storyPreview")}<ChevronRight size={16} />
                </button>
                <button onClick={() => setModal("room")}>
                  {t("ui.decorate")}<ChevronRight size={16} />
                </button>

                {(selected ?? life)?.alive && (
                  <button
                    onClick={() => {
                      setLife(selected ?? life);
                      setView("game");
                      setModal("");
                      setSelected(null);
                    }}
                  >
                    {t("resume")}<ChevronRight size={16} />
                  </button>
                )}
              </nav>
            </div>
          ) : modal === "wish" ? (
            <LifeWishExplorer
              past={past}
              locale={locale}
              t={t}
              onClose={() => setModal("")}
              onOpenLife={(l) => {
                setSelected(l);
                setModal("lifeRecord");
              }}
            />
          ) : modal === "lab" ? (
            <SimulationLab locale={locale} t={t} onClose={() => setModal("")} />
          ) : modal === "shelf" ? (
            <PastLivesShowcase
              past={past}
              locale={locale}
              t={t}
              onOpenLife={(l) => {
                setSelected(l);
                setModal("lifeRecord");
              }}
              onOpenRoom={(l) => {
                setSelected(l);
                setModal("room");
              }}
              onOpenVillage={() => setModal("village")}
              onOpenWish={() => setModal("wish")}
            />
          ) : modal === "village" ? (
            <PastLivesVillage
              past={past}
              locale={locale}
              t={t}
              onOpenLife={(l) => {
                setSelected(l);
                setModal("lifeRecord");
              }}
              onClose={() => setModal("")}
            />
          ) : modal === "lean" ? (
            <AutoInclinationPicker value={autoLean} onChange={updateAutoLean} t={t} onClose={() => setModal("")} />
          ) : modal === "install" ? (
            <p>{t("ui.installHelp")}</p>
          ) : (
            <>
              <p>{t(`${modal}Text`)}</p>
            </>
          )}
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button onClick={() => setToast("")} aria-label={t("close")}>
            <X size={16} />
          </button>
        </div>
      )}
      <UnlivedStones t={t} locale={locale} refreshToken={unlivedRefresh} />
    </>
  );
}
function CountryStats({
  country: c,
  locale,
  t,
}: {
  country: Country;
  locale: Locale;
  t: T;
}) {
  const rows: [string, string | number][] = [
    ["birthsYear", c.births.toLocaleString()],
    ["population", (c.pop * 1000).toLocaleString()],
    ["lifeExpectancy", c.le],
    ["underFive", `${c.u5} / 1,000`],
    ["gdp", t.money(c.ppp)],
    ["gini", c.gi],
    ["urbanPopulation", `${c.urb}%`],
    ["agriculture", `${c.agr}%`],
    ["schoolYears", c.eys],
    ["tertiary", `${c.ter}%`],
    ["internet", `${c.net}%`],
    ["fertility", c.tfr],
    ["maternal", c.mmr],
    ["hiv", `${c.hiv}%`],
    ["homicide", c.hom],
    ["road", c.road],
    ["smoking", `${c.sm}% / ${c.sf}%`],
    ["healthSpending", `${c.oop}%`],
    ["childMarriage", `${c.cm}%`],
    ["satisfaction", c.wh ?? "—"],
  ];
  return (
    <section className="panel country-stats">
      <h3>
        {c.flag} {countryName(c, locale)}
      </h3>
      <dl>
        {rows.slice(0, 5).map(([k, v]) => (
          <div key={k}>
            <dt>{t(k)}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <details className="country-stats-more">
        <summary>{t("statistics")} · {rows.length}</summary>
        <dl>
          {rows.slice(5).map(([k, v]) => (
            <div key={k}>
              <dt>{t(k)}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="tiny muted">{t("dataNote")}</p>
      </details>
    </section>
  );
}
function Finance({
  life,
  t,
  onChange,
  notify,
  onDecision,
}: {
  life: Life;
  t: T;
  onChange: (fn: (l: Life) => Life) => void;
  notify: (s: string) => void;
  onDecision: () => void;
}) {
  const [amount, setAmount] = useState(100);
  return (
    <>
      <div className="money-grid">
        <div>
          <small>{t("savings")}</small>
          <strong>{t.money(life.stats.savings)}</strong>
        </div>
        <div>
          <small>{t("investments")}</small>
          <strong>{t.money(life.stats.investments)}</strong>
        </div>
      </div>
      <p>{t("spendHelp")}</p>
      <label>
        {t("amount")} ({t.moneyLabel})
        <input
          type="number"
          min={t.displayAmount(1)}
          max={t.displayAmount(life.stats.savings)}
          step="any"
          value={Number(t.displayAmount(amount).toFixed(2))}
          onChange={(e) => setAmount(t.baseAmount(Number(e.target.value)))}
        />
      </label>
      <div className="amount-presets">
        {[10, 25, 50].map((share) => (
          <button
            key={share}
            type="button"
            disabled={life.stats.savings < 1}
            aria-pressed={amount === Math.max(1, Math.floor((life.stats.savings * share) / 100))}
            onClick={() => setAmount(Math.max(1, Math.floor((life.stats.savings * share) / 100)))}
          >
            {share}%
          </button>
        ))}
      </div>
      <div className="choices spend-grid">
        {["health", "education", "experiences", "giving", "family"].map((k) => (
          <button
            key={k}
            disabled={life.age < 18 || !life.alive}
            onClick={() => {
              if (
                !Number.isFinite(amount) ||
                amount < 1 ||
                amount > life.stats.savings
              ) {
                notify(t("notEnough"));
                return;
              }
              onChange((l) => spend(l, k, amount));
            }}
          >
            {t(`spend${k[0].toUpperCase() + k.slice(1)}`)}
            <span>{t.money(amount)}</span>
          </button>
        ))}
      </div>
      <div className="allocation-pills">
        <Segments
          label={t("allocation")}
          value={life.allocation}
          values={ALLOCATIONS.map((a) => [a, t(`allocation.${a}`)])}
          onChange={(a) => onChange((l) => invest(l, a))}
        />
      </div>
      <LifeActions
        life={life}
        t={t}
        onChange={onChange}
        onDecision={onDecision}
      />
    </>
  );
}
