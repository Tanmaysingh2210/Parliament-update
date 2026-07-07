# Parliament-Update Matchmaking System - Comprehensive Analysis

## 📋 Executive Summary

The Parliament-Update game uses a **code-based room matching system** rather than automatic matchmaking. Players create games with unique room codes and invite others to join. There is **NO friends system, automatic queue, or skill-based matching** currently implemented.

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PARLIAMENT BATTLEGROUND                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (React)              Backend (Node.js/Express)  │
│  ├─ EntryPage.jsx             ├─ gameRoute.js            │
│  ├─ Dashboard.jsx             ├─ authRoute.js            │
│  ├─ Lobby.jsx                 ├─ gameController.js       │
│  ├─ Board.jsx                 ├─ authController.js       │
│  ├─ socket.js                 ├─ guestController.js      │
│  └─ AuthContext.jsx           └─ Models (User, Game)     │
│                                                             │
│  Socket.io Events (Real-time)                             │
│  ├─ joinLobby                                             │
│  ├─ lobbyUpdate                                           │
│  ├─ gameStart                                             │
│  ├─ rollDice / turnResult                                 │
│  └─ [Game-specific events]                                │
│                                                             │
│  MongoDB                                                   │
│  ├─ Users (with session tokens)                           │
│  ├─ GameSessions (with player data)                       │
│  └─ Cards (game content)                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎮 Complete Matchmaking Flow (Start to Finish)

### **Phase 1: Authentication Entry**

**File**: `Frontend/src/pages/EntryPage.jsx`

```
User lands on app
    ↓
Choose: Guest | Login | Sign Up
    ├─ Guest → GET /auth/guest
    ├─ Login → POST /auth/signin
    └─ Sign Up → POST /auth/signup
    ↓
Session created with user data
    ↓
Navigate to Dashboard
```

### **Phase 2: Game Mode Selection**

**File**: `Frontend/src/pages/Dashboard.jsx`

```
Dashboard shows "Play with Friends" button
    ↓
Opens modal with two options:
    ├─ CREATE ROOM
    └─ JOIN ROOM
```

### **Phase 3a: CREATE ROOM Flow**

**Frontend** → `Dashboard.jsx` | `handleCreateRoom()`

```
1. User selects player count (2-6)
2. Generate random room code (8 chars, base36)
   Example: "ABC12XY9"
3. POST /friends/create
   Body: { maxPlayer: 4, gameCode: "ABC12XY9" }
4. Socket.connectSocket(user) - connect WebSocket
5. Navigate to /lobby?room=ABC12XY9
```

**Backend** → `gameController.js` | `createRoom()`

```
1. Validate authentication
2. Validate params (maxPlayer 2-6)
3. Create GameSession in MongoDB:
   {
     gameCode: "ABC12XY9",
     maxPlayer: 4,
     players: [{
       userId: creator_id,
       pawn: "redPawn",
       cards: [],
       remainingParliamentHp: 1500,
       remainingShieldHp: 0,
       cashRemaining: 1200,
       position: 0,
       isActive: true
     }],
     status: "waiting",
     turnNo: 0
   }
4. Return to frontend with gameSchema and gameCode
```

**Pawn Assignment** (automatic based on join order):
- Player 1 (Creator): `redPawn`
- Player 2: `blackPawn`
- Player 3: `whitePawn`
- Player 4: `bluePawn`
- Player 5: `yellowPawn`
- Player 6: `greenPawn`

### **Phase 3b: JOIN ROOM Flow**

**Frontend** → `Dashboard.jsx` | `handleJoinRoom()`

```
1. User enters room code (e.g., "ABC12XY9")
2. POST /friends/join
   Body: { gameCode: "ABC12XY9" }
3. Socket.connectSocket(user) - connect WebSocket
4. Navigate to /lobby?room=ABC12XY9
```

**Backend** → `gameController.js` | `joinRoom()`

