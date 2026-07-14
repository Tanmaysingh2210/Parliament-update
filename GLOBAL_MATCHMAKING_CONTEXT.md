# Global Online Matchmaking Implementation Context
*For Claude, ChatGPT, or any AI Assistant*

---

## 🎯 PROJECT OVERVIEW

**Game Name:** Parliament (Strategy Board Game)  
**Current Status:** Friends-only code-based matchmaking  
**Goal:** Add global online matchmaking queue system  
**Tech Stack:** 
- Frontend: React + Vite + Socket.io
- Backend: Node.js + Express + MongoDB
- Real-time: Socket.io for WebSocket communication

---

## 📊 CURRENT SYSTEM ARCHITECTURE

### How Current Matchmaking Works (Code-Based)

```
User Flow:
1. User logs in/enters as guest → EntryPage.jsx
2. Dashboard.jsx - User has 2 options:
   a) Create a room with random 6-letter code
   b) Enter existing room code to join
3. Backend creates GameSession with status="waiting"
4. Players join via joinRoom API endpoint
5. Lobby.jsx waits for players (real-time via Socket.io)
6. When room full → Game starts (status="active")
7. Board.jsx displays game board
8. Gameplay happens with real-time socket events
```

### Key Database Models

**GameSession Model:**
```javascript
{
  gameCode: String,           // 6-letter code (e.g., "AB12CD")
  maxPlayer: Number,          // 2-6 players
  players: [{
    userId: ObjectId,
    cards: Array,
    pawn: String,            // Color assignment
    remainingParliamentHp: Number,
    cashRemaining: Number,
    position: Number,
    isActive: Boolean,
    isBot: Boolean
  }],
  currentTurn: ObjectId,      // Whose turn
  status: String,             // "waiting" | "active" | "finished"
  winner: ObjectId,
  turnNo: Number,
  timestamps: Date
}
```

**User Model:**
```javascript
// Likely has: id, username, email, stats, etc.
// Currently used for authentication only
```

### Current API Endpoints

```
POST /friends/create
  Body: { gameCode: "ABCDEF", maxPlayer: 4 }
  Returns: { gameSchema, players, gameCode, gameId }

POST /friends/join
  Body: { gameCode: "ABCDEF" }
  Returns: Joined game session
```

### Current Socket Events (Socket.io)

**Lobby Phase:**
```
joinLobby → Player joins room (socket emit)
lobbyUpdate → Broadcast to all players in room
gameStart → All players notified, transition to game
```

**Game Phase:**
```
rollDice → Player rolls
turnResult → Turn completion
bidStarted → Auction begins
gameOver → Winner announced
```

---

## 🆕 WHAT NEEDS TO BE ADDED: GLOBAL MATCHMAKING

### New Feature Requirements

**1. Matchmaking Queue System**
- Players click "Find Global Match" instead of entering codes
- Players join a queue based on skill level/preferences
- System automatically pairs players when conditions met
- Auto-create game session and transition to lobby

**2. Player Profile System**
- Track player statistics (wins, losses, win rate)
- Track skill ranking/rating (ELO or similar)
- Display player info in lobby before game starts

**3. Queue Management**
- Keep players in queue until matched
- Allow players to cancel queue and go back
- Show estimated wait time

**4. Matchmaking Algorithm**
- Consider: player count preference, skill level, wait time
- Match similar skill players when possible
- Match quickly if wait time exceeds threshold

---

## 🏗️ PROPOSED ARCHITECTURE CHANGES

### New Database Collections Needed

**1. MatchmakingQueue Collection**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,                    // Player joining queue
  skillRating: Number,                 // 800-3000 (ELO style)
  preferredPlayerCount: Number,        // 2-6 players
  joinedAt: Date,
  status: String,                      // "waiting" | "matched"
  matchedGameId: ObjectId,             // Once matched
  timeoutAt: Date                      // Auto-remove after 5 min
}
```

**2. PlayerStats Collection**
```javascript
{
  userId: ObjectId,
  wins: Number,
  losses: Number,
  totalGames: Number,
  skillRating: Number,                 // Updated after each game
  averageGameDuration: Number,
  lastUpdated: Date
}
```

**3. MatchHistory Collection** (Optional)
```javascript
{
  gameId: ObjectId,
  players: [ObjectId],
  winner: ObjectId,
  skillRatingChanges: {},              // userId -> rating change
  playedAt: Date
}
```

### New Database Indexes
```javascript
MatchmakingQueue: { userId: 1, status: 1, joinedAt: 1 }
MatchmakingQueue: { skillRating: 1, preferredPlayerCount: 1 }
PlayerStats: { userId: 1 }
MatchHistory: { playedAt: -1 }
```

---

## 🔄 NEW ENDPOINTS NEEDED

### Matchmaking Endpoints

```
POST /matchmaking/queue/join
  Body: { preferredPlayerCount: 4 }
  Returns: { queueId, estimatedWaitTime }
  
