# Parliament Game — Secure Architecture & Flow

---

## Core Philosophy

> **Server is God. Client is just a display.**

The client never decides anything. It only renders what the server tells it, and requests actions. Every critical check — whose turn it is, what card was landed on, damage calculation — happens **only on the server**.

---

## 1. Session Setup (Fix First)

The root cause of the "same userId for all sockets" bug is session middleware not being shared with Socket.io.

```js
// server.js
import session from "express-session";
import MongoStore from "connect-mongo";

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { httpOnly: true, secure: false, maxAge: 1000 * 60 * 60 * 24 }
});

app.use(sessionMiddleware);

// ✅ CRITICAL — share with socket.io
io.engine.use(sessionMiddleware);
```

Now every socket has its own `socket.request.session.user` correctly.

---

## 2. Socket Connection & Identity

```
Client connects → Server reads session → Stores userId on socket object
```

```js
// On connection, attach userId directly to socket (no need for requestMyIdentity event)
io.use((socket, next) => {
  const user = socket.request.session?.user;
  if (!user) return next(new Error("Unauthorized"));
  socket.userId = user.id;       // ✅ attach once, use everywhere
  socket.username = user.username;
  next();
});
```

Client no longer needs to `emit("requestMyIdentity")`. Instead:

```js
// Server → Client immediately on connection
socket.emit("identity", { myUserId: socket.userId });
```

---

## 3. Joining Lobby

```
Client emits "joinLobby" { gameCode }
  → Server finds game
  → Server adds socket to room
  → Server emits "lobbyUpdate" to room with current players
  → If game already active → emit "gameStart" to this socket only
```

No client-side logic needed. Client just renders what it receives.

---

## 4. Game Start

When the last player joins:

```
Server detects players.length === maxPlayer
  → Sets game.status = "active"
  → Sets game.currentTurn = players[0].userId
  → Saves game
  → Emits "gameStart" to entire room with { game }
```

Client navigates to Board. Board reads `game.currentTurn` from received data.

---

## 5. Turn Flow (The Core)

This is the most important part. Every turn follows this exact sequence:

```
ROLL PHASE
──────────
Client clicks dice
  → Checks: is it my turn? (currentTurnRef === myUserId)
  → Emits "rollDice" { gameCode }

Server receives "rollDice"
  → Atomic check: game.currentTurn === socket.userId (if not → ignore silently)
  → Atomic lock: set game.isProcessing = true (prevents duplicate rolls)
  → Generates diceValue
  → Saves diceValue to game.pendingDice (so playTurn can verify it later)
  → Emits "diceResult" to room { diceValue, rolledBy: userId, players }

ANIMATION PHASE (client only)
──────────────────────────────
All clients receive "diceResult"
  → Animate pawn movement visually (optimistic UI)
  → The player whose turn it was: after animation → emits "playTurn" { gameCode }
  → Other players: do nothing, just watch animation

PLAY PHASE
──────────
Server receives "playTurn" from client
  → Verifies: game.currentTurn === socket.userId (reject if not)
  → Verifies: game.isProcessing === true (reject if not — means rollDice wasn't called)
  → Uses game.pendingDice (not client-provided dice — client CANNOT fake dice value)
  → Calculates new position
  → Looks up card at position
  → Applies card effect
  → Advances currentTurn to next active player
  → Sets game.isProcessing = false
  → Sets game.pendingDice = null
  → Saves game
  → Emits "turnResult" to room { players, currentTurn, turnNo, cardEffect }
```

### Why pendingDice on server?

Currently your client sends `dice: diceValue` in `playTurn`. This means a cheating client can send any dice value they want. **Server must store the dice value and use its own copy.**

---

## 6. Card Effects — Clean Switch

Replace the current messy switch with a clean handler map:

```js
const cardHandlers = {

  start: (player) => {
    player.cashRemaining += 200;
  },

  mystery: (player) => {
    const card = getMysteryCard();
    player.cashRemaining += card.amount;
    return { mysteryCase: card };
  },

  public: (player, card) => {
    const dmg = card.weaponDamage;
    if (player.remainingShieldHp >= dmg) {
      player.remainingShieldHp -= dmg;
    } else {
      const overflow = dmg - player.remainingShieldHp;
      player.remainingShieldHp = 0;
      player.remainingParliamentHp -= overflow;
    }
  },

  weapon: (player, card, game) => {
    if (!card.isPurchasable) return;

    const owner = findCardOwner(game, card._id);

    if (!owner) {
      // Nobody owns it — player must buy or bid
      // Return a signal, do NOT return early without saving turn
      return { needsAction: true, actionType: "buyOrBid", card };
    }

    if (owner.userId.toString() === player.userId.toString()) {
      // Owns their own card — no damage
      return;
    }

    // Calculate damage
    const scientistBonus = 1 + (owner.scientist * 0.03);
    let dmg = card.weaponDamage * scientistBonus;
    if (player.agent) dmg = dmg / 2;

    applyDamage(player, dmg);
  },

  safe: () => { /* nothing */ },
  agent: (player) => { player.agent = true; return; }, // agent stays ON, not cleared
  scientist: (player) => { player.scientist += 1; },

  engineer: (player) => {
    player.remainingParliamentHp = Math.min(1000, player.remainingParliamentHp + 100);
  },

  terror: (player, card) => {
    player.cashRemaining -= card.price;
  },
};

// Agent reset — clear after every non-agent tile (already doing this, just centralize it)
if (card.category !== "agent") {
  player.agent = false;
}
```