```
1. Validate authentication
2. Perform atomic MongoDB operation:
   - Find room with:
     * gameCode matches
     * status === "waiting"
     * players.length < maxPlayer
     * user not already in players
   - If found, push new player to players array
   - Assign pawn color based on players.length
3. Check if room now full (players.length === maxPlayer):
   If YES:
     - Set status = "active"
     - Set currentTurn = players[0].userId
     - Set turnDeadline = now + 32 seconds
     - Save game
4. Return updated game state
```

**If Room Full** → Game automatically activates

### **Phase 4: Lobby - Waiting for Players**

**File**: `Frontend/src/Component/Lobby.jsx`

```
Player lands on /lobby?room=ABC12XY9
    ↓
Socket emits: joinLobby({ gameCode: "ABC12XY9" })
    ↓
Backend listens for joinLobby event:
    ├─ Find game by gameCode
    ├─ Join room
    ├─ Join userId room (for private messages)
    ├─ Send current game state
    └─ Emit to room: "lobbyUpdate"
    ↓
Frontend receives: lobbyUpdate({
    players: [...],
    maxPlayer: 4,
    status: "waiting|active",
    game: {...}
})
    ↓
UI shows:
    ├─ Room Code: ABC12XY9 [Copy Button]
    ├─ Players: 2/4
    │   └─ Player names listed
    └─ Status: "Waiting for players..." or "Starting game!"
    ↓
Listen for events:
    ├─ lobbyUpdate → New player joined
    ├─ gameStart → Room full, navigate to game
    └─ lobbyError → Error occurred
```

**Socket Events in Lobby Phase**:

```
joinLobby (Client → Server)
├─ Event name: "joinLobby"
├─ Data: { gameCode: "ABC12XY9" }
└─ Response: Callback with any error

lobbyUpdate (Server → Client)
├─ Event name: "lobbyUpdate"
├─ Data: {
│     players: [
│       { userId: {_id, username}, cards: [...] },
│       { userId: {_id, username}, cards: [...] }
│     ],
│     maxPlayer: 4,
│     status: "waiting",
│     game: {...full game object...}
│   }
└─ Sent to: Entire room

identity (Server → Client)
├─ Event name: "identity"
├─ Data: { myUserId: "user_id_123" }
└─ Purpose: Player learns their own ID

gameStart (Server → Client)
├─ Event name: "gameStart"
├─ Data: { gameId, game: {...} }
└─ Sent when: Room fills up or last player joins
```

### **Phase 5: Game Activation**

**Conditions that trigger game start**:

```
CONDITION 1: Room fills up naturally
└─ Player count reaches maxPlayer
    └─ Backend detects in joinRoom()
    └─ Sets status = "active"
    └─ Broadcasts gameStart event
    └─ All players navigate to /game?room=ABC12XY9

CONDITION 2: All players reconnect to waiting game
└─ When a player joins existing "waiting" game
    └─ Check if players.length === maxPlayer
    └─ If yes, activate game
```

**Game Start Data Sent**:

```javascript
{
  gameId: ObjectId,
  game: {
    _id: ObjectId,
    gameCode: "ABC12XY9",
    maxPlayer: 4,
    status: "active",
    turnNo: 1,
    currentTurn: user_id_1,
    turnDeadline: Date,
    players: [
      {
        userId: {_id, username, email},
        pawn: "redPawn",
        position: 0,
        remainingParliamentHp: 1500,
        remainingShieldHp: 0,
        cashRemaining: 1200,
        isActive: true,
        cards: []
      },
      // ... other players
    ]
  }
}
```

---

## 📁 All Relevant File Paths & Purposes

### **Authentication Files**

| File | Purpose | Type |
|------|---------|------|
| `Frontend/src/context/AuthContext.jsx` | Global auth state management | Component |
| `Frontend/src/pages/EntryPage.jsx` | Guest/Login/Signup entry page | Page |
| `Frontend/src/pages/Login.jsx` | Login form component | Page |
| `Frontend/src/pages/Signup.jsx` | Signup form component | Page |
| `Server/Controller/authController.js` | `signup()`, `signin()`, `setUsername()` | Controller |
| `Server/Controller/guestController.js` | `createGuest()` for auto-generated users | Controller |
| `Server/route/authRoute.js` | `/auth/*` route definitions | Routes |
| `Server/models/user.js` | User MongoDB schema | Model |

