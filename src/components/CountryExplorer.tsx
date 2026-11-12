import { useMemo, useState } from "react";
import {
  getCountries,
  countryName,
  countryProbability,
} from "../game/countries";
import type { Country } from "../game/types";
import type { Locale, translator } from "../lib/i18n";
export function CountryExplorer({
  locale,
  t,
}: {
  locale: Locale;
  t: ReturnType<typeof translator>;
}) {
  const [query, setQuery] = useState(""),
    [sort, setSort] = useState<"births" | "le" | "ppp" | "u5">("births"),
    [direction, setDirection] = useState(-1),
    [selected, setSelected] = useState<Country | null>(null);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = getCountries();
    const filtered = q
      ? all.filter((c) =>
          (countryName(c, locale) + c.name_en)
            .toLowerCase()
            .includes(q),
        )
      : all;
    return filtered.sort((a, b) => (a[sort] - b[sort]) * direction);
  }, [query, sort, direction, locale]);
  return (
    <>
      <input
        placeholder={t("searchCountry")}
        aria-label={t("searchCountry")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="country-table">
        <table>
          <thead>
            <tr>
              <th>{t("country")}</th>
              {(
                [
                  ["births", "birthOdds"],
                  ["le", "lifeExpectancy"],
                  ["ppp", "gdp"],
                  ["u5", "underFive"],
                ] as const
              ).map(([key, label]) => (
                <th key={key}>
                  <button
                    onClick={() => {
                      setSort(key);
                      setDirection(sort === key ? -direction : -1);
                    }}
                  >
                    {t(label)} {sort === key ? (direction < 0 ? "↓" : "↑") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <th>
                  <button onClick={() => setSelected(c)}>
                    {c.flag} {countryName(c, locale)}
                  </button>
                </th>
                <td>{(countryProbability(c, "births") * 100).toFixed(2)}%</td>
                <td>{c.le}</td>
                <td>{t.money(c.ppp)}</td>
                <td>{c.u5}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <section className="country-selection">
          <h3>
            {selected.flag} {countryName(selected, locale)}
          </h3>
          <dl>
            {[
              ["population", (selected.pop * 1000).toLocaleString(locale)],
              ["birthsYear", selected.births.toLocaleString(locale)],
              ["schoolYears", selected.eys],
              ["internet", `${selected.net}%`],
              ["fertility", selected.tfr],
              ["urbanPopulation", `${selected.urb}%`],
            ].map(([key, v]) => (
              <div key={key}>
                <dt>{t(String(key))}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <p className="tiny">{t("dataNote")}</p>
    </>
  );
}
