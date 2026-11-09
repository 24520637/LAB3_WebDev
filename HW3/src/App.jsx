import { useState } from 'react';
import { usePubgAirdropTimer } from './hooks/usePubgAirdropTimer.js';
import { PubgClaimCard } from './components/PubgClaimCard.jsx';
import { PubgLeaderboard } from './components/PubgLeaderboard.jsx';
import { PubgKillFeed } from './components/PubgKillFeed.jsx';
import { createMockClaimService } from './claims/claimService.js';
import { DEMO_SQUAD_STANDINGS } from './data/pubgVnSquads.js';
import { DEMO_KILL_EVENTS } from './data/pubgKillEvents.js';
import { createArenaDemoState } from './data/arenaDemo.js';
import './styles/arena.css';

/** One source of initial stock, one stable mock authority, one expiration deadline. */
export default function App() {
  const [arena] = useState(() => createArenaDemoState(Date.now()));
  const [claimService] = useState(() => createMockClaimService(arena.drops));
  const { remainingMs, hasReachedTarget } = usePubgAirdropTimer(arena.deadline);
  const phase = hasReachedTarget ? 'EXPIRED' : 'AIRDROP_LIVE';
  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  return (
    <>
      <a href="#arena-main" className="skip-link">Skip to arena content</a>
      <header className="arena-header">
        <p className="eyebrow">PUBG VIETNAM SERIES · DEMONSTRATION</p>
        <h1>PVS Championship & Airdrop Arena</h1>
        <p>Educational prototype. Tickets, G-Coin, standings, and events are simulated — no real purchase or prize is issued.</p>
      </header>
      <main id="arena-main" className="arena-main">
        <section className="arena-drops" aria-labelledby="drops-heading">
          <div className="arena-section-heading">
            <div><h2 id="drops-heading">Ticket & G-Coin Drops</h2><p>Claim against a local simulated inventory authority.</p></div>
            <div className="arena-timer">
              <span id="drop-clock-label">Drop ends in</span>
              <output aria-labelledby="drop-clock-label" aria-live="off" className="clock-face">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </output>
              <span className="clock-phase">{phase === 'EXPIRED' ? 'Drop expired' : 'Drop live'}</span>
            </div>
          </div>
          <div className="drop-grid">
            {arena.drops.map(drop => <PubgClaimCard key={drop.id} drop={drop} phase={phase} claimService={claimService} />)}
          </div>
        </section>
        <div className="arena-results">
          <PubgLeaderboard standings={DEMO_SQUAD_STANDINGS} demo />
          <PubgKillFeed events={DEMO_KILL_EVENTS} squads={DEMO_SQUAD_STANDINGS} demo />
        </div>
      </main>
      <footer className="arena-footer">Unofficial classroom demo · No KRAFTON affiliation claimed</footer>
    </>
  );
}