### **Matchmaking/Room Files**

| File | Purpose | Type |
|------|---------|------|
| `Frontend/src/pages/Dashboard.jsx` | Main menu (create/join room) | Page |
| `Frontend/src/Component/Lobby.jsx` | Room lobby - player waiting | Component |
| `Server/Controller/gameController.js` | `createRoom()`, `joinRoom()` | Controller |
| `Server/route/gameRoute.js` | `/friends/*` route definitions | Routes |
| `Server/models/GameSession.js` | GameSession MongoDB schema | Model |

### **Game Play Files**

| File | Purpose | Type |
|------|---------|------|
| `Frontend/src/Component/Board.jsx` | Main game board UI | Component |
| `Frontend/src/Component/BoardIntegration.jsx` | Board integration logic | Component |
| `Frontend/src/Component/CardModal.jsx` | Buy/Bid card modal | Component |
| `Frontend/src/Component/GameChat.jsx` | In-game chat UI | Component |
| `Frontend/src/Component/gameChatSocket.jsx` | Chat socket events | Logic |
| `Frontend/src/Component/socket.js` | Socket.io client setup | Utility |
| `Server/Socket/gameSocket.js` | Game socket events handler | Socket Handler |
| `Server/Socket/chatSocket.js` | Chat socket events handler | Socket Handler |
| `Server/Socket/autoTurnProcessor.js` | Auto-turn for disconnected players | Logic |
| `Server/SocketServer.js` | Socket.io server setup & watchdog | Server |
| `Server/models/cards.js` | Card definitions | Model |

### **Utility & Configuration**

| File | Purpose | Type |
|------|---------|------|
| `Frontend/src/api/api.js` | Axios API client configuration | Utility |
| `Frontend/src/utils/wakeLock.js` | Keep screen awake during game | Utility |
| `Frontend/src/Component/useVisibilityReconnect.js` | Reconnect on tab focus | Hook |
| `Server/config/db.js` | MongoDB connection | Config |
| `Server/app.js` | Express app setup | Server |
| `Server/utils/generateUsername.js` | Generate guest usernames | Utility |
| `Server/utils/generateSession.js` | Generate session data | Utility |

---

## 🔌 Socket.io Events (Complete List)

### **Matchmaking Phase Events**

```javascript
// Client → Server
socket.emit("joinLobby", { gameCode: "ABC123" });

// Server → Client (Broadcasting)
io.to(gameCode).emit("lobbyUpdate", {
  players: [...],
  maxPlayer: 4,
  status: "waiting",
  game: {...}
});

socket.emit("identity", { myUserId: "user_123" });

io.to(gameCode).emit("gameStart", {
  gameId: ObjectId,
  game: {...}
});

io.to(gameCode).emit("lobbyError", {
  message: "Room not found"
});
```

### **Game Play Phase Events**

**Dice Rolling**:
```javascript
// Client → Server
socket.emit("rollDice", { gameCode: "ABC123", skippedChance: false });

// Server → Client
io.to(gameCode).emit("diceRolling", { rolledBy: userId });
io.to(gameCode).emit("diceResult", {
  diceValue: 4,
  rolledBy: userId,
  players: [...]
});
```

**Turn Management**:
```javascript
io.to(gameCode).emit("turnResult", {
  players: [...],
  currentTurn: user_id,
  turnNo: 5,
  mysteryCase: { amount: 150, statement: "..." },
  cardLanded: { name: "Mine", category: "weapon" }
});

socket.emit("actionRequired", {
  type: "buyOrBid",
  card: { id, name, price },
  playerCash: 800
});
```

