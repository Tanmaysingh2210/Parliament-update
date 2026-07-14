import MatchmakingQueue from "../models/MatchmakingQueue.js";
import Game from "../models/GameSession.js";

const pawnColors = ['redPawn', 'blackPawn', 'whitePawn', 'bluePawn', 'yellowPawn', 'greenPawn'];

// In-memory lock — prevents concurrent matching cycles
let isRunning = false;

/**
 * Generate a random 6-char room code (same logic as frontend generateRoomCode)
 */
function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Build a default player object matching the existing GameSession schema.
 * Mirrors the shape used in gameController.js createRoom / joinRoom.
 */
function buildPlayerEntry(userId, pawnIndex) {
  return {
    userId,
    cards: [],
    isBot: false,
    pawn: pawnColors[pawnIndex] || pawnColors[0],
    remainingParliamentHp: 1500,
    remainingShieldHp: 0,
    cashRemaining: 1200,
    position: 0,
    skippedChances: 0,
    isActive: true
  };
}

/**
 * Core matching cycle — called every INTERVAL_MS.
 * For each player count (2–6), finds oldest queued players.
 * If enough exist, creates a GameSession and notifies them.
 */
async function runMatchingCycle(io) {
  if (isRunning) return;
  isRunning = true;

  try {
    for (const playerCount of [2, 3, 4, 5, 6]) {
      // Find oldest queued players for this bucket
      const queuedPlayers = await MatchmakingQueue.find({
        status: "queued",
        preferredPlayerCount: playerCount
      })
        .sort({ joinedAt: 1 })   // FIFO — oldest first
        .limit(playerCount);

      // Not enough players yet — skip to next bucket
      if (queuedPlayers.length < playerCount) continue;

      // Take exactly the number needed
      const matchedPlayers = queuedPlayers.slice(0, playerCount);
      const matchedUserIds = matchedPlayers.map(q => q.userId);

      // Generate unique game code (retry if collision)
      let gameCode = generateGameCode();
      let codeExists = await Game.findOne({ gameCode });
      let retries = 0;
      while (codeExists && retries < 5) {
        gameCode = generateGameCode();
        codeExists = await Game.findOne({ gameCode });
        retries++;
      }

      // Build player entries with pawn colors
      const players = matchedUserIds.map((uid, index) => buildPlayerEntry(uid, index));

      // Create the GameSession in "waiting" status.
      // The existing Lobby + joinLobby socket handler will transition to "active"
      // once all players connect via socket.
      const game = await Game.create({
        gameCode,
        maxPlayer: playerCount,
        players,
        currentTurn: null,
        status: "waiting"
      });

      console.log(`[matchmaking] Created game ${gameCode} for ${playerCount} players`);

      // Update all matched queue entries atomically
      await MatchmakingQueue.updateMany(
        { _id: { $in: matchedPlayers.map(q => q._id) } },
        {
          $set: {
            status: "matched",
            matchedGameId: game._id
          }
        }
      );

      // Notify each matched player via their personal socket room.
      // Players join their userId as a socket room in gameSocket.js (line 430).
      for (const queueEntry of matchedPlayers) {
        io.to(queueEntry.userId.toString()).emit("match:found", {
          gameCode: game.gameCode,
          gameId: game._id,
          playerCount
        });
      }

      console.log(`[matchmaking] Notified ${playerCount} players — game ${gameCode}`);
    }

    // Also emit queue:update to all still-queued players so their position refreshes
    await emitQueueUpdates(io);

  } catch (err) {
    console.error("[matchmaking] Engine error:", err);
  } finally {
    isRunning = false;
  }
}

/**
 * Emit queue:update to every player still in "queued" status
 * so they see live position-in-queue updates.
 */
async function emitQueueUpdates(io) {
  try {
    const allQueued = await MatchmakingQueue.find({ status: "queued" }).sort({ joinedAt: 1 });

    // Group by preferredPlayerCount for position calculation
    const buckets = {};
    for (const entry of allQueued) {
      const key = entry.preferredPlayerCount;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(entry);
    }

    for (const [count, entries] of Object.entries(buckets)) {
      for (let i = 0; i < entries.length; i++) {
        io.to(entries[i].userId.toString()).emit("queue:update", {
          positionInQueue: i + 1,
          playersInQueue: entries.length,
          playersNeeded: Number(count),
          status: "queued"
        });
      }
    }
  } catch (err) {
    console.error("[matchmaking] Queue update emission error:", err);
  }
}

/**
 * Check for expired entries and notify those players.
 * TTL index auto-deletes docs, but we want to notify BEFORE deletion.
 */
async function checkExpiredEntries(io) {
  try {
    const now = new Date();
    const expiring = await MatchmakingQueue.find({
      status: "queued",
      timeoutAt: { $lte: now }
    });

    for (const entry of expiring) {
      io.to(entry.userId.toString()).emit("match:timeout", {
        message: "Matchmaking search timed out. Please try again."
      });

      await MatchmakingQueue.findByIdAndDelete(entry._id);
    }
  } catch (err) {
    console.error("[matchmaking] Expiry check error:", err);
  }
}

// ── Public API ──────────────────────────────────────────────

const MATCH_INTERVAL_MS = 5000;   // Run matching every 5 seconds
const EXPIRY_INTERVAL_MS = 10000; // Check expired entries every 10 seconds

let matchInterval = null;
let expiryInterval = null;

/**
 * Start the matchmaking engine. Call once from SocketServer.js.
 * @param {import('socket.io').Server} io — Socket.IO server instance
 */
export function startMatchmakingEngine(io) {
  console.log("[matchmaking] Engine started — checking every 5s");

  matchInterval = setInterval(() => runMatchingCycle(io), MATCH_INTERVAL_MS);
  expiryInterval = setInterval(() => checkExpiredEntries(io), EXPIRY_INTERVAL_MS);
}

/**
 * Stop the engine (useful for graceful shutdown / tests).
 */
export function stopMatchmakingEngine() {
  if (matchInterval) clearInterval(matchInterval);
  if (expiryInterval) clearInterval(expiryInterval);
  matchInterval = null;
  expiryInterval = null;
  console.log("[matchmaking] Engine stopped");
}
