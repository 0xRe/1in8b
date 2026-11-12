import {guardianHome,guardianArrangement} from '../game/grandchild-guardianship-runtime';
import {childImprisoned} from '../game/child-prison';
import type { Life, Person } from "../game/types";
import { countryName, getCountryById } from "../game/countries";
import type { Locale, translator } from "../lib/i18n";
type Props = {
  life: Life;
  locale: Locale;
  t: ReturnType<typeof translator>;
};
/** Children retain their own household; grandchildren are nested under their parent. */
export function FamilyDescendants({ life, locale, t }: Props) {
  const money = t.money;
  const country = (id: string) => {
    const value = getCountryById(id);
    return value ? `${value.flag} ${countryName(value, locale)}` : id;
  };
  const identity = (p: Omit<Person, "job">) => (
    <>
      <strong>{p.name}</strong> · {t("age")} {p.age}
      <small>
        {t(p.alive ? "alive" : "died")} · {country(p.country)}
      </small>
    </>
  );
  return (
    <section className="descendant-family" aria-label={t("children")}>
      <h4>
        {t("children")} · {life.family.children.filter((c) => c.alive).length} /{" "}
        {life.family.children.length}
      </h4>

      {life.descendants.observedSince > life.birthYear &&
        life.family.children.some((c) => c.birthYear + 18 < life.descendants.observedSince) && (
          <p className="muted">{t("family.legacy")}</p>
        )}
      {life.family.children.length ? (
        life.family.children.map((child) => {
          const state = life.descendants.children.find((c) => c.childId === child.id),
            grandchildren = life.descendants.grandchildren.filter((g) => g.parentId === child.id);
          const inPrison = childImprisoned(child.alive, state?.prison, life.year);
          return (
            <article
              className={`descendant-household${child.alive ? "" : " descendant-deceased"}`}
              key={child.id}
            >
              <p>{identity(child)}</p>
              {state && (
                <>
                  <p>
                    {t(`family.education.${state.education}`)}
                    <small>
                      {inPrison ? t("family.custodyWork") : state.supportedWork&&state.employment!=="retired"?t(`family.supportedWork.${state.supportedWork.kind==='dayActivities'&&!state.supportedWork.richAccess?'homeCare':state.supportedWork.kind}`):t(`family.employment.${state.employment}`)}
                      {!inPrison && !state.supportedWork && !["none", "student", "retired"].includes(child.job) &&
                        ` · ${t(`job.${child.job}`)}`}
                    </small>
                  </p>
                  {state.carePlan && <p className="muted">{t(`family.carePlan.${state.carePlan.kind}`,state.carePlan.kind==='sibling'?{name:state.carePlan.siblingName}:{})}</p>}
                  <p>
                    {inPrison ? t("family.inPrison", {year: state.prison!.endYear}) : t(`family.${state.residence}`)}
                    <small>{inPrison ? t("family.custodyIncome") : state.supportedWork?null:t("family.income", { amount: money(state.income) })}</small>
                    {state.contribution > 0 && (
                      <small>
                        {t("family.contribution", { amount: money(state.contribution) })}
                      </small>
                    )}
                  </p>
                  {state.migratedYear !== null && (
                    <p>
                      {t("family.migrated", { year: state.migratedYear })}
                      {state.lastVisitYear !== null && (
                        <small>{t("family.visit", { year: state.lastVisitYear })}</small>
                      )}
                    </p>
                  )}
                  {state.unionPlan?.cohabitationYear != null && (
                    <p>{t("family.cohabitationStarted", { year: state.unionPlan.cohabitationYear })}</p>
                  )}
                  {state.spouse && (
                    <p>
                      {t("family.spouse", { name: state.spouse.name, age: state.spouse.age })}
                      <small>
                        {t(state.spouse.alive ? "alive" : "died")} · {country(state.spouse.country)}
                      </small>
                    </p>
                  )}
                  {grandchildren.length > 0 && (
                    <div className="descendant-grandchildren">
                      <h5>
                        {t("family.grandchildren")} · {grandchildren.length}
                      </h5>
                      <p className="muted">{t("family.grandchildIncome")}</p>
                      {grandchildren.map((g) => (
                        <p key={g.id}>
                          {g.earlyLoss ? <><strong>{g.name}</strong><small>{t("family.earlyLoss")} · {country(g.country)}</small></> : identity(g)}
                          {g.origin && g.origin.method !== "natural" && (
                            <small>{t(`family.formation.${g.origin.method}`)}</small>
                          )}
                          {!g.earlyLoss && <>
                          <small>
                            {t(`family.education.${g.education}`)} ·{" "}
                            {t(`family.employment.${g.employment}`)}
                            {!["none", "student", "retired"].includes(g.job) &&
                              ` · ${t(`job.${g.job}`)}`}
                          </small>
                          <small>
                            {guardianHome(life,g.id) ? t("family.guardianHome",{country:country(life.country.id)}) : g.age<18&&guardianArrangement(life,g.id)==='kin' ? t("family.guardianKin") : g.age<18&&guardianArrangement(life,g.id)==='other' ? t("family.guardianOther") : t(g.residence === "home" ? g.origin?.household === "otherParent" ? "family.motherHome" : "family.parentHome" : "family.independent")}
                          </small>
                          <small>{t("family.income", { amount: money(g.income) })}</small>
                          {g.migratedYear !== null && (
                            <small>
                              {t("family.migrated", { year: g.migratedYear })}
                              {g.lastVisitYear !== null &&
                                ` · ${t("family.visit", { year: g.lastVisitYear })}`}
                            </small>
                          )}
                          {g.spouse && (
                            <small>
                              {t("family.spouse", { name: g.spouse.name, age: g.spouse.age })} ·{" "}
                              {t(g.spouse.alive ? "alive" : "died")} · {country(g.spouse.country)}
                            </small>
                          )}
                          </>}
                          {(life.descendants.greatGrandchildren ?? []).filter(c => c.grandchildId === g.id).map(c => (
                            <span className="descendant-grandchildren" key={c.id}>
                              <small>{t("family.greatGrandchildren")}</small>{identity(c)}
                              {(life.descendants.greatGreatGrandchildren ?? []).filter(d => d.greatGrandchildId === c.id).map(d => (
                                <span className="descendant-grandchildren" key={d.id}>
                                  <small>{t("family.greatGreatGrandchildren")}</small>{identity(d)}
                                </span>
                              ))}
                            </span>
                          ))}

                        </p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </article>
          );
        })
      ) : (
        <p>—</p>
      )}
    </section>
  );
}
