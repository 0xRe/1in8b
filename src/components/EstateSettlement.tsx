
import type { Life } from "../game/types";
import type { Locale, translator } from "../lib/i18n";

type T = ReturnType<typeof translator>;

export interface HeirRow {
  name: string;
  relationship: string;
  amount: number;
}

export function computeEstateSettlement(life: Life, t: T): { summary: string; rows: HeirRow[] } {
  const total = Math.max(0, Math.round(life.stats.netAssets));

  if (life.stats.netAssets <= 0) {
    return { summary: t("ui.estateDebtSettled"), rows: [] };
  }
  if (total < 500) {
    return { summary: t("ui.estateModest"), rows: [] };
  }

  const partner = life.family.partner?.alive ? life.family.partner : null;
  const livingChildren = life.family.children.filter((ch) => ch.alive);
  const livingParents = life.family.parents.filter((p) => p.alive);

  const rows: HeirRow[] = [];

  if (partner && livingChildren.length > 0) {
    const partnerAmount = Math.round(total * 0.5);
    const childAmount = Math.round((total * 0.5) / livingChildren.length);
    rows.push({
      name: partner.name,
      relationship: t("ui.heirSpouse"),
      amount: partnerAmount,
    });
    for (const ch of livingChildren) {
      rows.push({
        name: ch.name,
        relationship: t("ui.heirChild"),
        amount: childAmount,
      });
    }
    return { summary: t("ui.estateSpouseChildren"), rows };
  }

  if (partner) {
    rows.push({
      name: partner.name,
      relationship: t("ui.heirSpouse"),
      amount: total,
    });
    return { summary: t("ui.estateSpouseOnly"), rows };
  }

  if (livingChildren.length > 0) {
    const childAmount = Math.round(total / livingChildren.length);
    for (const ch of livingChildren) {
      rows.push({
        name: ch.name,
        relationship: t("ui.heirChild"),
        amount: childAmount,
      });
    }
    return { summary: t("ui.estateChildrenOnly"), rows };
  }

  if (livingParents.length > 0) {
    const parentAmount = Math.round(total / livingParents.length);
    for (const p of livingParents) {
      rows.push({
        name: p.name,
        relationship: t("ui.heirParent"),
        amount: parentAmount,
      });
    }
    return { summary: t("ui.estateParents"), rows };
  }

  rows.push({
    name: t("ui.heirCommunity"),
    relationship: t("ui.heirCommunity"),
    amount: total,
  });
  return { summary: t("ui.estateSolitary"), rows };
}

export function EstateSettlement({ life, t }: { life: Life; _locale?: Locale; t: T }) {
  if (life.age < 18) return null;

  const { summary, rows } = computeEstateSettlement(life, t);

  return (
    <div className="panel estate-panel">
      <div className="section-title-row">
        <h3>{t("ui.estateTitle")}</h3>
        <span className="section-badge">{t("ui.estateTaxNote")}</span>
      </div>
      <p className="ctx muted">{summary}</p>
      {rows.length > 0 && (
        <ul className="estate-rows">
          {rows.map((row, idx) => (
            <li key={idx} className="estate-row">
              <span className="estate-amount">{t.money(row.amount)}</span>
              <span className="estate-heir">
                <strong>{row.name}</strong>
                <small className="muted"> · {row.relationship}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