POST /matchmaking/queue/cancel
  Body: { queueId }
  Returns: { success: boolean }

GET /matchmaking/queue/status
  Query: ?queueId=xxx
  Returns: { status, estimatedWaitTime, matchedGameId }

GET /player/stats/:userId
  Returns: { wins, losses, skillRating, totalGames }
```

### Modified Endpoints

```
POST /game/finish
  Should: Update PlayerStats, MatchHistory
          Recalculate skill ratings
          Archive game
```

---

## 📡 NEW SOCKET EVENTS NEEDED

```
// Queue Events
client → server: "queue:join" 
  payload: { preferredPlayerCount }

server → client: "queue:joined"
  payload: { queueId, estimatedWaitTime }

client → server: "queue:cancel"
  payload: { queueId }

server → client: "queue:cancelled"
  payload: { success }

server → client: "match:found"
  payload: { gameId, gameCode, players, opponentInfo }

server → client: "match:timeout"
  payload: { message: "No match found after 5 minutes" }

// Status updates
server → client: "queue:update"
  payload: { estimatedWaitTime, playersInQueue }
```

---

## 🎨 FRONTEND CHANGES NEEDED

### Modified Pages/Components

**1. Dashboard.jsx** - Add new button
```
Current buttons:
- "Create Room (Friends)"
- "Join Room (Friends)"

New buttons:
- "Find Global Match" (new)
- [Friends options still available]
```

**2. New Component: MatchmakingWaiting.jsx**
```
Display:
- Status message ("Looking for players...")
- Estimated wait time (updates every 5 seconds)
- Cancel button
- Player preference display (e.g., "Looking for 4 players")
- Loading animation
```

**3. Modified Lobby.jsx**
```
Display opponent info:
- Player names
- Skill ratings
- Win rates
- Recent performance

Show for both code-based AND matched games
```

**4. Modified Board.jsx** (Maybe)
```
Show opponent stats during game
Display "Matched via Global Matchmaking" indicator
```

---

## 🖥️ BACKEND CHANGES NEEDED

### New Controllers Needed

**1. matchmakingController.js**
```javascript
// joinQueue(req, res)
// cancelQueue(req, res)
// getQueueStatus(req, res)
// matchPlayers()  [background process]
```

**2. playerStatsController.js**
```javascript
// getPlayerStats(req, res)
// updatePlayerStats(userId, result)
// calculateSkillRating(wins, losses)  [ELO logic]
```

### New Socket Logic Needed

**1. matchmakingSocket.js** (New File)
```javascript
// Handle queue join/cancel
// Listen for matchmaking events
// Emit queue updates every 10 seconds
// Emit match:found when match happens
```

**2. Modify gameSocket.js**
```javascript
// Add opponent info emission on game start
// Track game result for stats update
```

### Matchmaking Algorithm (Core Logic)

```
Algorithm: Simple Skill-Based Matching

1. Player joins queue with preferredPlayerCount=4
2. Background job runs every 2 seconds:
   a) Get all waiting players
   b) Group by preferredPlayerCount (4 players, 5, 6, etc)
   c) For 4-player group, sort by skillRating
   d) Find players within 500 skill points of each other
   e) If found 4 players → Create game & emit match:found
   f) If no match after 60 seconds → Widen skill gap to ±750
   g) If no match after 180 seconds → Match with anyone

3. When match found:
   a) Create GameSession with auto-generated code
   b) Update queue entries to status="matched"
   c) Emit "match:found" to all matched players
   d) Transition to Lobby
```

### Background Job Needed

**Location:** Could be in SocketServer.js or separate file

```javascript
// Runs every 2 seconds
// Checks MatchmakingQueue collection
// Performs matching algorithm
// Creates games
// Sends socket emissions
```

---

## 🔐 AUTHENTICATION & VALIDATION

**Important Considerations:**
- Queue join requires authenticated user (check session)
- Cannot join queue twice simultaneously
- Validate preferredPlayerCount (2-6)
- Track user activity to prevent queue abuse
- Clean up stale queue entries (auto-remove after 5 min)

---

## 📈 SKILL RATING SYSTEM (ELO Style)

```
Initial Rating: 1200
Minimum Rating: 800
Maximum Rating: 3000

After Game:
- Winner gains points based on opponent rating
- Loser loses points
- Formula: 
  ratingChange = K * (result - expectedWinProbability)
  where K=32, result=1 for win, 0 for loss

