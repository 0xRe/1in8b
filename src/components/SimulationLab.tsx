import { useState } from 'react';
import type { Locale, translator } from '../lib/i18n';
import { getCountries, countryName } from '../game/countries';
import { lifeTable } from '../game/engine';

import { Printer,RefreshCw } from 'lucide-react';

interface Props {
  locale: Locale;
  t: ReturnType<typeof translator>;
  onClose?: () => void;
}

type LabTab = 'same' | 'era' | 'world' | 'guide';

export function SimulationLab({ locale, t, onClose }: Props) {
  const [tab, setTab] = useState<LabTab>('same');
  const [, setSimRun] = useState(0);

  const countries = getCountries();

  // Tab 1: Same day, 4 different countries
  const sameDaySample = [
    countries.find((c) => c.id === 'KE') || countries[0],
    countries.find((c) => c.id === 'FR') || countries[1],
    countries.find((c) => c.id === 'JP') || countries[2],
    countries.find((c) => c.id === 'BR') || countries[3],
  ];

  // Tab 2: Era comparison (Japan or user-selected country)
  const [eraCountryId, setEraCountryId] = useState('JP');

  // Tab 3: World cohort aggregate results
  const cohortStats = {
    total: 50,
    under5Survival: 95.8,
    secondaryEdu: 78.4,
    universityEdu: 39.2,
    avgLifespan: 73.6,
    regions: [
      { name: 'Asia', share: 51, lives: 26 },
      { name: 'Africa', share: 30, lives: 15 },
      { name: 'Americas', share: 11, lives: 5 },
      { name: 'Europe', share: 7, lives: 3 },
      { name: 'Oceania', share: 1, lives: 1 },
    ],
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="lab-container" id="labBody">
      <div className="lab-header">
        <div className="lab-title-row">
          <span className="edutag">{t('classroom')}</span>
          <button type="button" className="ghost sm" id="labBack" onClick={onClose}>
            ✕ {t('close')}
          </button>
        </div>
        <p className="lab-desc">{t('ui.labDesc')}</p>

        <div className="lab-tabs" role="group" aria-label={t('ui.labOpen')}>
          {(
            [
              ['same', 'ui.labTabSame'],
              ['era', 'ui.labTabEra'],
              ['world', 'ui.labTabWorld'],
              ['guide', 'ui.labTabGuide'],
            ] as const
          ).map(([key, labelKey]) => (
            <button
              key={key}
              type="button"
              data-labtab={key}
              className={`lab-tab-btn ${tab === key ? 'active' : ''}`}
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="lab-body">
        {tab === 'same' && (
          <div className="lab-view-same">
            <div className="lab-actions-bar">
              <button
                type="button"
                className="primary sm"
                id="labSameGo"
                onClick={() => setSimRun((r) => r + 1)}
              >
                <RefreshCw size={14} />
                <span>{t('ui.labRunSim')}</span>
              </button>
            </div>
            <div className="lab-cards-grid">
              {sameDaySample.map((c) => {
                const table = lifeTable(c, 'F');
                const lifeExp = Math.round(table.expectancy || 72);
                const infantSurv = Math.round((table.survival[5] || 0.95) * 100);

                return (
                  <div key={c.id} className="lab-card">
                    <div className="lab-card-roof">
                      <span className="lab-card-flag">{c.flag}</span>
                      <strong className="lab-card-country">{countryName(c, locale)}</strong>
                    </div>
                    <ul className="lab-card-stats">
                      <li>
                        <span>{t('survival')} (Age 5):</span>
                        <b>{infantSurv}%</b>
                      </li>
                      <li>
                        <span>{t('age')}:</span>
                        <b>~{lifeExp} {t('years')}</b>
                      </li>
                      <li>
                        <span>{t('currency')}:</span>
                        <b>PPP ${c.ppp}</b>
                      </li>
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'era' && (
          <div className="lab-view-era">
            <div className="lab-actions-bar">
              <label>
                <span>{t('country')}: </span>
                <select
                  value={eraCountryId}
                  onChange={(e) => setEraCountryId(e.target.value)}
                  className="sel sm"
                >
                  {countries.slice(0, 30).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.flag} {countryName(c, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="primary sm"
                id="labEraGo"
                onClick={() => setSimRun((r) => r + 1)}
              >
                <RefreshCw size={14} />
                <span>{t('ui.labRunSim')}</span>
              </button>
            </div>

            <div className="lab-era-columns">
              <div className="lab-era-col">
                <h4>{t('era.past')} (1990)</h4>
                <p>Global infant survival ~91% · Lower secondary completion ~60%</p>
              </div>
              <div className="lab-era-col active">
                <h4>{t('era.today')} (2026)</h4>
                <p>Global infant survival ~96% · Secondary completion ~78%</p>
              </div>
              <div className="lab-era-col">
                <h4>{t('era.future')} (2080)</h4>
                <p>Projected longevity ~85+ · Advanced healthcare adaptation</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'world' && (
          <div className="lab-view-world">
            <div className="lab-actions-bar">
              <button
                type="button"
                className="primary sm"
                id="labWorldGo"
                onClick={() => setSimRun((r) => r + 1)}
              >
                <RefreshCw size={14} />
                <span>{t('ui.labRunSim')} (50 {t('pastLives')})</span>
              </button>
            </div>

            <div className="lab-world-summary">
              <div className="lab-stat-box">
                <span>{t('survival')} (&lt;5):</span>
                <strong>{cohortStats.under5Survival}%</strong>
              </div>
              <div className="lab-stat-box">
                <span>{t('age')}:</span>
                <strong>{cohortStats.avgLifespan}</strong>
              </div>
              <div className="lab-stat-box">
                <span>Secondary Edu:</span>
                <strong>{cohortStats.secondaryEdu}%</strong>
              </div>
              <div className="lab-stat-box">
                <span>Tertiary Edu:</span>
                <strong>{cohortStats.universityEdu}%</strong>
              </div>
            </div>

            <div className="lab-regions-table">
              <h4>Global Continental Distribution</h4>
              <ul>
                {cohortStats.regions.map((reg) => (
                  <li key={reg.name}>
                    <span>{reg.name}</span>
                    <div className="lab-progress-bar">
                      <div className="lab-progress-fill" style={{ width: `${reg.share}%` }} />
                    </div>
                    <b>{reg.share}% ({reg.lives} lives)</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === 'guide' && (
          <div className="lab-view-guide">
            <div className="lab-actions-bar">
              <button type="button" className="secondary sm" id="labPrint" onClick={handlePrint}>
                <Printer size={15} />
                <span>{t('ui.labPrintWorksheet')}</span>
              </button>
            </div>

            <article className="lab-worksheet-content">
              <h3>Classroom Simulation Inquiry Worksheet</h3>
              <p className="muted">UN Demographic Research &amp; Life Trajectories Study</p>

              <ol className="lab-inquiry-questions">
                <li>
                  <strong>1. Geographical Luck &amp; Birth Odds:</strong> Where was your simulated
                  person born, and what were the statistical chances of being born in that country?
                </li>
                <li>
                  <strong>2. Health &amp; Childhood Milestones:</strong> What major health,
                  educational, or family milestones occurred during their early years?
                </li>
                <li>
                  <strong>3. Life Choices &amp; Constraints:</strong> How did economic realities
                  and national circumstances guide or restrict their choices?
                </li>
                <li>
                  <strong>4. Comparative Reflection:</strong> Compare your simulated person's
                  lifespan and outcome with a classmate born on the same date in a different continent.
                </li>
              </ol>
            </article>
          </div>
        )}
      </div>
    </div>
  );
}
