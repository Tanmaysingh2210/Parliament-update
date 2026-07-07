# Global Online Matchmaking - SIMPLIFIED (No Skill System)
*For Claude, ChatGPT, or any AI Assistant*

---

## 🎯 PROJECT OVERVIEW

**Game Name:** Parliament (Strategy Board Game)  
**Current Status:** Friends-only code-based matchmaking  
**Goal:** Add simple global online matchmaking queue (NO skill ratings)  
**Tech Stack:** 
- Frontend: React + Vite + Socket.io
- Backend: Node.js + Express + MongoDB

---

## 📊 CURRENT SYSTEM

```
User Flow:
1. User logs in → Dashboard
2. Dashboard - User has 2 options:
   a) Create room with random code
   b) Enter code to join existing room
3. Wait in Lobby
4. When full → Game starts
5. Play
```

---

## 🆕 SIMPLIFIED GLOBAL MATCHMAKING

**Key Difference:** No skill ratings. Just match players quickly!

```
New User Flow:
1. User logs in → Dashboard
2. Dashboard - User has 3 options:
   a) Create room (friends code) [existing]
   b) Join room (friends code) [existing]
   c) Find Global Match [NEW]
3. Click "Find Global Match"
4. Choose player count (2-6)
5. Join queue (stored in database)
6. Wait screen shows "Searching..."
7. Background job matches first N players by player count
8. Game created automatically
9. Lobby with matched players
10. Play
```

---

## 📁 DATABASE - SIMPLIFIED

### Only 1 New Collection Needed: MatchmakingQueue

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  preferredPlayerCount: Number (2-6),
  joinedAt: Date,
  status: String,           // "waiting" | "matched"
  matchedGameId: ObjectId,  // Once matched
  timeoutAt: Date           // Auto-remove after 5 min (TTL)
}
```

**Indices:**
- `{ userId: 1 }` - unique, can't join twice
- `{ status: 1, preferredPlayerCount: 1 }` - find waiting players
- `{ joinedAt: 1 }` - TTL for auto-cleanup

**No MatchHistory, No PlayerStats (optional - add later)**

---

## 🏃 MATCHING ALGORITHM - SIMPLE

**Pseudocode (runs every 2-3 seconds):**

```
for each playerCount in [2, 3, 4, 5, 6]:
  1. Get all waiting players wanting playerCount
  2. If >= playerCount players found:
     - Take first playerCount players (FIFO - first come, first served)
     - Create GameSession
     - Update their status to "matched"
     - Return matched player IDs
  3. Continue to next playerCount
```

**That's it! No complex skill matching.**

---

## 💾 3 NEW API ENDPOINTS

```
POST /matchmaking/join
  Body: { preferredPlayerCount: 4 }
  Returns: { queueId, status: "waiting" }
  
POST /matchmaking/cancel
  Body: { queueId }
  Returns: { success: true }

GET /matchmaking/status?queueId=xxx
  Returns: { status: "waiting" or "matched", matchedGameId }
```

---

## 📡 SOCKET EVENTS - 4 NEW EVENTS

```
Client → Server:
  "queue:join"
    payload: { preferredPlayerCount: 4 }

Server → Client:
  "queue:joined"
    payload: { queueId, status: "waiting" }

  "queue:update" (every 5-10 sec while waiting)
    payload: { status: "waiting", positionInQueue: 3 }

  "match:found"
    payload: { gameId, gameCode, players: [{ userId, username }...] }

  "match:timeout" (after 5 min, no match)
    payload: { message: "No match found" }
```

---

## 🎨 FRONTEND CHANGES

### 1. Modify Dashboard.jsx
```jsx
// Add new button:
<button onClick={() => setShowMatchmakingModal(true)}>
  Find Global Match
</button>

// When clicked, show modal to select player count
```

### 2. New Component: MatchmakingWaiting.jsx
```jsx
// Show while waiting in queue
- "🔍 Finding players..."
- "Players wanted: 4"
- "Position in queue: 3"
- "Cancel" button
- Update every 5 seconds via socket
```

### 3. Modify Lobby.jsx
```jsx
// Add badge/indicator if globally matched
- "Matched via Global Queue"
- Show player names
// (No need to show ratings since no skill system)
```

---

## 🖥️ BACKEND FILES TO CREATE

### 1. Server/models/MatchmakingQueue.js (~50 lines)
```javascript
import mongoose from "mongoose";

const MatchmakingQueueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
    unique: true,
    sparse: true
  },
  preferredPlayerCount: {
    type: Number,
    enum: [2, 3, 4, 5, 6],
    required: true
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
    expires: 300  // Auto-delete after 5 minutes
  }
}, { timestamps: true });