Example:
- 1200 rated player beats 1200 → +16 rating
- 1200 rated player beats 1500 → +32 rating
- 1500 rated player loses to 1200 → -32 rating
```

---

## 📋 IMPLEMENTATION ROADMAP

### Phase 1: Database & Models (Easy)
- [ ] Create PlayerStats schema
- [ ] Create MatchmakingQueue schema
- [ ] Create MatchHistory schema
- [ ] Add indices for performance

### Phase 2: Backend Controllers (Medium)
- [ ] Create matchmakingController.js
- [ ] Create playerStatsController.js
- [ ] Implement skill rating calculation
- [ ] Create background matching job

### Phase 3: Socket Events (Medium)
- [ ] Create matchmakingSocket.js
- [ ] Implement queue join/cancel events
- [ ] Implement match:found event
- [ ] Add queue status updates

### Phase 4: Frontend UI (Medium)
- [ ] Create MatchmakingWaiting.jsx
- [ ] Modify Dashboard.jsx with new button
- [ ] Update Lobby.jsx with opponent stats
- [ ] Update socket connection handlers

### Phase 5: Integration (Easy)
- [ ] Wire everything together
- [ ] Test end-to-end flow
- [ ] Handle edge cases
- [ ] Performance testing

---

## ⚡ PERFORMANCE CONSIDERATIONS

1. **Queue Polling Frequency:** Every 2 seconds (balance: responsiveness vs DB load)
2. **Estimated Wait Time:** Cache for 10 seconds (prevent constant recalculation)
3. **Stale Queue Cleanup:** Remove entries older than 5 minutes
4. **Concurrent Matches:** Background job should avoid duplicate matches
5. **Database Indexes:** Must index on (skillRating, preferredPlayerCount) for fast queries

---

## 🐛 EDGE CASES TO HANDLE

1. Player leaves queue after match found but before game starts
2. Player joins queue, gets matched, but loses connection
3. Multiple matches created for same player (race condition)
4. Queue entry gets stuck if background job crashes
5. Skill rating manipulation (preventing abuse)
6. Very long queue times (widen skill gap over time)
7. Uneven player counts (4 players want to join, 1 spot available)

---

## 🔗 INTEGRATION POINTS WITH EXISTING CODE

**Socket.io Connection:**
- Located: Frontend/src/Component/socket.js
- Already connected on app startup
- Just need to add new event listeners

**Game Creation:**
- Already works via POST /friends/create
- Matchmaking can reuse same endpoint (auto-generate code)
- OR create new endpoint POST /game/auto-create (recommended)

**Game Result Handling:**
- After game ends (Board.jsx)
- Need to send winner info to backend
- Backend updates PlayerStats
- Update MatchHistory

---

## 📝 FILE STRUCTURE AFTER CHANGES

```
Server/
  Controller/
    gameController.js        (existing - add auto-create endpoint)
    matchmakingController.js (NEW)
    playerStatsController.js (NEW)
  models/
    GameSession.js           (existing)
    PlayerStats.js           (NEW)
    MatchmakingQueue.js      (NEW)
    MatchHistory.js          (NEW)
  Socket/
    gameSocket.js            (existing - modify)
    matchmakingSocket.js     (NEW)
  utils/
    skillRating.js           (NEW - ELO calculation)
    matchmakingEngine.js     (NEW - matching algorithm)

Frontend/
  pages/
    Dashboard.jsx            (modify - add button)
  Component/
    MatchmakingWaiting.jsx   (NEW)
    Lobby.jsx                (modify - show opponent stats)
    Board.jsx                (modify - show matchmaking badge)
```

---

## 🎯 SUCCESS CRITERIA

✅ Players can click "Find Global Match"  
✅ System finds suitable opponent within 5 minutes  
✅ Game starts automatically with matched opponents  
✅ Player stats track wins/losses  
✅ Skill rating updates after each game  
✅ Lobby shows opponent information  
✅ Queue can be cancelled anytime  
✅ No duplicate matches created  
✅ System handles disconnections gracefully  

---

## 📞 QUESTIONS FOR CLARIFICATION

If implementing this, consider asking:

1. Should we have different game modes (Ranked vs Casual)?
2. What's the minimum player wait time we accept?
3. Should we show player stats before joining queue?
4. Do we want seasonal resets for ratings?
5. Should there be special matchmaking for new players?
6. What happens if players queue for different player counts?
7. Should we implement a "play again" feature with recent opponents?
8. Do we need anti-smurfing measures?

---

## 🚀 QUICK START CHECKLIST FOR IMPLEMENTATION

```
Day 1: Database setup
- [ ] Create 3 new schemas
- [ ] Create database indices
- [ ] Seed sample PlayerStats

Day 2: Backend logic
- [ ] Create matchmakingController.js
- [ ] Create matching algorithm
- [ ] Create background job
- [ ] Test with Postman

Day 3: Socket events
- [ ] Add queue events
- [ ] Test socket emissions
- [ ] Verify match creation

Day 4: Frontend UI
- [ ] Create MatchmakingWaiting component
- [ ] Update Dashboard
- [ ] Update Lobby to show stats
- [ ] Connect sockets

Day 5: Integration & Testing
- [ ] End-to-end testing
- [ ] Fix bugs
- [ ] Performance optimization
- [ ] Deploy
```

---

**Document Created:** For use with Claude, ChatGPT, or similar AI assistants  
**Purpose:** Provide complete context for implementing global matchmaking  
**Audience:** AI coding assistants & developers
