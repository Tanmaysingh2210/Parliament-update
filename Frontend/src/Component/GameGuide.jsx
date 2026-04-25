import { useState, useEffect, useRef } from "react";
import "./GameGuide.css";

const RULES = [
  {
    icon: "🎲",
    title: "Roll & Move",
    body: "On your turn, roll the dice. Your pawn moves that many steps around the 32-tile board.",
  },
  {
    icon: "⚔️",
    title: "Weapon Tiles",
    body: "Land on an unowned weapon — Buy it outright or start an Auction. If owned by an enemy, your Parliament takes damage.",
  },
  {
    icon: "🏛️",
    title: "Parliament HP",
    body: "You start with 1500 HP + 750 Shield. Shield absorbs hits first. Reach 0 HP and you're eliminated.",
  },
  {
    icon: "🔨",
    title: "Auctions",
    body: "When a bid starts, ALL players have 20s to place a bid. Highest bidder wins the card. Pass to sit out.",
  },
  {
    icon: "🧪",
    title: "Scientists",
    body: "Each Scientist card you own adds +3% bonus damage to your weapons when enemies land on them.",
  },
  {
    icon: "🕵️",
    title: "Agent",
    body: "Landing on Agent halves the damage you take on your very next tile. One-use buff.",
  },
  {
    icon: "🛠️",
    title: "Engineer",
    body: "Restores 100 HP to your Parliament. Capped at max 1500.",
  },
  {
    icon: "💣",
    title: "Time Bomb",
    body: "Explodes in a few turns damaging players on nearby tiles. Watch the red pulse!",
  },
  {
    icon: "🎭",
    title: "Mystery",
    body: "Random cash gain or loss. Could be a bribe windfall or a corruption fine.",
  },
  {
    icon: "🚨",
    title: "Emergency Meeting",
    body: "Costs ₹200. Scrambles ALL pawns to random positions — chaos for everyone.",
  },
];

const DURATION = 5;

const GameGuide = ({ onDone, manualOpen = false }) => {
  const [countdown, setCountdown] = useState(DURATION);
  const [visible, setVisible] = useState(true);
  const [page, setPage] = useState(0);
  const timerRef = useRef(null);

  const RULES_PER_PAGE = 5;
  const totalPages = Math.ceil(RULES.length / RULES_PER_PAGE);
  const pageRules = RULES.slice(page * RULES_PER_PAGE, page * RULES_PER_PAGE + RULES_PER_PAGE);

  useEffect(() => {
    if (manualOpen) return;
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          dismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [manualOpen]);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onDone?.(), 400);
  };


  if (!visible) return null;

  const pct = ((DURATION - countdown) / DURATION) * 100;
  const circumference = 2 * Math.PI * 18;

  return (
    <div className="guide-backdrop" onClick={dismiss}>
      <div className="guide-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="guide-header">
          <div className="guide-logo">⚔️</div>
          <div className="guide-header-text">
            <h1 className="guide-title">PARLIAMENT</h1>
            <p className="guide-subtitle">BATTLE GUIDE</p>
          </div>

          {/* Countdown ring */}
          {!manualOpen ? (
            <button className="guide-close-ring" onClick={dismiss} title="Skip">
              <svg viewBox="0 0 40 40" className="ring-svg">
                <circle cx="20" cy="20" r="18" className="ring-bg" />
                <circle
                  cx="20" cy="20" r="18"
                  className="ring-progress"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * pct) / 100}
                />
              </svg>
              <span className="ring-num">{countdown}</span>
            </button>
          ) : (
            <button className="guide-close-x" onClick={dismiss} title="Close">✕</button>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="guide-divider" />

        {/* ── Rules Grid ── */}
        <div className="guide-grid">
          {pageRules.map((rule, i) => (
            <div className="guide-card" key={i} style={{ animationDelay: `${i * 60}ms` }}>
              <span className="guide-card-icon">{rule.icon}</span>
              <div>
                <p className="guide-card-title">{rule.title}</p>
                <p className="guide-card-body">{rule.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="guide-pagination">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                className={`guide-dot ${i === page ? "active" : ""}`}
                onClick={() => setPage(i)}
              />
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="guide-footer">
          <button className="guide-play-btn" onClick={dismiss}>
            Enter Battlefield →
          </button>
          {!manualOpen && (
            <p className="guide-hint">Auto-closing in {countdown}s · tap anywhere to skip</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default GameGuide;