**Bidding**:
```javascript
io.to(gameCode).emit("bidStarted", {
  card: { id, name, price },
  minBid: 1,
  duration: 20
});

socket.emit("submitBid", {
  gameCode: "ABC123",
  amount: 500,
  cardId: card_id
});

io.to(gameCode).emit("bidEnded", {
  winner: username,
  amount: 500,
  card: card_data
});
```

**Chat**:
```javascript
socket.emit("sendMessage", {
  roomId: gameCode,
  message: "Let's go!",
  type: "user"
});

io.to(gameCode).emit("receiveMessage", {
  id: "timestamp-random",
  sender: "PlayerName",
  content: "Let's go!",
  type: "user",
  time: "12:34:56"
});
```

**Special Events**:
```javascript
io.to(gameCode).emit("damageTaken", {
  amount: 90,
  cardName: "Mine",
  attacker: "Player1",
  victim: "Player2",
  shieldAbsorbed: true
});

io.to(gameCode).emit("timebombExploded", {
  position: 14,
  casualties: [{userId: id, damage: 90}],
  nextBlastInTurns: 5
});

io.to(gameCode).emit("boardUpdate", {
  players: [...]
});

io.to(gameCode).emit("gameOver", {
  winner: user_id,
  players: [...]
});
```

---

## 🗄️ GameSession Data Model (Complete)

```javascript
{
  _id: ObjectId,
  gameCode: String,                    // Unique room code
  maxPlayer: Number,                   // 2-6 players
  status: "waiting" | "active" | "finished",
  
  // ─── PLAYERS ───────────────────────────────────
  players: [{
    userId: ObjectId (ref: user),      // Who is this player
    cards: [{
      cardId: ObjectId (ref: cards)    // Owned cards
    }],
    pawn: String,                      // "redPawn", "blackPawn", etc
    position: Number,                  // 0-31 on board
    isActive: Boolean,                 // false if eliminated
    isBot: Boolean,                    // AI player flag
    
    // ─── HEALTH & RESOURCES ────────────────────
    remainingParliamentHp: Number,     // 0-1500 (main health)
    remainingShieldHp: Number,         // 0-750 (damage buffer)
    cashRemaining: Number,             // In-game currency
    
    // ─── SPECIAL ABILITIES ──────────────────────
    scientist: Number,                 // Bonus multiplier for damage
    agent: Boolean,                    // Damage reduction active
    purchasedWallSena: Boolean,
    purchasedWallRose: Boolean,
    purchasedWallMaria: Boolean,
    
    // ─── TURN TRACKING ─────────────────────────
    skippedChances: Number,            // Times skipped (3+ = elimination)
  }],
  
  // ─── TURN MANAGEMENT ────────────────────────────
  currentTurn: ObjectId (ref: user),   // Whose turn is it
  turnNo: Number,                      // Turn counter
  turnDeadline: Date,                  // When turn times out (32s)
  isProcessing: Boolean,               // Atomic lock for dice roll
  pendingDice: Number,                 // 1-6 value rolled
  
  // ─── ACTION PHASE (BUY/BID) ─────────────────────
  actionDeadline: Date,                // When buy/bid window closes (17s)
  pendingAction: {
    type: "buyOrBid" | "Bid" | "bidding",
    cardId: ObjectId,
    playerId: ObjectId,
    bids: [{
      userId: ObjectId,
      amount: Number
    }],
    bidDeadline: Date
  },
  
  // ─── SPECIAL CARD TRACKING ──────────────────────
  timebombs: [{
    cardId: ObjectId,
    ownerId: ObjectId,
    position: Number,
    purchasedAtTurn: Number,
    explodeAtTurn: Number,
    cycleLength: Number
  }],
  
  // ─── GAME OUTCOME ──────────────────────────────
  winner: ObjectId (ref: user),        // Who won (if finished)
  
  // ─── TIMESTAMPS ────────────────────────────────
  createdAt: Date,                     // TTL index: auto-delete after 48h
  updatedAt: Date
}
```

---

## 👤 User Data Model