MatchmakingQueueSchema.index({ userId: 1 });
MatchmakingQueueSchema.index({ status: 1, preferredPlayerCount: 1 });

export default mongoose.model("MatchmakingQueue", MatchmakingQueueSchema);
```

### 2. Server/Controller/matchmakingController.js (~100 lines)
```javascript
import MatchmakingQueue from "../models/MatchmakingQueue.js";

export const joinQueue = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.session.user.id;
    const { preferredPlayerCount } = req.body;

    if (!preferredPlayerCount || preferredPlayerCount < 2 || preferredPlayerCount > 6) {
      return res.status(400).json({ success: false, message: "Invalid player count" });
    }

    // Check if already in queue
    const existing = await MatchmakingQueue.findOne({ userId });
    if (existing) {
      return res.status(400).json({ success: false, message: "Already in queue" });
    }

    const queueEntry = await MatchmakingQueue.create({
      userId,
      preferredPlayerCount,
      status: "waiting"
    });

    res.status(200).json({
      success: true,
      queueId: queueEntry._id,
      status: "waiting"
    });
  } catch (error) {
    console.error("Join queue error:", error);
    res.status(500).json({ success: false, message: "Error joining queue" });
  }
};

export const cancelQueue = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { queueId } = req.body;
    const result = await MatchmakingQueue.findByIdAndDelete(queueId);

    if (!result) {
      return res.status(404).json({ success: false, message: "Queue entry not found" });
    }

    res.status(200).json({ success: true, message: "Cancelled" });
  } catch (error) {
    console.error("Cancel queue error:", error);
    res.status(500).json({ success: false, message: "Error cancelling queue" });
  }
};

export const getQueueStatus = async (req, res) => {
  try {
    const { queueId } = req.query;
    const queueEntry = await MatchmakingQueue.findById(queueId);

    if (!queueEntry) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    // Get position in queue
    const position = await MatchmakingQueue.countDocuments({
      status: "waiting",
      preferredPlayerCount: queueEntry.preferredPlayerCount,
      joinedAt: { $lt: queueEntry.joinedAt }
    });

    res.status(200).json({
      success: true,
      status: queueEntry.status,
      matchedGameId: queueEntry.matchedGameId,
      positionInQueue: position + 1
    });
  } catch (error) {
    console.error("Get status error:", error);
    res.status(500).json({ success: false, message: "Error getting status" });
  }
};

export default { joinQueue, cancelQueue, getQueueStatus };
```

### 3. Server/utils/matchmakingEngine.js (~80 lines)
```javascript
import MatchmakingQueue from "../models/MatchmakingQueue.js";
import Game from "../models/GameSession.js";
import { generateSessionId } from "./generateSession.js";

const pawnColors = ['redPawn', 'blackPawn', 'whitePawn', 'bluePawn', 'yellowPawn', 'greenPawn'];

export const matchPlayers = async () => {
  try {
    // Try each player count (4, 5, 6, 3, 2)
    const playerCounts = [4, 5, 6, 3, 2];

    for (const playerCount of playerCounts) {
      // Get waiting players for this count
      const waitingPlayers = await MatchmakingQueue.find({
        status: "waiting",
        preferredPlayerCount: playerCount
      }).sort({ joinedAt: 1 }).limit(playerCount);

      if (waitingPlayers.length === playerCount) {
        // Found enough players! Create game
        const gameCode = generateSessionId();
        
        const players = waitingPlayers.map((qEntry, index) => ({
          userId: qEntry.userId,
          cards: [],
          isBot: false,
          pawn: pawnColors[index],
          remainingParliamentHp: 1500,
          remainingShieldHp: 0,
          cashRemaining: 1200,
          position: 0,
          skippedChances: 0,
          isActive: true
        }));

        const game = await Game.create({
          gameCode,
          maxPlayer: playerCount,
          players,
          status: "waiting"
        });

        // Update queue entries
        const userIds = waitingPlayers.map(p => p.userId);
        await MatchmakingQueue.updateMany(
          { userId: { $in: userIds } },
          { status: "matched", matchedGameId: game._id }
        );

        console.log(`✅ Matched ${playerCount} players for game ${gameCode}`);
        return { matched: true, game, userIds };
      }
    }

    return { matched: false };
  } catch (error) {
    console.error("Matching error:", error);
    return { matched: false, error };
  }
};

