# MongoDB Schema Definitions & Code Templates

## Database Schemas to Create

### 1. MatchmakingQueue Schema

```javascript
// Server/models/MatchmakingQueue.js

import mongoose from "mongoose";

const MatchmakingQueueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
    unique: true,
    sparse: true  // Allow null, but unique when present
  },
  
  preferredPlayerCount: {
    type: Number,
    enum: [2, 3, 4, 5, 6],
    default: 4
  },
  
  skillRating: {
    type: Number,
    default: 1200,
    min: 800,
    max: 3000
  },
  
  status: {
    type: String,
    enum: ["waiting", "matched"],
    default: "waiting"
  },
  
  matchedGameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Game",
    default: null
  },
  
  joinedAt: {
    type: Date,
    default: Date.now,
    expires: 300  // Auto-delete after 5 minutes (300 seconds)
  },
  
  timeoutAt: {
    type: Date,
    default: () => new Date(Date.now() + 300000)  // 5 minutes from now
  }
}, { timestamps: true });

// Indexes for performance
MatchmakingQueueSchema.index({ userId: 1 });
MatchmakingQueueSchema.index({ status: 1, preferredPlayerCount: 1 });
MatchmakingQueueSchema.index({ skillRating: 1, preferredPlayerCount: 1 });
MatchmakingQueueSchema.index({ joinedAt: 1 });

export default mongoose.model("MatchmakingQueue", MatchmakingQueueSchema);
```

---

### 2. PlayerStats Schema

```javascript
// Server/models/PlayerStats.js

import mongoose from "mongoose";

const PlayerStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
    unique: true
  },
  
  wins: {
    type: Number,
    default: 0
  },
  
  losses: {
    type: Number,
    default: 0
  },
  
  totalGames: {
    type: Number,
    default: 0
  },
  
  skillRating: {
    type: Number,
    default: 1200,
    min: 800,
    max: 3000
  },
  
  winRate: {
    type: Number,
    default: 0  // Percentage (0-100)
  },
  
  averageGameDuration: {
    type: Number,
    default: 0  // In minutes
  },
  
  highestRating: {
    type: Number,
    default: 1200
  },
  
  lowestRating: {
    type: Number,
    default: 1200
  },
  
  currentStreak: {
    type: Number,
    default: 0  // Positive for wins, negative for losses
  },
  
  longestWinStreak: {
    type: Number,
    default: 0
  },
  
  lastGameAt: {
    type: Date,
    default: null
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes
PlayerStatsSchema.index({ userId: 1 });
PlayerStatsSchema.index({ skillRating: -1 });  // For leaderboard
PlayerStatsSchema.index({ wins: -1 });
PlayerStatsSchema.index({ totalGames: -1 });

export default mongoose.model("PlayerStats", PlayerStatsSchema);
```

---

### 3. MatchHistory Schema

```javascript
// Server/models/MatchHistory.js

import mongoose from "mongoose";

const MatchHistorySchema = new mongoose.Schema({
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Game",
    required: true
  },
  
  players: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    initialRating: Number,
    finalRating: Number,
    ratingChange: Number,
    result: {
      type: String,
      enum: ["win", "loss", "draw"]
    }
  }],
  
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user"
  },
  
  matchmakingType: {
    type: String,
    enum: ["global", "friends"],
    default: "global"
  },
  
  playerCount: {
    type: Number,
    enum: [2, 3, 4, 5, 6]
  },
  
  gameDuration: {
    type: Number,  // In minutes
    default: 0
  },
  
  playedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes
MatchHistorySchema.index({ gameId: 1 });
MatchHistorySchema.index({ playedAt: -1 });
MatchHistorySchema.index({ "players.userId": 1 });

export default mongoose.model("MatchHistory", MatchHistorySchema);
```

---

## Skill Rating Utility

```javascript
// Server/utils/skillRating.js

/**
 * Calculate expected win probability using ELO formula
 * @param {Number} playerRating - Player's current rating
 * @param {Number} opponentRating - Opponent's current rating
 * @returns {Number} Expected win probability (0-1)
 */
export const calculateExpectedWinRate = (playerRating, opponentRating) => {
  const ratingDiff = opponentRating - playerRating;
  return 1 / (1 + Math.pow(10, ratingDiff / 400));
};

/**
 * Calculate rating change after a game using ELO
 * @param {Number} currentRating - Player's current rating
 * @param {Boolean} won - Whether player won
 * @param {Number} opponentRating - Average opponent rating
 * @param {Number} K - K-factor (higher = faster changes)
 * @returns {Number} Rating change
 */
export const calculateRatingChange = (
  currentRating, 
  won, 
  opponentRating, 
  K = 32
) => {
  const expected = calculateExpectedWinRate(currentRating, opponentRating);
  const result = won ? 1 : 0;
  const change = Math.round(K * (result - expected));
  return change;
};

/**
 * Apply rating change with min/max bounds
 * @param {Number} currentRating - Current rating
 * @param {Number} change - Rating change
 * @returns {Number} New rating (bounded 800-3000)
 */
export const applyRatingChange = (currentRating, change) => {
  let newRating = currentRating + change;
  newRating = Math.max(800, Math.min(3000, newRating));
  return newRating;
};

/**
 * Calculate average rating from multiple opponents
 * @param {Array<Number>} ratings - Array of opponent ratings
 * @returns {Number} Average rating
 */
export const getAverageRating = (ratings) => {
  if (ratings.length === 0) return 1200;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return Math.round(sum / ratings.length);
};

export default {
  calculateExpectedWinRate,
  calculateRatingChange,
  applyRatingChange,
  getAverageRating
};
```