```javascript
{
  _id: ObjectId,
  username: String,                    // Display name (required)
  email: String,                       // Optional (for registered users)
  passHash: String,                    // Optional (null for guests)
  isGuest: Boolean,                    // true for auto-generated accounts
  sessionToken: String,                // Unique session ID
  createdAt: Date,
  lastActive: Date
}
```

---

## 🔐 Authentication Flows

### **Flow 1: Guest User**
```
GET /auth/guest
  ↓
Backend: createGuest()
  ├─ Generate random username (e.g., "Guest_XYZ123")
  ├─ Create user with isGuest: true, passHash: null
  ├─ Establish session
  └─ Return user object
  ↓
Frontend: User immediately goes to dashboard
```

### **Flow 2: Sign Up**
```
POST /auth/signup { email, password }
  ↓
Backend: signup()
  ├─ Validate inputs (password ≥ 6 chars)
  ├─ Check if email already exists
  ├─ Hash password with bcrypt
  ├─ Create user with isGuest: false, email, passHash
  ├─ Establish session
  └─ Return user object
  ↓
Frontend: Prompt to set username via POST /auth/username
```

### **Flow 3: Sign In**
```
POST /auth/signin { email, password }
  ↓
Backend: signin()
  ├─ Find user by email
  ├─ Compare password hash
  ├─ Establish session
  ├─ Update lastActive timestamp
  └─ Return user object
  ↓
Frontend: User goes to dashboard
```

### **Flow 4: Set Username**
```
POST /auth/username { username }
  ↓
Backend: setUsername()
  ├─ Validate username (≥ 3 chars)
  ├─ Check if already taken
  ├─ Update user record
  ├─ If guest, set isGuest: false
  └─ Return updated user
```

### **Session Handling**
```
├─ Session store: MongoDB (connect-mongo)
├─ Session timeout: 7 days
├─ Cookie: connect.sid (httpOnly, secure in production)
├─ CORS credentials: true (withCredentials on frontend)
└─ Socket.io: Reuses session from Express
```

---

## 🌐 API Endpoints

### **Authentication Endpoints**

| Method | Endpoint | Body | Returns | Purpose |
|--------|----------|------|---------|---------|
| GET | `/auth/guest` | - | `{success, user}` | Create guest account |
| POST | `/auth/signup` | `{email, password}` | `{success, user}` | Register new user |
| POST | `/auth/signin` | `{email, password}` | `{success, user}` | Login user |
| POST | `/auth/username` | `{username}` | `{success, user}` | Set/update username |
| POST | `/auth/signout` | - | `{success}` | Logout & destroy session |
| GET | `/auth/me` | - | `{success, user}` | Get current user |

### **Game/Matchmaking Endpoints**

| Method | Endpoint | Body | Returns | Purpose |
|--------|----------|------|---------|---------|
| POST | `/friends/create` | `{gameCode, maxPlayer}` | `{success, gameSchema, gameId, gameCode}` | Create room |
| POST | `/friends/join` | `{gameCode}` | `{success, gameId, gameCode, maxPlayer, status, players}` | Join room |

### **Response Format**

```javascript
// Success Response
{
  success: true,
  gameId: ObjectId,
  gameCode: "ABC123",
  maxPlayer: 4,
  status: "waiting",
  players: [{...}, {...}]
}

// Error Response
{
  success: false,
  error: "Room is full",
  message: "Error description"
}
```

---

## ⚙️ How Games Fill Up & Start

### **Scenario 1: Players Join Sequentially**
```
Time  Player Count  Status      Action
────  ────────────  ──────      ──────────────────────────────
T0    1/4           waiting     Creator room created
      
T5    2/4           waiting     Player B joins
                                 lobbyUpdate sent to room
                                 
T10   3/4           waiting     Player C joins
                                 lobbyUpdate sent to room
                                 
T15   4/4           waiting     Player D joins
                                 Backend detects room full
                                 ├─ Set status = "active"
                                 ├─ Set currentTurn = Player A
                                 ├─ Set turnDeadline = T15 + 32s
                                 ├─ Save to DB
                                 └─ Emit "gameStart" to all
                                 
T16   4/4           active      All players navigate to /game
                                 Join socket room
                                 Display game board
```

