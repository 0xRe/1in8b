import { useState,useEffect } from "react";
import type { Life, Companion } from "../game/types";
import type { Locale, translator } from "../lib/i18n";
import { countryName } from "../game/countries";

type T = ReturnType<typeof translator>;

export function getCompanionStatus(c: Companion, _currentAge: number, _locale: Locale, t: T): string {
  if (!c.alive) {
    const causeText = c.cause ? t(c.cause) : t("died");
    return `† at ${c.deathAge ?? c.age} · ${causeText}`;
  }
  if (c.age < 6) {
    return t("infancy");
  }
  if (c.job === "student" || (c.age < 18 && c.job === "none")) {
    return t("student");
  }
  const parts: string[] = [];
  if (c.job && c.job !== "none") {
    parts.push(t(`job.${c.job}`));
  }
  if (c.children > 0) {
    parts.push(c.children === 1 ? t("ui.oneChild") : t("ui.childrenCount", { n: c.children }));
  }
  return parts.length > 0 ? parts.join(" · ") : t("student");
}

export function LiveCompanions({ life, locale, t }: { life: Life; locale: Locale; t: T }) {
  const [folded, setFolded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("1in8bn.compsFolded");
      if (saved === "1") setFolded(true);
    } catch {}
  }, []);

  const toggleFold = () => {
    setFolded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("1in8bn.compsFolded", next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  if (!life.companions || life.companions.length === 0) return null;

  return (
    <div className="panel p-comps">
      <h3>
        <span>{t("ui.bornSameSecond")}</span>
        <span className="lbl">{t("ui.atThisSameAge")}</span>
        <button
          type="button"
          className="foldbtn"
          data-fold="p-comps"
          aria-expanded={!folded}
          aria-label={t(folded ? "ui.unfold" : "ui.fold")}
          onClick={toggleFold}
        />
      </h3>
      {!folded && (
        <ul className="comps" id="compList">
          {life.companions.map((c) => {
            const statusText = getCompanionStatus(c, life.age, locale, t);
            const isSelected = selectedId === c.id;
            return (
              <li
                key={c.id}
                className={`${c.alive ? "" : "gone"}${isSelected ? " active" : ""}`}
                onClick={() => setSelectedId(isSelected ? null : c.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(isSelected ? null : c.id);
                  }
                }}
              >
                <span className="cn">
                  {c.name}
                  <small>
                    {countryName(c.country, locale)} · {t(c.sex === "M" ? "male" : "female")}
                  </small>
                </span>
                <span className="cs">{statusText}</span>
                {isSelected && (
                  <div className="comp-detail">
                    <span>
                      {t("happiness")}: {Math.round(c.happiness)}
                    </span>
                    <span>
                      {t("netWorth")}: {t.money(c.netAssets)}
                    </span>
                    {c.children > 0 && (
                      <span>
                        {t("children")}: {c.children}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