---

## Matchmaking Engine

```javascript
// Server/utils/matchmakingEngine.js

import MatchmakingQueue from "../models/MatchmakingQueue.js";
import Game from "../models/GameSession.js";
import PlayerStats from "../models/PlayerStats.js";
import { generateSessionId } from "./generateSession.js";

const SKILL_GAP_TIER_1 = 500;   // 0-60 seconds
const SKILL_GAP_TIER_2 = 750;   // 60-180 seconds
const SKILL_GAP_TIER_3 = Infinity; // 180+ seconds (match anyone)

/**
 * Get skill gap threshold based on wait time
 */
const getSkillGapThreshold = (waitTimeSeconds) => {
  if (waitTimeSeconds < 60) return SKILL_GAP_TIER_1;
  if (waitTimeSeconds < 180) return SKILL_GAP_TIER_2;
  return SKILL_GAP_TIER_3;
};

/**
 * Find matching players in queue
 */
const findMatchingPlayers = async (playerCount) => {
  try {
    // Get all waiting players with this preference
    const waitingPlayers = await MatchmakingQueue.find({
      status: "waiting",
      preferredPlayerCount: playerCount
    }).sort({ joinedAt: 1 });  // First come, first served

    if (waitingPlayers.length < playerCount) {
      return null; // Not enough players
    }

    // Calculate wait times
    const now = Date.now();
    const firstPlayer = waitingPlayers[0];
    const firstPlayerWaitTime = (now - firstPlayer.joinedAt.getTime()) / 1000;
    const skillGap = getSkillGapThreshold(firstPlayerWaitTime);

    // Try to find playerCount-1 matches for first player
    const matched = [firstPlayer];
    const firstPlayerRating = firstPlayer.skillRating;

    for (let i = 1; i < waitingPlayers.length && matched.length < playerCount; i++) {
      const candidate = waitingPlayers[i];
      const ratingDiff = Math.abs(candidate.skillRating - firstPlayerRating);

      if (ratingDiff <= skillGap) {
        matched.push(candidate);
      }
    }

    if (matched.length === playerCount) {
      return matched;
    }

    return null;
  } catch (error) {
    console.error("Error finding matching players:", error);
    return null;
  }
};

/**
 * Create game from matched players
 */
const createGameFromMatch = async (matchedPlayers) => {
  try {
    const gameCode = generateSessionId();
    const pawnColors = [
      'redPawn',
      'blackPawn',
      'whitePawn',
      'bluePawn',
      'yellowPawn',
      'greenPawn'
    ];

    const players = matchedPlayers.map((queueEntry, index) => ({
      userId: queueEntry.userId,
      cards: [],
      isBot: false,
      pawn: pawnColors[index] || pawnColors[index % pawnColors.length],
      remainingParliamentHp: 1500,
      remainingShieldHp: 0,
      cashRemaining: 1200,
      position: 0,
      skippedChances: 0,
      isActive: true
    }));

    const game = await Game.create({
      gameCode,
      maxPlayer: matchedPlayers.length,
      players,
      currentTurn: null,
      status: "waiting"
    });

    return game;
  } catch (error) {
    console.error("Error creating game from match:", error);
    return null;
  }
};

/**
 * Main matching engine - run every 2 seconds
 */
export const runMatchmakingEngine = async () => {
  try {
    // Try to match for each player count (4, 5, 6, 3, 2)
    const playerCounts = [4, 5, 6, 3, 2];

    for (const playerCount of playerCounts) {
      let continueMatching = true;

      while (continueMatching) {
        const matched = await findMatchingPlayers(playerCount);

        if (!matched || matched.length === 0) {
          continueMatching = false;
          continue;
        }

        // Create game from matched players
        const game = await createGameFromMatch(matched);

        if (game) {
          // Update queue entries to "matched"
          const userIds = matched.map(p => p.userId);
          await MatchmakingQueue.updateMany(
            { userId: { $in: userIds } },
            { 
              status: "matched",
              matchedGameId: game._id
            }
          );

          console.log(`✅ Matched ${playerCount} players into game ${game.gameCode}`);

          // Emit socket events (handled separately in matchmakingSocket.js)
          // Return matched info so caller can emit sockets
          return {
            matched: true,
            game,
            playerIds: userIds
          };
        }
      }
    }

    return { matched: false };
  } catch (error) {
    console.error("Error in matchmaking engine:", error);
    return { matched: false, error };
  }
};

/**
 * Remove stale queue entries
 */
export const cleanupStaleQueueEntries = async () => {
  try {
    const now = Date.now();
    const result = await MatchmakingQueue.deleteMany({
      timeoutAt: { $lt: new Date(now) }
    });

    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} stale queue entries`);
    }

    return result.deletedCount;
  } catch (error) {
    console.error("Error cleaning up queue:", error);
    return 0;
  }
};