### **Scenario 2: Watchdog Timeout**
```
Player A's turn:
  ├─ 32 seconds pass without rolling dice
  ├─ turnDeadline expires
  ├─ Watchdog detects stale turn
  ├─ Auto-roll: dice = random(1-6)
  ├─ Calculate new position: (current + dice) % 32
  ├─ Apply card effects
  ├─ Advance to next player
  └─ Set new turnDeadline

Skipped turns:
  ├─ After 3 skips: Player eliminated
  ├─ Continue with remaining players
  └─ If only 1 left: Game ends
```

### **Scenario 3: Player Disconnects Mid-Game**
```
Player disconnects:
  ├─ Socket "disconnect" event fires
  ├─ If their turn:
  │   ├─ Release processing lock
  │   ├─ Set turnDeadline = now + 6s (expedited)
  │   └─ Watchdog picks up sooner
  ├─ Broadcast disconnect message to room
  └─ Release any locks

Watchdog auto-processes:
  ├─ Find stale turn
  ├─ Auto-roll dice
  ├─ Calculate movement
  ├─ Apply card effects (simplified)
  ├─ Advance turn
  └─ Broadcast results

Player rejoins:
  ├─ Connect socket with gameCode
  ├─ Emit "joinLobby"
  ├─ Receive full game state
  ├─ Re-sync board display
  └─ Continue playing
```

---

## 🚫 Current Limitations

### **What EXISTS** ✅

- ✅ Code-based room creation/joining
- ✅ 2-6 player multiplayer games
- ✅ Real-time game synchronization via Socket.io
- ✅ Turn management with 32-second timeout
- ✅ Buy/Bid action phase (17-20 seconds)
- ✅ Dice rolling with animation
- ✅ Auto-turn processing for disconnected players
- ✅ Guest account support
- ✅ Registered user accounts (email/password)
- ✅ Session-based authentication
- ✅ Game persistence (24-48 hour TTL)
- ✅ Watchdog timer system (5-second intervals)

### **What's MISSING** ❌

