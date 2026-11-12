import { HeartHandshake } from 'lucide-react';
import type { LifetimeCommand, LifetimeSnapshot } from '../lib/duo-lifetime';

type SharedCommand = Extract<LifetimeCommand, { kind: `shared-${string}` }>;
type SharedAction<T = SharedCommand> = T extends SharedCommand ? Omit<T, 'id' | 'runIndex'> : never;

export function DuoSharedChoice({ lifetime, self, blocked, command }: {
  lifetime: LifetimeSnapshot;
  self: string;
  blocked: boolean;
  command(action: SharedAction): Promise<boolean>;
}) {
  const event = lifetime.sharedEvent;
  const proposal = event?.proposal;
  const proposed = event?.options.find(option => option.id === proposal?.optionId);
  const agreed = proposal?.approvals.includes(self);
  const bond = lifetime.bond ?? 0;
  const goal = lifetime.sharedGoal;

  return <article className={`dl-card dl-shared-card ${event ? 'is-active' : ''}`}>
    <p className="duo-eyebrow">Your shared story</p>
    <h1>{event?.title ?? 'Room for two different paths.'}</h1>
    <div className="dl-bond"><HeartHandshake size={18} aria-hidden="true"/>
      <span>{bond >= 8 ? 'Lifelong friends' : bond >= 3 ? 'Growing closer' : 'Getting to know each other'}</span>
      <strong>{bond} bond</strong>
    </div>
    {goal && <div className="dl-goal">
      <strong>{goal.label}</strong>
      <progress max={goal.target} value={goal.progress} aria-label={goal.label}/>
      <small>{goal.progress} / {goal.target} shared years · through {goal.until}</small>
    </div>}
    {lifetime.commitment && <p><strong>{lifetime.commitment.title}</strong><br/>
      Shared priority through {lifetime.commitment.until}. You can change your own focus in Life.
    </p>}
    <p>{event?.description ?? (goal ? 'Keep playing to see how your goal turns out.' : 'Your next shared moment will appear as your lives unfold.')}</p>
    {event && <>
      {proposal && proposed ? <div className="dl-terms">
        <p className="duo-eyebrow">{proposal.approvals.length}/2 agreed</p>
        <h2>{proposed.label}</h2><p>{proposed.description}</p>
        {agreed ? <p role="status">Your agreement is saved. Waiting for your friend.</p>
          : <button className="dl-primary" disabled={blocked} onClick={() => void command({
            kind: 'shared-approve', eventId: event.id, proposalVersion: proposal.version,
          })}>I agree to this exact proposal</button>}
      </div> : <div className="dl-choices">
        {event.options.filter(option => option.id !== 'independent').map(option => <div className="dl-terms" key={option.id}>
          <h2>{option.label}</h2>
          {option.id.startsWith('focus:') ? <>
            <p>Set this priority for both characters for three years.</p>
            <details><summary>Read full terms</summary><p>{option.description}</p></details>
          </> : <p>{option.description}</p>}
          <div className="dl-choice-actions">
            <button disabled={blocked} onClick={() => void command({
              kind: 'shared-propose', eventId: event.id, proposalVersion: lifetime.proposalVersion, optionId: option.id,
            })}>Propose this option</button>
            <button className="dl-secondary" disabled={blocked} onClick={() => void command({
              kind: 'shared-propose', eventId: event.id, proposalVersion: lifetime.proposalVersion, optionId: option.id, agree: true,
            })}>Propose and agree to these terms</button>
          </div>
        </div>)}
      </div>}
      <button className="dl-decline" disabled={blocked} onClick={() => void command({
        kind: 'shared-decline', eventId: event.id, proposalVersion: lifetime.proposalVersion,
      })}>{agreed ? 'Withdraw and keep separate plans' : 'Keep separate plans'}</button>
    </>}
  </article>;
}
