# Quick Reference: Global Matchmaking Changes

## 📌 ONE-PAGE SUMMARY

### Current State
```
User → Create Room (code) → Share Code → Friend Joins → Play
       OR
User → Enter Code → Join Room → Wait → Play
```

### New State (Adding Global Matchmaking)
```
User → "Find Global Match" → Queue (wait with UI) → Auto-Match → Play
       (Keeps old code-based option available too)
```

---

## 🗂️ 4 NEW DATABASE TABLES

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| MatchmakingQueue | Track waiting players | userId, skillRating, preferredPlayerCount, status, joinedAt |
| PlayerStats | Track wins/losses | userId, wins, losses, skillRating, totalGames |
| MatchHistory | Record played games | gameId, players, winner, skillRatingChanges |
| (Optional) UserProfile | Player info | userId, avatar, level, badges |

---

## 🎯 7 KEY FEATURES TO BUILD

| # | Feature | Where | What |
|----|---------|-------|------|
| 1 | Queue Join Button | Dashboard.jsx | "Find Global Match" button |
| 2 | Waiting Screen | MatchmakingWaiting.jsx (NEW) | Show "Looking for players..." with timer |
| 3 | Auto-Matching | matchmakingEngine.js (NEW) | Background job every 2 seconds |
| 4 | Queue Management | matchmakingController.js (NEW) | API for join/cancel/status |
| 5 | Player Stats | playerStatsController.js (NEW) | Track wins/losses/rating |
| 6 | Skill Ratings | skillRating.js (NEW) | ELO-style rating calculation |
| 7 | Real-Time Updates | matchmakingSocket.js (NEW) | Socket events for queue |

---

## 🏃 IMPLEMENTATION STEPS (Simplified)

### Step 1: Database (30 min)
```javascript
// Add 3 new MongoDB schemas:
// - MatchmakingQueue
// - PlayerStats  
// - MatchHistory
// Add indices for speed
```

### Step 2: Matching Logic (1 hour)
```javascript
// Create function that:
// - Finds players in queue
// - Groups by player count
// - Matches by skill rating
// - Creates game
```

### Step 3: API Endpoints (30 min)
```javascript
POST /matchmaking/join        // User joins queue
POST /matchmaking/cancel      // User leaves queue
GET /matchmaking/status       // Check queue status
GET /player/stats/:userId     // Get player stats
```

### Step 4: Socket Events (30 min)
```javascript
// 5 new events:
"queue:join", "queue:joined", "queue:update", 
"match:found", "match:timeout"
```

### Step 5: Frontend UI (1 hour)
```javascript
// New: MatchmakingWaiting.jsx (waiting screen)
// Modified: Dashboard.jsx (add button)
// Modified: Lobby.jsx (show opponent stats)
```

### Step 6: Glue It All Together (30 min)
```javascript
// Connect button → queue join
// Socket event → navigate to game
// Game end → update stats
```

---

## 📊 FLOW DIAGRAM

```
┌─────────────────┐
│  Dashboard.jsx  │
│  Click Button   │
│  "Find Match"   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ POST /matchmaking/join      │
│ playerCount=4, skillRating  │
└────────┬────────────────────┘
         │ Response: { queueId, wait=45s }
         ▼
┌──────────────────────────────┐
│ MatchmakingWaiting.jsx       │
│ (Show "Finding...35s wait")  │
│ Socket: queue:update every 5s│
└────────┬─────────────────────┘
         │
  [Background Job every 2s]
  [Check MatchmakingQueue collection]
  [Find 4 players with similar skill]
  [Create GameSession]
  │
  ▼
┌──────────────────────────┐
│ Socket: match:found      │
│ (All 4 players notified) │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────┐
│ Lobby.jsx            │
│ Shows: opponents,    │
│ their skill ratings, │
│ ready to play        │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Board.jsx - Game     │
│ (Normal gameplay)    │
└────────┬─────────────┘
         │
         ▼ (game ends)
┌──────────────────────────────┐
│ Update PlayerStats           │
│ Update MatchHistory          │
│ Recalculate Skill Ratings    │
└──────────────────────────────┘
```

---

## 🔧 FILE CHECKLIST (What to Create/Modify)

### CREATE (New Files)
- [ ] Server/models/MatchmakingQueue.js
- [ ] Server/models/PlayerStats.js
- [ ] Server/models/MatchHistory.js
- [ ] Server/Controller/matchmakingController.js
- [ ] Server/Controller/playerStatsController.js
- [ ] Server/Socket/matchmakingSocket.js
- [ ] Server/utils/matchmakingEngine.js
- [ ] Server/utils/skillRating.js
- [ ] Frontend/src/Component/MatchmakingWaiting.jsx
- [ ] Frontend/src/pages/SkillRatings.jsx (optional - show leaderboard)