export default {
  runMatchmakingEngine,
  cleanupStaleQueueEntries,
  findMatchingPlayers,
  createGameFromMatch
};
```

---

## Matchmaking Controller

```javascript
// Server/Controller/matchmakingController.js

import MatchmakingQueue from "../models/MatchmakingQueue.js";
import PlayerStats from "../models/PlayerStats.js";

/**
 * Join matchmaking queue
 */
export const joinQueue = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized" 
      });
    }

    const userId = req.session.user.id;
    const { preferredPlayerCount } = req.body;

    // Validate input
    if (!preferredPlayerCount || preferredPlayerCount < 2 || preferredPlayerCount > 6) {
      return res.status(400).json({
        success: false,
        message: "Invalid player count (2-6)"
      });
    }

    // Check if already in queue
    const existingEntry = await MatchmakingQueue.findOne({ userId });
    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: "Already in queue"
      });
    }

    // Get player stats
    let playerStats = await PlayerStats.findOne({ userId });
    if (!playerStats) {
      playerStats = await PlayerStats.create({ userId });
    }

    // Create queue entry
    const queueEntry = await MatchmakingQueue.create({
      userId,
      preferredPlayerCount,
      skillRating: playerStats.skillRating
    });

    // Calculate estimated wait time
    const playersInQueue = await MatchmakingQueue.countDocuments({
      status: "waiting",
      preferredPlayerCount
    });

    const estimatedWaitTime = Math.max(10, playersInQueue * 15); // Rough estimate

    res.status(200).json({
      success: true,
      queueId: queueEntry._id,
      message: "Joined queue",
      estimatedWaitTime,
      skillRating: playerStats.skillRating
    });
  } catch (error) {
    console.error("Error joining queue:", error);
    res.status(500).json({
      success: false,
      message: "Error joining queue"
    });
  }
};

/**
 * Cancel matchmaking queue
 */
export const cancelQueue = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized" 
      });
    }

    const userId = req.session.user.id;
    const { queueId } = req.body;

    const result = await MatchmakingQueue.findOneAndDelete({
      _id: queueId,
      userId
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Queue entry not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Cancelled queue"
    });
  } catch (error) {
    console.error("Error cancelling queue:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling queue"
    });
  }
};

/**
 * Get queue status
 */
export const getQueueStatus = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized" 
      });
    }

    const queueId = req.query.queueId;
    const queueEntry = await MatchmakingQueue.findById(queueId);

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: "Queue entry not found"
      });
    }

    const waitTimeSeconds = (Date.now() - queueEntry.joinedAt.getTime()) / 1000;
    const playersInQueue = await MatchmakingQueue.countDocuments({
      status: "waiting",
      preferredPlayerCount: queueEntry.preferredPlayerCount
    });

    const estimatedWaitTime = Math.max(5, (playersInQueue / queueEntry.preferredPlayerCount) * 30);

    res.status(200).json({
      success: true,
      status: queueEntry.status,
      waitTimeSeconds,
      estimatedWaitTime,
      playersInQueue,
      matchedGameId: queueEntry.matchedGameId
    });
  } catch (error) {
    console.error("Error getting queue status:", error);
    res.status(500).json({
      success: false,
      message: "Error getting queue status"
    });
  }
};

export default {
  joinQueue,
  cancelQueue,
  getQueueStatus
};
```

---

## API Routes to Add

```javascript
// Server/route/matchmakingRoute.js (NEW FILE)

import express from "express";
import {
  joinQueue,
  cancelQueue,
  getQueueStatus
} from "../Controller/matchmakingController.js";

const router = express.Router();

router.post("/queue/join", joinQueue);
router.post("/queue/cancel", cancelQueue);
router.get("/queue/status", getQueueStatus);

export default router;
```

Add to `Server/app.js`:
```javascript
import matchmakingRoute from "./route/matchmakingRoute.js";
// ...
app.use("/api/matchmaking", matchmakingRoute);
```

---

These templates provide the foundation. Copy-paste into your project and customize as needed!
