import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/api.js";
import "./Leaderboard.css";

const MEDALS = ["🥇", "🥈", "🥉"];

function formatWinRate(rate) {
  return `${(rate * 100).toFixed(1)}%`;
}

function winRateClass(rate) {
  if (rate >= 0.5) return "lb-winrate-high";
  if (rate >= 0.25) return "lb-winrate-mid";
  return "lb-winrate-low";
}

export default function Leaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("season"); // "season" | "alltime"
  const [seasonInfo, setSeasonInfo] = useState(null);
  const [myStats, setMyStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch season info once
  useEffect(() => {
    api.get("/season/info")
      .then((res) => setSeasonInfo(res.data))
      .catch((err) => console.error("Season info error:", err));
  }, []);

  // Fetch my stats once
  useEffect(() => {
    api.get("/season/me")
      .then((res) => setMyStats(res.data))
      .catch((err) => console.error("My stats error:", err));
  }, []);

  // Fetch leaderboard when tab changes
  useEffect(() => {
    setLoading(true);
    const endpoint =
      tab === "season" ? "/season/leaderboard" : "/season/all-time";
    api
      .get(endpoint)
      .then((res) => {
        setLeaderboard(res.data.leaderboard || []);
      })
      .catch((err) => {
        console.error("Leaderboard error:", err);
        setLeaderboard([]);
      })
      .finally(() => setLoading(false));
  }, [tab]);

  const myUserId = user?.id;

  return (
    <div className="leaderboard-page">
      {/* Back button */}
      <button className="lb-back-btn" onClick={() => navigate("/dashboard")}>
        ← Back
      </button>

      {/* Header */}
      <div className="lb-header">
        <h1>LEADERBOARD</h1>
        <p className="lb-subtitle">Prove your dominance</p>
      </div>

      {/* Season info bar */}
      {seasonInfo && (
        <div className="lb-season-bar">
          <span className="lb-season-badge">
            ⚔️ SEASON {seasonInfo.season}
          </span>
          <span className="lb-season-timer">
            <span>{seasonInfo.daysRemaining}</span> days remaining
          </span>
        </div>
      )}

      {/* Tab switcher */}
      <div className="lb-tabs">
        <button
          className={`lb-tab ${tab === "season" ? "active" : ""}`}
          onClick={() => setTab("season")}
        >
          🏆 Season
        </button>
        <button
          className={`lb-tab ${tab === "alltime" ? "active" : ""}`}
          onClick={() => setTab("alltime")}
        >
          🌐 All Time
        </button>
      </div>

      {/* My stats card */}
      {myStats && (
        <div className="lb-my-stats">
          <p className="lb-my-stats-title">Your Stats</p>
          <div className="lb-my-stats-grid">
            <div className="lb-stat-item">
              <span className="lb-stat-value">
                {tab === "season"
                  ? myStats.seasonStats?.played ?? 0
                  : myStats.allTime?.totalPlayed ?? 0}
              </span>
              <span className="lb-stat-label">Played</span>
            </div>
            <div className="lb-stat-item">
              <span className="lb-stat-value">
                {tab === "season"
                  ? myStats.seasonStats?.won ?? 0
                  : myStats.allTime?.totalWon ?? 0}
              </span>
              <span className="lb-stat-label">Won</span>
            </div>
            <div className="lb-stat-item">
              <span className="lb-stat-value">
                {tab === "season"
                  ? formatWinRate(myStats.seasonStats?.winRate ?? 0)
                  : formatWinRate(
                      myStats.allTime?.totalPlayed > 0
                        ? myStats.allTime.totalWon / myStats.allTime.totalPlayed
                        : 0
                    )}
              </span>
              <span className="lb-stat-label">Win Rate</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      <div className="lb-table-container">
        <div className="lb-table-header">
          <span>#</span>
          <span>Player</span>
          <span>Played</span>
          <span>Won</span>
          <span>Win Rate</span>
        </div>

        {loading ? (
          <div className="lb-loading">
            <div className="lb-loading-spinner" />
            Loading...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="lb-empty">
            <span className="lb-empty-icon">🏜️</span>
            No games played yet this {tab === "season" ? "season" : "time"}.
            <br />
            Be the first to claim the throne!
          </div>
        ) : (
          leaderboard.map((entry) => {
            const isMe = entry.userId === myUserId;
            const played =
              tab === "season" ? entry.played : entry.totalPlayed;
            const won = tab === "season" ? entry.won : entry.totalWon;
            const rate = entry.winRate ?? (played > 0 ? won / played : 0);

            return (
              <div
                key={entry.userId}
                className={`lb-row ${
                  entry.rank <= 3 ? `rank-${entry.rank}` : ""
                } ${isMe ? "is-me" : ""}`}
              >
                <div className="lb-rank">
                  {entry.rank <= 3 ? (
                    <span className="lb-rank-medal">
                      {MEDALS[entry.rank - 1]}
                    </span>
                  ) : (
                    entry.rank
                  )}
                </div>
                <div className="lb-username">
                  {entry.username}
                  {entry.isGuest && (
                    <span className="lb-guest-tag">(guest)</span>
                  )}
                </div>
                <div className="lb-col-stat">{played}</div>
                <div className="lb-col-stat">{won}</div>
                <div className={`lb-col-winrate ${winRateClass(rate)}`}>
                  {formatWinRate(rate)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