---

## 7. Handling "needsAction" (Buy/Bid) — Without Breaking Turn

Currently when a player lands on an unowned purchasable card, you `return` early and **never save or advance the turn**. This is what causes the turn to get stuck.

**Correct approach:**

```js
// In playTurn handler, after card effect returns { needsAction }:

if (result?.needsAction) {
  // Save the PENDING state — turn is paused, not skipped
  game.pendingAction = {
    type: result.actionType,      // "buyOrBid"
    cardId: card._id,
    playerId: player.userId,
  };
  // DO NOT advance currentTurn yet
  // DO NOT set isProcessing = false yet (turn still ongoing)
  await game.save();

  socket.emit("actionRequired", {
    type: result.actionType,
    card: { id: card._id, name: card.name, price: card.price },
  });
  return; // wait for client to respond
}

// If no pending action → advance turn normally
game.pendingAction = null;
game.currentTurn = game.players[nextIndex].userId;
game.isProcessing = false;
await game.save();
io.to(gameCode).emit("turnResult", { ... });
```

Then add a new socket event `"playerAction"` (buy/bid/skip):

```js
socket.on("playerAction", async ({ gameCode, action }) => {
  // action = "buy" | "bid" | "skip"
  const game = await Game.findOne({ gameCode });

  // Verify it's actually this player's pending action
  if (!game.pendingAction) return;
  if (game.pendingAction.playerId.toString() !== socket.userId) return;

  if (action === "buy") {
    // deduct cash, add card to player
    player.cashRemaining -= card.price;
    player.cards.push({ cardId: card._id });
  }
  // bid logic separately

  // Now advance the turn
  game.pendingAction = null;
  game.currentTurn = game.players[nextIndex].userId;
  game.isProcessing = false;
  await game.save();

  io.to(gameCode).emit("turnResult", { players: game.players, currentTurn: game.currentTurn });
});
```

---

## 8. Anti-Cheat Checklist

| Check | Where | How |
|---|---|---|
| Is it your turn? | Server, every event | `game.currentTurn === socket.userId` |
| Did you actually roll? | Server, on playTurn | `game.isProcessing === true` |
| Dice value is real | Server | Use `game.pendingDice`, ignore client's dice |
| Can you afford it? | Server, on buy | Check `player.cashRemaining >= card.price` |
| Is card really unowned? | Server | Re-query DB, never trust client |
| Is game active? | Server, every event | `game.status === "active"` |
| Duplicate playTurn | Server | `isProcessing` flag acts as mutex |

---

## 9. Client Responsibilities (Only These)

```
1. Display what server sends
2. Animate pawn movement
3. Emit rollDice when it's my turn and I click
4. Emit playTurn after my animation completes
5. Show buy/bid UI when actionRequired received
6. Emit playerAction with user's choice
```

**Client NEVER:**
- Calculates damage
- Decides whose turn it is next
- Trusts its own dice value for game logic
- Sends position to server

---

## 10. GameSchema Additions Needed

```js
// Add these two fields to GameSchema:
isProcessing: { type: Boolean, default: false },   // mutex for rollDice/playTurn
pendingDice: { type: Number, default: null },       // server stores dice, client cannot fake it
pendingAction: {                                    // for buy/bid pause state
  type: {
    type: String,
    cardId: mongoose.Schema.Types.ObjectId,
    playerId: mongoose.Schema.Types.ObjectId,
  },
  default: null
}
```

---

## 11. Event Summary

| Event | Direction | Purpose |
|---|---|---|
| `identity` | S→C | Send userId to client on connect |
| `joinLobby` | C→S | Join game room |
| `lobbyUpdate` | S→C | Current lobby state |
| `gameStart` | S→C | Game began, here's full state |
| `rollDice` | C→S | Player clicks dice |
| `diceResult` | S→C | Dice value + players (for animation) |
| `playTurn` | C→S | Animation done, apply card effect |
| `actionRequired` | S→C | Player must buy/bid/skip |
| `playerAction` | C→S | Player's buy/bid/skip choice |
| `turnResult` | S→C | Final state after turn complete |
| `gameOver` | S→C | Someone won |

---

## Summary of All Bugs Fixed

1. **Same userId for all players** → `io.engine.use(sessionMiddleware)`
2. **Duplicate playTurn** → `isProcessing` flag on game + `hasEmittedPlayTurn` ref on client
3. **Client can fake dice** → Server stores `pendingDice`, ignores client's value
4. **Turn stuck on buy/bid** → `pendingAction` state, separate `playerAction` event
5. **Early returns without saving** → All code paths must save game and emit turnResult or actionRequired
6. **Stacked socket listeners** → `socket.off()` before `socket.on()` (already done)