### MODIFY (Existing Files)
- [ ] Frontend/src/pages/Dashboard.jsx → Add "Find Global Match" button
- [ ] Frontend/src/Component/Lobby.jsx → Display opponent stats
- [ ] Frontend/src/Component/socket.js → Add queue event listeners
- [ ] Server/app.js → Add new routes for matchmaking
- [ ] Server/SocketServer.js → Add background matching job
- [ ] Server/Socket/gameSocket.js → Emit player stats on game start

### OPTIONAL
- [ ] Frontend/src/pages/Profile.jsx → Show player stats
- [ ] Create leaderboard display

---

## 🎮 PLAYER FLOW (Step by Step)

```
1. Player opens game
2. Goes to Dashboard
3. Clicks "Find Global Match" (NEW BUTTON)
4. Enters queue (API call)
5. Sees MatchmakingWaiting screen (NEW SCREEN)
   - "Searching for 4 players..."
   - "Estimated wait: 45 seconds"
   - Cancel button
   - Real-time updates via socket
6. Other 3 players also waiting in queue
7. Matching algorithm finds them (within skill rating, same player count preference)
8. All 4 get "match:found" socket event
9. Game auto-created with unique code
10. All transition to Lobby
11. See opponent names, ratings, win/loss records
12. Game starts normally
13. After game: stats updated (wins, rating changes, history)
```

---

## ⚙️ MATCHING ALGORITHM (Simplified)

```
Every 2 seconds:
  1. Get all players in MatchmakingQueue with status="waiting"
  2. Group by preferredPlayerCount (2, 3, 4, 5, 6)
  3. For 4-player group:
     - Sort by skillRating ascending
     - For each player P:
       - Find 3 others within ±500 rating
       - If found → Create game, mark as "matched"
  4. If no match found after 60s:
     - Widen range to ±750 rating
  5. If no match found after 180s:
     - Match with anyone (first come, first served)
```

---

## 💾 SKILL RATING CALCULATION (ELO)

```
Start: 1200 rating

After each game:
  Expected Win % = 1 / (1 + 10^((opponent_rating - your_rating) / 400))
  
  Rating Change = K * (result - expectedWinPercent)
  where K = 32 (can adjust)
  
  Examples:
  - 1200 beats 1200 → +16 rating (50% chance expected)
  - 1200 beats 1500 → +32 rating (27% chance expected, good win!)
  - 1500 loses to 1200 → -32 rating (73% expected, bad loss)
```

---

## 🚨 IMPORTANT EDGE CASES

1. Player cancels queue after being matched → Remove from queue, don't start game
2. Player disconnects while in queue → Auto-remove after 5 min
3. Two matching jobs find same player → Add unique constraint checks
4. Very different player counts (4 want to join, 1 spot available) → Keep separate queues
5. New players (low/no stats) → Assign starting rating of 1200
6. Long waits → Gradually widen skill gap, notify player

---

## 📈 EXPECTED IMPROVEMENTS

**Before:** 
- Players need friends or codes to play
- No progression system
- All games same difficulty

**After:**
- Players can play globally anytime
- Skill-based matching → competitive experience
- Leaderboards & progression
- Rating system tracks improvement
- Stats motivate players

---

## 💡 IMPLEMENTATION TIPS

1. **Test matching logic separately** before connecting socket
2. **Use Postman** to test queue APIs before frontend
3. **Background job should be idempotent** (safe to call multiple times)
4. **Add logging** to matchmaking engine for debugging
5. **Test edge cases** (disconnect, duplicate matches, timeouts)
6. **Start with simple matching** (exact player count) then enhance
7. **Don't need leaderboard** immediately - add later if desired

---

## 📚 RESOURCES ALREADY IN YOUR CODE

✅ Socket.io setup working (Component/socket.js)  
✅ Express routes working (routes/*.js)  
✅ MongoDB working (models structure)  
✅ Session auth working (authContext)  
✅ Game session creation working (can reuse)  
✅ Lobby component working (can modify)  

**You have all the pieces, just need to add matchmaking orchestration!**

---

## 🎯 SUCCESS CRITERIA

- [ ] Players can join matchmaking queue
- [ ] Queue shows estimated wait time
- [ ] System matches players within 5 minutes
- [ ] Matched players see each other in lobby
- [ ] Game starts automatically
- [ ] Stats are tracked after games
- [ ] Skill ratings update correctly
- [ ] Can cancel queue anytime
- [ ] No duplicate matches created

---

**Last Updated:** May 26, 2026  
**For:** Parliament Game Global Matchmaking Feature  
**Status:** Ready for Claude/ChatGPT implementation
