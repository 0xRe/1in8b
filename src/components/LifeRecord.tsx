import {hobbyDisplayKey} from '../game/physical-hobbies';
import {qualificationLabel} from '../lib/qualification-label';
import {recordFocusLabel} from '../lib/record-export';
import { useEffect, useMemo, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { LifeShareStrip } from "./LifeShareStrip";
import { FamilyDescendants } from "./FamilyDescendants";
import { Portrait } from "./Visuals";
import type { Life } from "../game/types";
import type { Locale, translator } from "../lib/i18n";
import { countryName, getCountryById } from "../game/countries";
import { lifeInsights } from "../lib/life-insights";
import {
  causeMortalityContext,
  fiveCompanions,
  generateBiography,
  globalImpactCauses,
  lookingBackReflection,
  todayThemeFact,
  whoSaidGoodbye,
  whoRemembered,
} from "../lib/ending-story";
import { PhotoCarousel } from "./PhotoCarousel";
import { UnfulfilledWishesModal } from "./UnfulfilledWishesModal";
import { LifeTimeline } from "./LifeTimeline";
import { getLifeMilestones } from "../game/life-milestones";
import { EstateSettlement } from "./EstateSettlement";
import "./life-records.css";

type T = ReturnType<typeof translator>;

export function LifeRecord({
  life,
  locale,
  t,
  onSaveTribute,
  onRewatchLast,
  onOpenShare,
  onOpenShareEditor,
  onOpenStudio,
  onOpenAlbum,
  onBornAgain,
  onOpenRoom,
}: {
  life: Life;
  locale: Locale;
  t: T;
  onSaveTribute?: (text: string) => void;
  onRewatchLast?: () => void;
  onOpenShare?: () => void;
  onOpenShareEditor?: () => void;
  onOpenStudio?: () => void;
  onOpenAlbum?: () => void;
  onBornAgain?: () => void;
  onOpenRoom?: (life: Life) => void;
}) {
  const info = useMemo(() => lifeInsights(life), [life]);
  const lifeMilestones = useMemo(() => getLifeMilestones(life), [life]);
  const happiest = info.happiestYear;
  const money = t.money;

  const country = (id: string) => {
    const value = getCountryById(id);
    return value ? countryName(value, locale) : id;
  };

  const [tributeText, setTributeText] = useState(life.tribute ?? "");
  const [tributeSaved, setTributeSaved] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [showWishes, setShowWishes] = useState(false);
  const [audioRemaining, setAudioRemaining] = useState<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    return () => {
      intervalsRef.current.forEach((id) => clearInterval(id));
      intervalsRef.current = [];
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setTributeText(life.tribute ?? "");
  }, [life.tribute]);

  const handleSaveTribute = () => {
    if (onSaveTribute) onSaveTribute(tributeText);
    life.tribute = tributeText;
    setTributeSaved(true);
    setTimeout(() => setTributeSaved(false), 2500);
  };

  const play15sAudio = () => {
    if (audioRemaining !== null) {
      intervalsRef.current.forEach((id) => clearInterval(id));
      intervalsRef.current = [];
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      setAudioRemaining(null);
      return;
    }

    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      setAudioRemaining(15);

      const notes = [60, 64, 67, 72, 67, 64, 62, 67, 60, 65, 69, 72, 71, 67, 64, 60];
      let noteIndex = 0;

      const playNote = () => {
        if (!audioCtxRef.current || ctx.state === "closed") return;
        const note = notes[noteIndex++ % notes.length];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 440 * Math.pow(2, (note - 69) / 12);
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.85);
      };

      playNote();
      const interval = setInterval(playNote, 600);
      intervalsRef.current.push(interval);

      const countInterval = setInterval(() => {
        setAudioRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countInterval);
            clearInterval(interval);
            intervalsRef.current = intervalsRef.current.filter((i) => i !== countInterval && i !== interval);
            if (audioCtxRef.current) {
              void audioCtxRef.current.close().catch(() => {});
              audioCtxRef.current = null;
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      intervalsRef.current.push(countInterval);
    } catch {
      setAudioRemaining(null);
    }
  };

  const bio = useMemo(() => generateBiography(life, locale, t), [life, locale, t]);
  const causeContext = useMemo(() => causeMortalityContext(life, locale, t), [life, locale, t]);
  const goodbyeText = useMemo(() => whoSaidGoodbye(life, locale, t), [life, locale, t]);
  const rememberedText = useMemo(() => whoRemembered(life, locale, t), [life, locale, t]);
  const reflection = useMemo(() => lookingBackReflection(life, locale, t), [life, locale, t]);
  const theme = useMemo(() => todayThemeFact(life, locale, t), [life, locale, t]);
  const companionsData = useMemo(() => fiveCompanions(life, locale, t), [life, locale, t]);
  const causes = useMemo(() => globalImpactCauses(life, locale, t), [life, locale, t]);

  const livingChildCount = life.family.children.filter((c) => c.alive).length;
  const deadChildCount = life.family.children.length - livingChildCount;
  const childrenText =
    deadChildCount > 0
      ? t("record.childrenWithLoss", { count: life.family.children.length, died: deadChildCount })
      : t("record.childrenAllLiving", { count: life.family.children.length });

  const partnerText = life.family.secondPartner
    ? t("record.partnerWithSecond", {
        partner: life.family.partner?.name ?? "—",
        years: info.partneredYears,
        second: life.family.secondPartner.name,
      })
    : life.family.partner
    ? t("record.partnerSingle", {
        partner: life.family.partner.name,
        years: info.partneredYears,
      })
    : "—";

  const rows = [
    [t("record.birthCountry"), country(info.birthCountry.id)],
    [t("record.countries"), info.countries.map(country).join(" · ")],
    [t("education"), qualificationLabel(life.stats.education,life.academics,t)],
    [t("ui.lastJob"), info.lastJob ? t(`job.${info.lastJob}`) : t("record.unknown")],
    [t("partner"), partnerText],
    [t("children"), childrenText],
    [t("family.grandchildren"), String(life.descendants.grandchildren.length)],
    [t("record.whoSaidGoodbyeTitle"), goodbyeText],
    ...(rememberedText ? [[t("record.partingWordsTitle"), rememberedText]] : []),
    [
      t("ui.happiestYear"),
      happiest
        ? `${t("age")} ${happiest.age} (${life.birthYear + happiest.age}) · ${
            life.family.children.some((c) => c.birthYear === life.birthYear + happiest.age)
              ? t("record.happiestChild")
              : t("record.happiestDefault")
          }`
        : "—",
    ],
    [t("ui.hobbies"), life.hobbies.map((h) => t(hobbyDisplayKey(life,h.id))).join(" · ") || "—"],
    [t("netWorth"), money(life.stats.netAssets)],
    [
      t("record.adultYearsWent"),
      t("record.adultYearsFamily", { years: Math.max(1, life.age - 18) }),
    ],
  ];

  const reflectionsList = Object.entries(life.reflections).filter(
    ([age, text]) => Number(age) <= life.age && text.trim()
  );

  return (
    <>
      <section className="death-record">
        <div className="death-record-band">
          <span>{t("record.deathCertificate")}</span>
          <span>{t("record.certificateNo", { code: life.certificate })}</span>
        </div>

        <div className="death-record-content">
          <div>
            <div className="death-record-portrait"><Portrait seed={life.seed} age={life.age} sex={life.sex} /></div>
            <p className="eyebrow">
              {countryName(life.country, locale)} · {t(life.sex === "M" ? "male" : "female")}
            </p>
            <h1>{life.name}</h1>
            <p className="mono">
              {t("record.diedAt", {
                birth: life.birthYear,
                death: life.year,
                age: life.age,
                place: `${life.residence === "urban" ? t("urban") : t("rural")}, ${country(
                  life.country.id
                )}`,
              })}
            </p>

            <LifeShareStrip life={life} locale={locale} t={t} onOpenCard={onOpenShareEditor ?? onOpenShare}/>

            <p className="life-obituary">{bio}</p>

            <div className="cause-box">
              <p className="cause-title">
                {t("record.causeOfDeath")}: <strong>{t(life.cause ?? "cause.age")}</strong>
              </p>
              <p className="cause-context">{causeContext.contextText}</p>
            </div>
          </div>

          <dl className="record-facts">
            {rows.map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="death-life-map-card">
          <div className="section-title-row">
            <h3>{t("lifeMap")}</h3>
            <span className="section-badge">{t("square")}</span>
          </div>
          <div className="life-map">
            {Array.from(
              { length: Math.max(80, life.age + 1) },
              (_, i) => {
                const milestone = lifeMilestones.get(i);
                const hist = life.history[i];
                return (
                  <button
                    key={i}
                    type="button"
                    title={`${t("age")} ${i}${hist ? ` · ${t("happiness")} ${Math.round(hist.happiness)}` : ""}${milestone ? ` · ${t(milestone.labelKey, milestone.params)}` : ""}`}
                    aria-label={`${t("age")} ${i}${milestone ? ` · ${milestone.symbol}` : ""}`}
                    style={{
                      background: hist
                        ? `color-mix(in srgb, var(--primary) ${Math.round(hist.happiness)}%, var(--surface-subtle, #eceae4))`
                        : undefined,
                    }}
                  >
                    {milestone ? (
                      <span className="m" aria-hidden="true">
                        {milestone.symbol}
                      </span>
                    ) : null}
                  </button>
                );
              }
            )}
          </div>
          <p className="grid-key">
            <span>{t("ui.gridKeyYear")}</span>
            <span>{t("ui.gridMilestones")}</span>
          </p>
        </div>

        {onRewatchLast && (
          <div className="actions">
            <button type="button" className="secondary" onClick={onRewatchLast}>
              {t("feature.rewatchLast")}
            </button>
          </div>
        )}

        <div className="looking-back-card">
          <h3>{t("record.lookingBackTitle")}</h3>
          <p className="looking-back-quote">{reflection}</p>
        </div>

        <EstateSettlement life={life} _locale={locale} t={t} />

        <div className="today-theme-card">
          <div className="theme-header">
            <span className="theme-badge">{theme.title}</span>
            <strong className="theme-name">{theme.themeName}</strong>
          </div>
          <p className="theme-passed">{theme.passedText}</p>
          <p className="theme-stat">{theme.statText}</p>
          <p className="theme-context">{theme.contextText}</p>
        </div>

        <div className="tribute-card">
          <h3>{t("record.wordsForTitle", { name: life.name })}</h3>
          <small className="muted">{t("record.keptOnCard")}</small>
          <textarea
            value={tributeText}
            onChange={(e) => setTributeText(e.target.value)}
            placeholder={t("record.tributePlaceholder")}
            rows={3}
            className="tribute-textarea"
          />
          <div className="tribute-actions">
            <button type="button" className="primary" onClick={handleSaveTribute}>
              {tributeSaved ? `✓ ${t("record.tributeSaved")}` : t("record.saveTribute")}
            </button>
          </div>
        </div>

        <div className="keepsakes-section">
          <div className="section-title-row">
            <h3>{t("record.keepThisLife")}</h3>
            <span className="section-badge">{t("record.ifYouLike")}</span>
          </div>

          <p className="social-pitch-title">{t("record.madeForSocial")}</p>
          <p className="muted">{t("record.socialPitch")}</p>

          <div className="keepsakes-grid">
            <div className="keepsake-card">
              <span className="keepsake-tag">{t("record.teaserLength")}</span>
              <h4>{t("record.teaserTitle")}</h4>
              <p>{t("record.teaserDesc")}</p>
              <button
                type="button"
                className="secondary"
                onClick={onOpenStudio}
              >
                {t("record.previewBtn")}
              </button>
            </div>

            <div className="keepsake-card">
              <span className="keepsake-tag">{t("record.afterCreditsLength")}</span>
              <h4>{t("record.afterCreditsTitle")}</h4>
              <p>{t("record.afterCreditsDesc")}</p>
              <button
                type="button"
                className="secondary"
                onClick={onOpenStudio}
              >
                {t("record.previewBtn")}
              </button>
            </div>

            <div className="keepsake-card">
              <span className="keepsake-tag">{t("record.tenPhotosTitle")}</span>
              <h4>{t("record.tenPhotosTitle")}</h4>
              <p>{t("record.tenPhotosDesc")}</p>
              <button
                type="button"
                className="primary"
                onClick={() => setShowCarousel(true)}
              >
                {t("record.previewBtn")}
              </button>
            </div>
          </div>

          <div className="section-title-row sub-row">
            <h4>{t("record.whatYouCanMake")}</h4>
          </div>

          <div className="audio-preview-row">
            <button
              type="button"
              className="audio-preview-button"
              onClick={play15sAudio}
            >
              {audioRemaining !== null
                ? `▶ ${t("record.playingAudio", { seconds: audioRemaining })}`
                : `▶ ${t("record.watchAudioPreview")}`}
            </button>
          </div>

          <div className="keepsakes-grid">
            <div className="keepsake-card">
              <h4>{t("record.memorialCardTitle")}</h4>
              <p>{t("record.memorialCardDesc")}</p>
            </div>

            <div className="keepsake-card">
              <h4>{t("record.housePastLivesTitle")}</h4>
              <p>{t("record.housePastLivesDesc")}</p>
            </div>

            <div className="keepsake-card">
              <h4>{t("record.lifeFilmCardTitle")}</h4>
              <p>{t("record.lifeFilmCardDesc")}</p>
              {onOpenStudio && (
                <button type="button" className="secondary" onClick={onOpenStudio}>
                  {t("record.previewBtn")}
                </button>
              )}
            </div>

            <div className="keepsake-card">
              <h4>{t("record.lifeAlbumCardTitle")}</h4>
              <p>{t("record.lifeAlbumCardDesc")}</p>
              {onOpenAlbum && (
                <button type="button" className="secondary" onClick={onOpenAlbum}>
                  {t("record.previewBtn")}
                </button>
              )}
            </div>

            <div className="keepsake-card">
              <h4>{t("record.lifeRecordBookCardTitle")}</h4>
              <p>{t("record.lifeRecordBookCardDesc")}</p>
            </div>
          </div>

          <p className="free-notice">{t("record.freeNotice")}</p>
        </div>

        {onOpenShare && (
          <div className="share-trigger-card">
            <h3>{t("feature.shareCard")}</h3>
            <button type="button" className="primary" onClick={onOpenShare}>
              {t("feature.shareCard")}
            </button>
          </div>
        )}

        <div className="five-companions-section">
          <div className="section-title-row">
            <h3>{t("record.fiveCompanionsTitle")}</h3>
            <span className="section-badge">{t("record.shortestLifeFirst")}</span>
          </div>

          <div className="five-companions-list">
            {companionsData.companions.map((comp, idx) => (
              <article
                key={idx}
                className={`companion-card ${comp.isPlayer ? "player-card" : ""}`}
              >
                <div className="comp-header">
                  <span className="comp-age">{comp.age}</span>
                  <strong>{comp.name}</strong>
                  <span className="comp-country">
                    · {comp.country}{" "}
                    {comp.isPlayer && `· ${t("record.thisWasYou")}`}
                  </span>
                </div>
                <p className="comp-bio">{comp.bio}</p>
              </article>
            ))}
          </div>
          <p className="companions-closing">{companionsData.closingText}</p>
        </div>

        {reflectionsList.length > 0 && (
          <div className="thoughts-left-section">
            <h3>{t("record.thoughtsYouLeftTitle")}</h3>
            <div className="thoughts-list">
              {reflectionsList.map(([age, text]) => (
                <div key={age} className="thought-item">
                  <span className="thought-age">{t("record.agePrefix", { age })}</span>
                  <blockquote className="thought-quote">“{text}”</blockquote>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="humanitarian-section">
          <h3>{t("record.causesTitle")}</h3>
          <div className="causes-list">
            {causes.map((c) => (
              <div key={c.id} className="cause-item">
                <h4>{c.title}</h4>
                <p className="cause-where">
                  {c.whereText}:{" "}
                  {c.orgs.map((org, oi) => (
                    <span key={oi}>
                      <a href={org.url} target="_blank" rel="noopener noreferrer">
                        {org.name}
                      </a>
                      {oi < c.orgs.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </p>
                <p className="cause-stat">{c.stat}</p>
              </div>
            ))}
          </div>
          <p className="charity-disclaimer">{t("record.charityDisclaimer")}</p>
        </div>

        <details className="annual-record">
          <summary>{t("record.annual")}</summary>
          <p className="muted">{t("record.annualNote")}</p>
          <div
            className="annual-table-scroll"
            tabIndex={0}
            role="region"
            aria-label={t("record.annual")}
          >
            <table>
              <thead>
                <tr>
                  {[
                    "age",
                    "record.country",
                    "ui.lastJob",
                    "education",
                    "record.focus",
                    "record.income",
                    "record.costs",
                    "record.surplus",
                    "record.cash",
                    "record.debts",
                    "record.childrenAlive",
                    "family.grandchildrenAlive",
                    "record.family",
                    "health",
                    "happiness",
                    "netWorth",
                  ].map((key) => (
                    <th key={key} scope="col">
                      {t(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {life.history.map((row) => (
                  <tr key={row.age}>
                    <th scope="row">
                      {row.age} · {life.birthYear + row.age}
                    </th>
                    {row.annual ? (
                      <>
                        <td>{country(row.annual.country)}</td>
                        <td>{t(`job.${row.annual.job}`)}</td>
                        <td>{qualificationLabel(row.annual.education,row.annual.academic,t)}</td>
                        <td>{recordFocusLabel(row.annual,t)}</td>
                        <td>{money(row.annual.income)}</td>
                        <td>{money(row.annual.totalExpenses)}</td>
                        <td>{money(row.annual.annualSavings)}</td>
                        <td>{money(row.annual.savings)}</td>
                        <td>{money(row.annual.debt)}</td>
                        <td>
                          {row.annual.childrenAlive} / {row.annual.children}
                        </td>
                        <td>
                          {row.annual.grandchildren === null
                            ? t("record.unknown")
                            : `${row.annual.grandchildrenAlive} / ${row.annual.grandchildren}`}
                        </td>
                        <td>{row.annual.relativesAlive}</td>
                      </>
                    ) : (
                      <td colSpan={12}>{t("record.unknown")}</td>
                    )}
                    <td>{Math.round(row.health)}</td>
                    <td>{Math.round(row.happiness)}</td>
                    <td>{money(row.netAssets)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section className="panel">
        <FamilyDescendants life={life} locale={locale} t={t} />
      </section>

      <LifeTimeline life={life} t={t} locale={locale} />

      <div className="record-keepsake-bar">
        <button
          type="button"
          className="ghost sm"
          id="pvPhotos"
          onClick={() => setShowCarousel(true)}
          title={t("ui.photoWall")}
        >
          📷 {t("ui.photoWall")}
        </button>
        <button
          type="button"
          className="ghost sm"
          id="gwOpen"
          onClick={() => setShowWishes(true)}
          title={t("ui.unfulfilledWishesTitle")}
        >
          ✨ {t("ui.unfulfilledWishesTitle")}
        </button>
        <button
          type="button"
          className="ghost sm kph-mine"
          id="kpRoomTry"
          onClick={() => {
            if (onOpenRoom) onOpenRoom(life);
          }}
          title={t("ui.kpRoomTry")}
        >
          <canvas className="kp-roomcv" width={36} height={20} aria-hidden="true" />
          <span className="kph-go">🎨 {t("ui.kpRoomTry")}</span>
        </button>
      </div>

      <div className="panel farlife" id="memoFarBox">
        <p>{t("ui.farLifeDesc")}</p>
        <div className="farlife-actions">
          <button
            type="button"
            className="ghost sm"
            id="memoFarDead"
            data-iso={life.country.id}
            onClick={() => {
              window.location.href = `/${locale}/memorial`;
            }}
          >
            {t("ui.memoFarDead")}
          </button>
          <button
            type="button"
            className="ghost sm"
            id="memoRand"
            onClick={() => {
              window.location.href = `/${locale}/memorial`;
            }}
          >
            {t("ui.memoRand")}
          </button>
        </div>
      </div>

      <div className="dead-foot" id="deadFoot">
        {onOpenShare && (
          <button type="button" className="ghost" id="dfShare" onClick={onOpenShare}>
            <Share2 size={16} aria-hidden="true" />
            {t("feature.shareFriends")}
          </button>
        )}
        <button
          type="button"
          className="cta"
          id="dfAgain"
          onClick={() => {
            if (onBornAgain) onBornAgain();
            else window.location.reload();
          }}
        >
          {t("ui.bornAgain")}
        </button>
      </div>

      {showCarousel && (
        <PhotoCarousel
          life={life}
          locale={locale}
          t={t}
          onClose={() => setShowCarousel(false)}
        />
      )}

      {showWishes && (
        <UnfulfilledWishesModal
          life={life}
          locale={locale}
          t={t}
          onClose={() => setShowWishes(false)}
        />
      )}
    </>
  );
}