- ❌ **Friends System** - No friend requests or friend lists
- ❌ **Direct Invites** - Only room code sharing
- ❌ **Automatic Matchmaking** - No ranked/casual queue
- ❌ **Skill-based Pairing** - No ELO or rating system
- ❌ **User Profiles** - Minimal public profile data
- ❌ **Match History** - No game replay or statistics
- ❌ **Win/Loss Tracking** - No player statistics
- ❌ **Online Status** - No presence detection
- ❌ **Player Search** - No way to find players
- ❌ **User Blocking** - No reporting/blocking system
- ❌ **Achievements** - No badge/achievement system
- ❌ **Ladder/Rankings** - No leaderboard
- ❌ **Private Messaging** - No 1-on-1 chat
- ❌ **Clans/Teams** - No group features
- ❌ **Tournaments** - No tournament system

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React)                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AuthContext.jsx                                           │
│  ├─ handleGuest() → GET /auth/guest                        │
│  ├─ login() → POST /auth/signin                            │
│  ├─ signup() → POST /auth/signup                           │
│  └─ setUsername() → POST /auth/username                    │
│                                                             │
│  Dashboard.jsx                                             │
│  ├─ handleCreateRoom() → POST /friends/create              │
│  └─ handleJoinRoom() → POST /friends/join                  │
│                                                             │
│  socket.js                                                 │
│  ├─ connectSocket() → Socket connection with auth          │
│  └─ getSocket() → Retrieve socket instance                 │
│                                                             │
│  Lobby.jsx                                                 │
│  ├─ socket.emit("joinLobby", ...)                          │
│  └─ socket.on("lobbyUpdate", ...)                          │
│  └─ socket.on("gameStart", ...)                            │
│                                                             │
│  Board.jsx                                                 │
│  ├─ socket.on("diceResult", ...)                           │
│  ├─ socket.emit("rollDice", ...)                           │
│  └─ [Game play events]                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/Socket
┌─────────────────────────────────────────────────────────────┐
│                   SERVER (Express)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Express Routes                                            │
│  ├─ /auth/* → authRoute.js                                 │
│  └─ /friends/* → gameRoute.js                              │
│                                                             │
│  Controllers                                               │
│  ├─ authController.js                                      │
│  ├─ gameController.js                                      │
│  └─ guestController.js                                     │
│                                                             │
│  Socket.io Server (SocketServer.js)                        │
│  ├─ gameSocket() handler                                   │
│  ├─ chatSocket() handler                                   │
│  ├─ Watchdog timer (5s interval)                           │
│  └─ Auto-turn processor                                    │
│                                                             │
│  Models (Mongoose)                                         │
│  ├─ User → username, email, password                       │
│  ├─ GameSession → game state, players, turn info           │
│  └─ Card → card definitions                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↕ Mongoose
┌─────────────────────────────────────────────────────────────┐
│                  MongoDB Database                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Collections                                               │
│  ├─ users                                                  │
│  ├─ game-sessions (with TTL index)                         │
│  ├─ cards                                                  │
│  ├─ sessions (express-session store)                       │
│  └─ chat-messages                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Technical Insights

### **Atomic Room Joining**
The system uses MongoDB's atomic operations to prevent race conditions:
```javascript
// Only succeeds if:
// 1. Room status is "waiting"
// 2. Players count < maxPlayer
// 3. User not already in players array
await Game.findOneAndUpdate(
  {
    gameCode,
    status: "waiting",
    $expr: { $lt: [{ $size: "$players" }, "$maxPlayer"] },
    "players.userId": { $ne: userId }
  },
  { $push: { players: {...} } }
);
```

### **Game Activation Rules**
- **Automatic**: When players.length === maxPlayer during join
- **Reconnection**: When reconnecting player completes the room
- **Failsafe**: Watchdog checks every 5 seconds

### **Turn Timeout Mechanism**
```
turnDeadline: Date        // When turn expires (32s)
isProcessing: Boolean     // Lock to prevent simultaneous rolls
pendingDice: Number       // Stores rolled value (server source of truth)
Watchdog: 5s intervals    // Detects stale turns and auto-rolls
```

### **Session Persistence**
- MongoDB session store with express-session
- 7-day cookie expiration
- Session data includes: userId, username, isGuest flag
- Socket.io reuses Express session middleware

### **Pawn Assignment Strategy**
```
Determined by join order (players array index):
Index 0 → redPawn
Index 1 → blackPawn
Index 2 → whitePawn
Index 3 → bluePawn
Index 4 → yellowPawn
Index 5 → greenPawn
```

---

## 🔄 Reconnection & Persistence

### **When Player Reconnects**:
1. Login if needed → Session established
2. Navigate to game board
3. Connect socket with user auth
4. Emit "joinLobby" with gameCode
5. Backend finds game and sends full state
6. Frontend hydrates Board component with received data
7. Player continues from where they left off

### **Graceful Disconnection**:
1. If disconnected during their turn → turnDeadline lowered to 6s
2. Watchdog picks up faster → auto-rolls dice
3. Turn continues automatically
4. When player reconnects → receives full board state
5. Can see what happened during disconnect

---

## 📈 Performance Considerations

- **Game Cleanup**: Auto-delete after 48 hours (MongoDB TTL index)
- **Session Cleanup**: Express-session handles expired sessions
- **Watchdog Efficiency**: Batches stale turn queries (5-second interval)
- **Socket Broadcasting**: Uses room-based broadcasting (`io.to(gameCode).emit()`)
- **Atomic Operations**: Prevents double-joins and race conditions
- **Message Queuing**: Built into Socket.io

---

## 🛠️ Development Setup

### **Frontend Environment**:
- Vite (build tool)
- React 18+
- Socket.io-client
- Axios for HTTP
- React Router for navigation

### **Backend Environment**:
- Node.js
- Express
- Socket.io
- MongoDB with Mongoose
- Bcrypt for password hashing
- Express-session for authentication

### **Database**:
- MongoDB Atlas (or local MongoDB)
- Collections: users, game-sessions, cards, sessions

---

## 📞 Key Socket.io Middleware

```javascript
// Authentication middleware
io.use((socket, next) => {
  sessionMiddleWare(socket.request, {}, next);
});

// User extraction from auth
const user = socket.handshake.auth;
socket.userId = user.userId;
socket.username = user.username;

// Room joining
socket.join(gameCode);        // Game room
socket.join(userId.toString()); // User private room
```

---

## 🎲 Example: Complete Room Join Sequence

```
TIME  ACTOR              ACTION                          DATA
────  ─────              ───────────────────────────────────────
0     Player A           Click "Create Room"            
      Frontend           Generate code: "XYZ789"        
      Frontend           POST /friends/create           {maxPlayer: 3, gameCode: "XYZ789"}
      Backend            Create GameSession             status: "waiting", players: [A]
      Backend            Return gameId                  {success: true, gameCode: "XYZ789"}
      Frontend           Connect socket                 auth: {userId: A_id, username: "A"}
      Frontend           Navigate to /lobby?room=XYZ789
      
5     Frontend           Emit "joinLobby"               {gameCode: "XYZ789"}
      Backend            Find game, add socket to room
      Backend            Emit "lobbyUpdate"             {players: [A], maxPlayer: 3, status: "waiting"}
      Frontend (A)       Display: Players 1/3
      
10    Player B           Enter code: "XYZ789"
      Frontend           POST /friends/join             {gameCode: "XYZ789"}
      Backend            Query game where gameCode="XYZ789"
      Backend            Atomic: Push B to players      assignedPawn: "blackPawn"
      Backend            Return updated game            {success: true, players: [A, B], status: "waiting"}
      Frontend           Connect socket
      Frontend           Navigate to /lobby?room=XYZ789
      Frontend           Emit "joinLobby"               {gameCode: "XYZ789"}
      Backend            Emit "lobbyUpdate" to room     {players: [A, B], maxPlayer: 3, status: "waiting"}
      Frontend (A)       Update display: Players 2/3
      Frontend (B)       Display: Players 2/3
      
15    Player C           Enter code: "XYZ789"
      Frontend           POST /friends/join
      Backend            Atomic: Push C to players      assignedPawn: "whitePawn"
      Backend            Players now = 3, maxPlayer = 3
      Backend            Detect room full!
      Backend            Update: status = "active"
      Backend            Set: currentTurn = A_id
      Backend            Set: turnDeadline = now + 32s
      Backend            Save game
      Backend            Emit "gameStart" to room       {gameId, game}
      Frontend (A)       Navigate to /game?room=XYZ789
      Frontend (B)       Navigate to /game?room=XYZ789
      Frontend (C)       Navigate to /game?room=XYZ789
      
16    All Players        Game board displays            Players see board with pawns
      All Players        Turn timer starts               32 seconds for Player A
      Player A           Rolls dice                      socket.emit("rollDice", ...)
      Backend            Generate dice: 4
      Backend            Emit "diceResult"              {diceValue: 4, rolledBy: A, ...}
      All Players        See animation: Dice rolls 4    A's pawn moves 4 spaces
      ...                [Game continues]
```

---

## Summary

This is a **straightforward code-based room joining system** designed for casual multiplayer gaming. It prioritizes:
- **Simplicity**: Generate a code, share it, play
- **Flexibility**: 2-6 player games, customizable
- **Reliability**: Watchdog timers, auto-processing, reconnection support
- **Real-time**: Socket.io for instant updates

The system is **production-ready** but lacks advanced features like friends systems, rankings, or matchmaking queues which would be needed for a larger player base or competitive gaming.