export const cleanupStale = async () => {
  try {
    const result = await MatchmakingQueue.deleteMany({
      joinedAt: { $lt: new Date(Date.now() - 300000) } // 5 min ago
    });
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned ${result.deletedCount} stale entries`);
    }
  } catch (error) {
    console.error("Cleanup error:", error);
  }
};

export default { matchPlayers, cleanupStale };
```

### 4. Server/route/matchmakingRoute.js (~20 lines)
```javascript
import express from "express";
import { joinQueue, cancelQueue, getQueueStatus } from "../Controller/matchmakingController.js";

const router = express.Router();

router.post("/join", joinQueue);
router.post("/cancel", cancelQueue);
router.get("/status", getQueueStatus);

export default router;
```

---

## 🔌 MODIFY EXISTING FILES

### Server/app.js
```javascript
// Add import
import matchmakingRoute from "./route/matchmakingRoute.js";

// Add route
app.use("/api/matchmaking", matchmakingRoute);
```

### Server/SocketServer.js
```javascript
// Add background job in initialization:

import { matchPlayers, cleanupStale } from "./utils/matchmakingEngine.js";

// Every 3 seconds, try to match players
setInterval(async () => {
  const result = await matchPlayers();
  
  if (result.matched && result.userIds) {
    // Emit socket events to all matched players
    result.userIds.forEach(userId => {
      io.to(userId).emit("match:found", {
        gameId: result.game._id,
        gameCode: result.game.gameCode,
        players: result.game.players
      });
    });
  }
}, 3000);

// Cleanup stale entries every 60 seconds
setInterval(cleanupStale, 60000);
```

### Frontend/src/Component/socket.js
```javascript
// Add socket listeners:

socket.on("queue:joined", (data) => {
  console.log("Joined queue:", data.queueId);
});

socket.on("queue:update", (data) => {
  console.log("Position in queue:", data.positionInQueue);
  // Update UI with position
});

socket.on("match:found", (data) => {
  console.log("Match found!", data);
  // Navigate to lobby with matched game
  // window.location.href = `/lobby?room=${data.gameCode}`;
});

socket.on("match:timeout", (data) => {
  console.log("Queue timeout:", data.message);
  // Show message and allow retry
});
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Database (30 min)
- [ ] Create MatchmakingQueue.js schema
- [ ] Add indices
- [ ] Test in MongoDB

### Phase 2: Backend (1 hour)
- [ ] Create matchmakingController.js
- [ ] Create matchmakingEngine.js
- [ ] Create matchmakingRoute.js
- [ ] Add route to app.js
- [ ] Test with Postman

### Phase 3: Background Job (30 min)
- [ ] Add job to SocketServer.js
- [ ] Test matching algorithm
- [ ] Verify game creation

### Phase 4: Socket Events (30 min)
- [ ] Add socket listeners in socket.js
- [ ] Test socket emissions
- [ ] Verify navigation

### Phase 5: Frontend UI (1-2 hours)
- [ ] Create MatchmakingWaiting.jsx
- [ ] Modify Dashboard.jsx
- [ ] Modify Lobby.jsx
- [ ] Test end-to-end

---

## 🧪 TESTING CHECKLIST

```
API Tests:
□ POST /matchmaking/join - Success
□ POST /matchmaking/join - Already in queue (error)
□ GET /matchmaking/status - Waiting
□ GET /matchmaking/status - Matched
□ POST /matchmaking/cancel - Success

Matching Tests:
□ 4 players waiting → Match creates game
□ 2 players waiting, 2 more join → Match when 4 total
□ 5 players - some want 2, some want 4 → Separate queues
□ Stale entries auto-deleted after 5 min
□ No duplicate matches (no 2 games for same player)

Socket Tests:
□ queue:joined emits when player joins
□ queue:update emits every 10 seconds
□ match:found emits when game created
□ Players navigate to lobby on match:found

End-to-End:
□ User clicks "Find Global Match"
□ Waits in queue
□ Gets matched with others
□ Plays game
□ Returns to dashboard
```

---

## ⚡ SIMPLIFIED FLOW

```
User Dashboard
    ↓
Click "Find Global Match"
    ↓
Select Player Count (2-6)
    ↓
POST /matchmaking/join
    ↓
MatchmakingWaiting.jsx (show "Searching...")
    ↓
[Background job runs every 3 seconds]
    ↓
When enough players → Create Game
    ↓
Socket: "match:found"
    ↓
Navigate to Lobby
    ↓
Game Starts
```

---

## 🎯 THAT'S IT!

**No skill ratings**  
**No complex matching**  
**Just: Queue → Match → Play**

---

**Estimated Time:** 1-2 days for implementation  
**Total New Code:** ~400 lines  
**Complexity:** Low/Medium  
**Benefits:** 
- Players can play anytime with anyone
- Simple and fast to implement
- Can add skill ratings later if desired

---

For implementation, copy this file + code templates to Claude/ChatGPT!
