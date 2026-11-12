import { useState,useMemo } from "react";
import type { Life } from "../game/types";
import type { Locale, translator } from "../lib/i18n";
import { countryName } from "../game/countries";

type T = ReturnType<typeof translator>;

export function LifeSceneBanner({ life, locale, t }: { life: Life; locale: Locale; t: T }) {
  const [whoExpanded, setWhoExpanded] = useState(false);

  const { caption, whoList } = useMemo(() => {
    const locName = countryName(life.country, locale);

    // Dwelling type
    let dwelling = t("ui.dwellingApartment");
    if (life.age < 18) {
      dwelling = t("ui.dwellingFamilyHome");
    } else if (life.residence === "rural") {
      dwelling = t("ui.dwellingRural");
    } else if (life.stats.incomeQuintile >= 4) {
      dwelling = t("ui.dwellingHouse");
    }

    // Household description
    const partner = life.family.partner;
    const partnerAlive = partner && partner.alive;
    const livingChildren = life.family.children.filter((ch) => ch.alive);

    let household = t("ui.livingAlone");
    if (life.age < 18) {
      household = t("ui.withFamily");
    } else if (partnerAlive && livingChildren.length > 0) {
      household = t("ui.withSpouseAndChildren", { n: livingChildren.length });
    } else if (partnerAlive) {
      household = t("ui.withSpouse");
    } else if (livingChildren.length > 0) {
      household = t("ui.withChildrenOnly", { n: livingChildren.length });
    }

    const cap = `${locName} · ${dwelling} · ${household}`;

    // Who list: Me, Partner, Children, Pets
    const members: string[] = [`${t("ui.me")}, ${life.age}`];
    if (partnerAlive) {
      members.push(`${partner.name}, ${partner.age}`);
    }
    for (const ch of livingChildren) {
      members.push(`${ch.name}, ${ch.age}`);
    }
    for (const pet of life.pets) {
      if (pet.alive) {
        members.push(pet.name || t(`pet.${pet.kind}`));
      }
    }
    const who = members.join(" · ");

    return { caption: cap, whoList: who };
  }, [life, locale, t]);

  return (
    <div className="scene-household">
      <p
        className="scenecap tap"
        id="sceneCap"
        role="button"
        tabIndex={0}
        aria-expanded={whoExpanded}
        title={t("ui.namesAndAges")}
        onClick={() => setWhoExpanded((w) => !w)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setWhoExpanded((w) => !w);
          }
        }}
      >
        {caption}
      </p>
      {whoExpanded && (
        <p className="scenewho" id="sceneWho">
          {whoList}
        </p>
      )}
    </div>
  );
}
