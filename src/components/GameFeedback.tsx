import { useEffect, useRef, useState } from "react";
import type { translator } from "../lib/i18n";
import type { Consequence, JournalEntry } from "../lib/game-feedback";

type T = ReturnType<typeof translator>;

/** Shows what the last decision changed; it fades on its own and never blocks play. */
export function ConsequenceCard({ consequence, t, onDone }: { consequence: Consequence | null; t: T; onDone: () => void }) {
  useEffect(() => {
    if (!consequence) return;
    const timer = setTimeout(onDone, 5200);
    return () => clearTimeout(timer);
  }, [consequence?.id]);
  if (!consequence) return null;
  const chips: { label: string; good: boolean }[] = consequence.stats.map((s) => ({ label: `${t(s.key)} ${s.delta > 0 ? "+" : "−"}${Math.abs(s.delta)}`, good: s.delta > 0 }));
  if (consequence.job) chips.push({ label: t(`job.${consequence.job}`), good: true });
  if (consequence.income) chips.push({ label: `${t("annualIncome")} ${consequence.income > 0 ? "+" : "−"}${t.money(Math.abs(consequence.income))}`, good: consequence.income > 0 });
  if (consequence.savings) chips.push({ label: `${t("savings")} ${consequence.savings > 0 ? "+" : "−"}${t.money(Math.abs(consequence.savings))}`, good: consequence.savings > 0 });
  return (
    <div className="consequence" role="status" key={consequence.id}>
      <small>{t("feel.youChose")}</small>
      <strong>{t(consequence.choiceKey, consequence.choiceParams)}</strong>
      {chips.length > 0 && (
        <ul>
          {chips.map((chip) => (
            <li key={chip.label} data-good={chip.good ? "true" : "false"}>{chip.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A short title card when a life enters a new chapter. */
export function ChapterCard({ chapter, t, onDone }: { chapter: { number: number; key: string; age: number } | null; t: T; onDone: () => void }) {
  useEffect(() => {
    if (!chapter) return;
    const timer = setTimeout(onDone, 3200);
    return () => clearTimeout(timer);
  }, [chapter?.key]);
  if (!chapter) return null;
  return (
    <div className="chapter-card" role="status" key={chapter.key}>
      <small>{t("feel.chapterLabel", { n: chapter.number })} · {t("age")} {chapter.age}</small>
      <strong>{t(chapter.key)}</strong>
    </div>
  );
}

/** Briefly shows how much a status value moved since it was last rendered. */
export function StatDelta({ value }: { value: number }) {
  const previous = useRef(Math.round(value));
  const [delta, setDelta] = useState<{ n: number; id: number } | null>(null);
  useEffect(() => {
    const rounded = Math.round(value), change = rounded - previous.current;
    previous.current = rounded;
    if (!change) return;
    const id = Date.now();
    setDelta({ n: change, id });
    const timer = setTimeout(() => setDelta((d) => (d?.id === id ? null : d)), 2400);
    return () => clearTimeout(timer);
  }, [Math.round(value)]);
  if (!delta) return null;
  return (
    <em className="stat-delta" data-good={delta.n > 0 ? "true" : "false"} key={delta.id} aria-hidden="true">
      {delta.n > 0 ? "+" : "−"}{Math.abs(delta.n)}
    </em>
  );
}

/** Money amounts in choice labels are formatted the same way the decision dialog shows them. */
export function choiceLabel(entry: Pick<JournalEntry, "decisionKey" | "choiceKey" | "choiceParams">, t: T) {
  const money = (entry.decisionKey.startsWith("decision.health") || entry.decisionKey.startsWith("decision.descendant")) && typeof entry.choiceParams.amount === "number";
  return t(entry.choiceKey, money ? { ...entry.choiceParams, amount: t.money(entry.choiceParams.amount as number) } : entry.choiceParams);
}

/** The ending's list of the questions this life answered and what the player chose. */
export function ChoiceJournal({ entries, t }: { entries: JournalEntry[]; t: T }) {
  const [all, setAll] = useState(false);
  if (!entries.length) return null;
  const shown = all ? entries : entries.slice(0, 8);
  return (
    <section className="choice-journal">
      <h2>{t("feel.journalTitle")}</h2>
      <ol>
        {shown.map((entry) => (
          <li key={entry.eventId}>
            <span className="choice-journal-age">{t("age")} {entry.age}</span>
            <div>
              <p>{t(entry.decisionKey, entry.decisionParams)}</p>
              <strong>{choiceLabel(entry, t)}</strong>
            </div>
          </li>
        ))}
      </ol>
      {entries.length > shown.length && (
        <button type="button" className="secondary choice-journal-more" onClick={() => setAll(true)}>
          {t("feel.journalAll", { n: entries.length })}
        </button>
      )}
    </section>
  );
}

/** Keeps the next life one click away while the ending is being read. */
export function EndingBar({ visible, onAgain, onKeep, t }: { visible: boolean; onAgain: () => void; onKeep: () => void; t: T }) {
  return (
    <div className="ending-bar" data-visible={visible ? "true" : undefined} aria-hidden={!visible}>
      <button className="primary" tabIndex={visible ? 0 : -1} onClick={onAgain}>{t("again")}</button>
      <button className="secondary" tabIndex={visible ? 0 : -1} onClick={onKeep}>{t("keepsakes")}</button>
    </div>
  );
}
