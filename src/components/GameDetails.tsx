import {hobbyDisplayKey} from '../game/physical-hobbies';
import {hobbyPracticeBlocked} from '../game/named-sports';
import {hobbyPurchasePlan,hobbyPurchaseAllowed} from '../game/hobby-purchase';
import {automaticLessonTarget,automaticLessonsAvailable,hobbyLessonPrice} from '../game/hobby-lessons';
import {toggleAutomaticHobbyLessons} from '../game/engine';
import {annualCraftIncome} from '../game/hobby-milestones';
import {replacedHobby} from '../game/hobby-catalog';
import {hobbySpendingAccess} from '../game/hobby-spending';
import {annualHobbyCost,hobbyCostBeforePause} from '../game/hobby-runtime';
import {percentileOfIncome, worldIncomePercentile} from '../game/income-distribution';
import { useState } from "react";
import type { Life } from "../game/types";
import {
  HOBBIES,
  requestHobbyChoices,
  toggleHobbySpending,
  hobbySearchAvailable,
  hobbySearchPrice,
  setLifestyle,
  setAnnualSpending,
  availableActivities,
  requestActivity,
  activityPrice,
  adoptPet,
  PET_KINDS,
  chooseHobby,
  trainHobby,
  buyBelonging,
  requestJobOffers,
  relocate,
  purchasePrice,
  hobbyTrainingPrice,
  relocationPrice,
} from "../game/engine";
import type { translator, Locale } from "../lib/i18n";
import { countryName, getCountryById } from "../game/countries";
type T = ReturnType<typeof translator>;
export function LifeDetails({ life, t }: { life: Life; t: T }) {
  if (!life.mechanicsVersion) return null;
  return (
    <dl className="life-detail-list">
      <div>
        <dt>{t("ui.temperament")}</dt>
        <dd>{t(`temperament.${life.temperament.kind}`)}</dd>
      </div>
      <div>
        <dt>{t("ui.talents")}</dt>
        <dd>{life.talents.map((id) => t(`hobby.${id}`)).join(" · ") || "—"}</dd>
      </div>
      {life.physicalState?.condition?.recognizedAge!==undefined && <div>
        <dt>{t('physical.heading')}</dt>
        <dd>{t(`physical.kind.${life.physicalState.condition.kind}`)} · {t('physical.observed',{age:life.physicalState.condition.recognizedAge})}
          {life.physicalState.condition.cerebralPalsy&&<><br/>{t(`physical.cerebralPalsy.${life.physicalState.condition.cerebralPalsy.kind}`)}</>}
          <br/>{t(life.physicalState.condition.aid?'physical.aidAvailable':'physical.aidUnavailable')}
        </dd>
      </div>}
      {life.physicalState?.support&&<div><dt>{t('physical.heading')}</dt><dd>{t('physical.supportReceived',life.physicalState.support)}</dd></div>}
      {life.academics?.major && <div><dt>{t("major.heading")}</dt><dd>{t(`major.${life.academics.major}`)}</dd></div>}
      <div>
        <dt>{t("ui.hobbies")}</dt>
        <dd>
          {life.hobbies.map((h) => (
            <span key={h.id}>
              {t(hobbyDisplayKey(life,h.id))} · {h.progress ? `${t("hobby.level",{level:Math.round(h.progress.level*10)/10})} · ${t("hobby.since",{age:h.progress.since})}` : Math.floor(h.skill)}
              <br />
            </span>
          ))}
        </dd>
      </div>
      {life.hobbyState?.lifeStories?.sharedPartner && <div>
        <dt>{t("hobby.sharedMemory")}</dt>
        <dd>{t("hobby.sharedMemoryDetail",{hobby:t(`hobby.${life.hobbyState.lifeStories.sharedPartner.label??life.hobbyState.lifeStories.sharedPartner.hobby}`),name:life.hobbyState.lifeStories.sharedPartner.name,age:life.hobbyState.lifeStories.sharedPartner.age})}</dd>
      </div>}
      <div>
        <dt>{t("ui.belongings")}</dt>
        <dd>
          {[
            life.belongings.phone ? t("ui.phone") : null,
            life.belongings.transport !== "none"
              ? t(`ui.${life.belongings.transport}`)
              : null,
            life.belongings.housing === "owned" ? t("ui.owned") : null,
          ]
            .filter(Boolean)
            .join(" · ") || "—"}
        </dd>
      </div>
    </dl>
  );
}
export function Budget({ life, t, locale = 'en' }: { life: Life; t: T; locale?: Locale }) {
  if (!life.mechanicsVersion || life.age < 15) return null;
  const effectiveIncome = life.stats.annualIncome || (life.relationship?.partnerIncome ?? 0);
  const natPct = percentileOfIncome(life.country, effectiveIncome);
  const worldPct = worldIncomePercentile(effectiveIncome);
  const formatRank = (pct: number) => {
    const clamped = Math.max(0.01, Math.min(0.99, pct));
    if (clamped >= 0.5) {
      return t("ui.topPercentile", { n: Math.max(1, Math.round((1 - clamped) * 100)) });
    }
    return t("ui.bottomPercentile", { n: Math.max(1, Math.round(clamped * 100)) });
  };
  const keys = [
    "tax",
    "food",
    "housing",
    "transport",
    "health",
    "leisure",
    "education",
    "dependents",
  ] as const;
  return (
    <section className="budget">
      <h4>{t("ui.budget")}</h4>
      <div className="budget-bar" role="img" aria-label={t("ui.budget")}>
        {keys.map((k, i) => (
          <span
            key={k}
            style={{
              width: `${life.budget.totalExpenses ? (life.budget[k] / life.budget.totalExpenses) * 100 : 0}%`,
              background: [
                "#4e6960",
                "#a9b89c",
                "#8d6c60",
                "#4e807e",
                "#8c1d3c",
                "#b49957",
                "#707c97",
                "#aa8d92",
              ][i],
            }}
          />
        ))}
      </div>
      <dl>
        {annualCraftIncome(life)>0 && <div><dt>{t("hobby.craftIncome")}</dt><dd>{t.money(annualCraftIncome(life))}</dd></div>}
        {keys.map((k) => (
          <div key={k}>
            <dt>
              {t(
                `ui.${k === "health" ? "healthcare" : k === "education" ? "educationCost" : k}`,
              )}
            </dt>
            <dd>{t.money(life.budget[k])}</dd>
          </div>
        ))}
        <div>
          <dt>{t("ui.annualSavings")}</dt>
          <dd>{t.money(life.budget.annualSavings)}</dd>
        </div>
        <div>
          <dt>{t("ui.debt")}</dt>
          <dd>{t.money(life.stats.debt)}</dd>
        </div>
      </dl>
      <div className="budget-rank">
        <small>{t("ui.incomeRank")}</small>
        <strong>
          {countryName(life.country, locale)}: {formatRank(natPct)} · {t("ui.world")}: {formatRank(worldPct)}
        </strong>
      </div>
      <div className="owns-grid">
        <div className="owns-item">
          <small>{t("ui.belongings")}</small>
          <span>
            {life.stats.netAssets > 2000 ? `${t("ui.smartphone")}, ${t("ui.bicycle")}` : t("ui.smartphone")}
          </span>
        </div>
        <div className="owns-item">
          <small>{t("ui.gettingAround")}</small>
          <span>
            {life.stats.netAssets > 15000 && life.budget.transport > 800
              ? t("ui.personalCar")
              : life.budget.transport > 200
                ? t("ui.sharedTransit")
                : t("ui.walking")}
          </span>
        </div>
      </div>
    </section>
  );
}
export function LifeActions({
  life,
  t,
  onChange,
  onDecision,
}: {
  life: Life;
  t: T;
  onChange: (fn: (l: Life) => Life) => void;
  onDecision?: () => void;
}) {
  const [petName, setPetName] = useState("");
  if (!life.mechanicsVersion) return null;
  const unavailable = !life.alive || !!life.pendingDecision;
  const observed=life.academics?.origin==='birth';
  const spendingAccess=hobbySpendingAccess(life);
  const pausedSpending=life.hobbyState?.pausedSince!==undefined;
  const replacement=observed?replacedHobby(life.hobbies):null;
  const lessonPlans=new Map(life.hobbies.filter(h=>observed&&h.progress).map(h=>[h.id,hobbyPurchasePlan(life,hobbyTrainingPrice(life,h.id))]));
  const searchPlan=hobbyPurchasePlan(life,hobbySearchPrice(life));
  return (
    <div className="life-actions">
      <h3>{t("ui.hobbies")}</h3>
      {life.hobbies.map((h) => (
        <div className="hobby-row" key={h.id}>
          <span>
            {t(hobbyDisplayKey(life,h.id))}
            <small>
              {h.progress ? `${t("hobby.level",{level:Math.round(h.progress.level*10)/10})} · ${t("hobby.since",{age:h.progress.since})}` : `${t("ui.hobbySkill")}: ${Math.floor(h.skill)}/100`}
            </small>
            {hobbyPracticeBlocked(life,h.id)&&<small>{t('hobby.sidelinesHelp')}</small>}
            {!h.progress && <meter min="0" max="100" value={h.skill} />}
          </span>
          <button
            disabled={
              unavailable ||
              (observed && h.progress ? life.age<15 || life.justice.prisonUntil!==null || hobbyPracticeBlocked(life,h.id) || life.hobbyState?.lastActionAge===life.age || !h.progress : h.trainedAt === life.age) ||
              (lessonPlans.has(h.id)?!hobbyPurchaseAllowed(lessonPlans.get(h.id)!):life.stats.savings < hobbyTrainingPrice(life, h.id))
            }
            onClick={() => onChange((l) => trainHobby(l, h.id))}
          >
            {t(observed && h.progress ? "hobby.lessons" : "ui.trainHobby")} · {t.money(hobbyTrainingPrice(life, h.id))}
            {lessonPlans.get(h.id)?.kind==='credit'&&<> · {t('hobby.purchaseBorrow',{amount:t.money(lessonPlans.get(h.id)!.borrowed)})}</>}
            {lessonPlans.get(h.id)?.investmentDraw!>0&&<> · {t('hobby.purchaseInvestments')}</>}
          </button>
        </div>
      ))}
      {!observed && life.hobbies.length < 3 && life.age >= 7 && (
        <details>
          <summary>{t("ui.chooseHobby")}</summary>
          <div className="focus-options">
            {HOBBIES.filter((id) => !life.hobbies.some((h) => h.id === id)).map(
              (id) => (
                <button
                  key={id}
                  disabled={unavailable}
                  onClick={() => onChange((l) => chooseHobby(l, id))}
                >
                  {t(`hobby.${id}`)}
                </button>
              ),
            )}
          </div>
        </details>
      )}
      {observed && <div className="hobby-actions">
        {replacement && <p className="muted">{t("hobby.replace",{hobby:t(hobbyDisplayKey(life,replacement.id))})}</p>}
        {annualCraftIncome(life)>0 && <p className="muted">{t("hobby.craftIncomeHelp",{amount:t.money(annualCraftIncome(life))})}</p>}
        {life.age>=18 && life.hobbies.length>0 && <p className="muted">{t("hobby.annualCost",{amount:t.money(annualHobbyCost(life))})}</p>}
        {life.age>=18 && life.hobbies.some(h=>h.progress) && (pausedSpending||spendingAccess!=='unavailable') && <div className="hobby-spending-control">
          <button disabled={unavailable||spendingAccess!=='available'} onClick={()=>onChange(l=>toggleHobbySpending(l))}>{t(pausedSpending?'hobby.resumeSpending':'hobby.pauseSpending')}</button>
          <p className="muted">{t(pausedSpending?'hobby.pausedSpending':'hobby.pauseSpendingHelp',{amount:t.money(hobbyCostBeforePause(life))})}</p>
          {spendingAccess==='unknown'&&<p className="muted">{t('hobby.unknownSpendingAccess')}</p>}
        </div>}
        {life.age>=15 && (automaticLessonTarget(life)||life.hobbyState?.automaticLessons) && <div className="hobby-auto-control">
          <button aria-pressed={!!life.hobbyState?.automaticLessons} disabled={!automaticLessonsAvailable(life)} onClick={()=>onChange(toggleAutomaticHobbyLessons)}>{t('hobby.autoLessons')} · {t(life.hobbyState?.automaticLessons?'hobby.autoOn':'hobby.autoOff')}</button>
          <p className="muted">{t('hobby.autoHelp',{hobby:automaticLessonTarget(life)?t(hobbyDisplayKey(life,automaticLessonTarget(life)!.id)):t('hobby.autoNoTarget'),amount:t.money(hobbyLessonPrice(life))})}</p>
          {automaticLessonTarget(life)&&hobbyPracticeBlocked(life,automaticLessonTarget(life)!.id)&&<p role="status">{t('hobby.autoBlocked')}</p>}
          {life.hobbyState?.automaticLessons?.pausedForFunds&&<p role="status">{t('hobby.autoWaiting')}</p>}
        </div>}
        {life.age>=10 && <button disabled={unavailable || !hobbySearchAvailable(life) || !hobbyPurchaseAllowed(searchPlan)} onClick={()=>onChange(l=>requestHobbyChoices(l))}>{t("hobby.find")} · {t.money(hobbySearchPrice(life))}{searchPlan.kind==='credit'&&<> · {t('hobby.purchaseBorrow',{amount:t.money(searchPlan.borrowed)})}</>}{searchPlan.investmentDraw>0&&<> · {t('hobby.purchaseInvestments')}</>}</button>}
        {(searchPlan.kind==='credit'||[...lessonPlans.values()].some(p=>p.kind==='credit'))&&<p className="muted">{t('hobby.purchaseGameMoney')}</p>}
        {(searchPlan.kind==='unknown'||[...lessonPlans.values()].some(p=>p.kind==='unknown'))&&<p className="muted">{t('hobby.purchaseUnknown')}</p>}
        {life.hobbyState?.queuedAge!==undefined && <p role="status">{t("hobby.searchQueued")}</p>}
        {life.hobbyState?.lastActionAge===life.age && <p className="muted">{t("hobby.practiceDone")}</p>}
      </div>}
      {life.age >= 15 && (
        <>
          <h3>{t("ui.activities")}</h3>
          <div className="choices">
            {availableActivities(life)
              .filter((id) => id !== "adoptPet")
              .map((id) => (
                <button
                  disabled={unavailable}
                  key={id}
                  onClick={() => {
                    onChange((l) => requestActivity(l, id));
                    onDecision?.();
                  }}
                >
                  {t(`activity.${id}`)}
                  {activityPrice(life, id) > 0 && (
                    <small>{t.money(activityPrice(life, id))}</small>
                  )}
                </button>
              ))}
          </div>
          {life.age >= 18 && (
            <>
              <h3>{t("ui.lifestyle")}</h3>
              {Object.entries({
                diet: ["balanced", "healthy", "convenient"],
                insurance: ["basic", "full"],
                gifts: ["generous", "modest", "attendance"],
              }).map(([key, values]) => (
                <fieldset key={key}>
                  <legend>{t(`ui.${key}`)}</legend>
                  <div className="segments">
                    {values.map((value) => (
                      <button
                        disabled={unavailable}
                        key={value}
                        aria-pressed={
                          life.lifestyle?.[key as keyof Life["lifestyle"]] ===
                          value
                        }
                        onClick={() =>
                          onChange((l) => setLifestyle(l, key, value))
                        }
                      >
                        {t(`lifestyle.${value}`)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
              <h3>{t("ui.annualSpending")}</h3><p>{t.moneyLabel}</p>
              <p className="muted">{t("ui.autoSpendHelp")}</p>
              <div className="annual-spending">
                {["health", "education", "experiences", "giving", "family"].map(
                  (key) => (
                    <label key={key}>
                      {t(`spend${key[0].toUpperCase() + key.slice(1)}`)}
                      <input
                        type="number"
                        min="0"
                        max={t.displayAmount(1000000)}
                        step="any"
                        value={Number(t.displayAmount(
                          life.annualSpending?.[
                            key as keyof Life["annualSpending"]
                          ] ?? 0).toFixed(2))
                        }
                        disabled={unavailable}
                        onChange={(e) =>
                          onChange((l) =>
                            setAnnualSpending(l, key, t.baseAmount(Number(e.target.value))),
                          )
                        }
                      />
                    </label>
                  ),
                )}
              </div>
            </>
          )}
          <h3>{t("ui.pets")}</h3>
          {life.pets?.map((p) => (
            <p key={p.id}>
              {p.name || t(`pet.${p.kind}`)} · {t(`pet.${p.kind}`)} · {p.age} ·{" "}
              {t(p.alive ? "alive" : "died")}
            </p>
          ))}
          {availableActivities(life).includes("adoptPet") && (
            <details>
              <summary>{t("activity.adoptPet")}</summary>
              <label>
                {t("ui.petName")}
                <input
                  maxLength={40}
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                />
              </label>
              <div className="segments">
                {PET_KINDS.map((kind) => (
                  <button
                    key={kind}
                    disabled={
                      unavailable ||
                      life.stats.savings < activityPrice(life, "adoptPet")
                    }
                    onClick={() => {
                      onChange((l) => adoptPet(l, kind, petName));
                      setPetName("");
                    }}
                  >
                    {t(`pet.${kind}`)}
                  </button>
                ))}
              </div>
            </details>
          )}
          <h3>{t("ui.belongings")}</h3>
          <div className="choices">
            {(["phone", "bicycle", "car", "housing"] as const).map(
              (category) => {
                const owned =
                  category === "phone"
                    ? life.belongings.phone
                    : category === "housing"
                      ? life.belongings.housing === "owned"
                      : life.belongings.transport === category;
                return (
                  <button
                    key={category}
                    disabled={
                      owned ||
                      unavailable ||
                      life.stats.savings < purchasePrice(life, category)
                    }
                    onClick={() => onChange((l) => buyBelonging(l, category))}
                  >
                    {t(`ui.${category}`)}
                    <span>
                      {owned ? "✓" : t.money(purchasePrice(life, category))}
                    </span>
                  </button>
                );
              },
            )}
          </div>
          <div className="actions">
            <button
              className="secondary"
              disabled={unavailable}
              onClick={() => {
                const next = requestJobOffers(life);
                if (next === life) return;
                onChange(() => next);
                if (next.pendingDecision) onDecision?.();
              }}
            >
              {t("ui.jobOffers")}
            </button>
            <button
              className="secondary"
              disabled={
                unavailable ||
                life.residence === "urban" ||
                life.stats.savings < relocationPrice(life)
              }
              onClick={() => {
                const next = relocate(life);
                if (next === life) return;
                onChange(() => next);
                if (next.pendingDecision) onDecision?.();
              }}
            >
              {t("ui.relocate")} · {t.money(relocationPrice(life))}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
export function ActualComparison({
  life,
  t,
  locale,
}: {
  life: Life;
  t: T;
  locale: Locale;
}) {
  const actual = life.settings.realCountry ? getCountryById(life.settings.realCountry) : undefined;
  if (!actual) return null;
  return (
    <section className="panel actual-comparison">
      <h3>{t("ui.actualComparison")}</h3>
      <table>
        <thead>
          <tr>
            <th />
            <th>
              {actual.flag} {countryName(actual, locale)}
            </th>
            <th>
              {life.country.flag} {countryName(life.country, locale)}
            </th>
          </tr>
        </thead>
        <tbody>
          {[
            ["lifeExpectancy", "le"],
            ["gdp", "ppp"],
            ["schoolYears", "eys"],
            ["underFive", "u5"],
          ].map(([label, key]) => (
            <tr key={key}>
              <th>{t(label)}</th>
              <td>{Number(actual[key as "le"]).toLocaleString(locale)}</td>
              <td>
                {Number(life.country[key as "le"]).toLocaleString(locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
