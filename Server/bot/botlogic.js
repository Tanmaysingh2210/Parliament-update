import User from "../models/user.js";
import Game from "../models/GameSession.js";
import Card from "../models/cards.js";
import { executeTurn, resolveBid } from "../Socket/gameSocket.js";

// A pool of random names that the user can edit or append more names to.
export const HUMAN_NAMES = [
  "Rahul", "Amit", "Vikram", "Sonia", "Priya", "Neha", "Kabir", "Meera", "Aarav", "Ananya",
  "Dev", "Diya", "Ishaan", "Karan", "Kavya", "Sanjay", "Riya", "Aditya", "Tara", "Arjun",
  "Zara", "Rohan", "Sonal", "Kunal", "Tanmay", "Nihal", "Shreya", "Pooja", "Rajesh", "Kiran",
  "Deepak", "Asha", "Sunita", "Vijay", "Anita", "Rakesh", "Preeti", "Suresh", "Geeta", "Manish"
];

// Helper to pick a random name from the pool
export function getRandomHumanName() {
  const randomIndex = Math.floor(Math.random() * HUMAN_NAMES.length);
  const randomSuffix = Math.floor(Math.random() * 900) + 100; // e.g. 482
  return `${HUMAN_NAMES[randomIndex]}_Bot${randomSuffix}`;
}

/**
 * Creates a bot user document in the database
 */
export async function createBotUser() {
  const username = getRandomHumanName();
  const botUser = await User.create({
    username,
    isGuest: true,
    email: `bot_${Date.now()}_${Math.floor(Math.random() * 100000)}@bot.local`,
    createdAt: new Date(),
    lastActive: new Date()
  });
  return botUser;
}

/**
 * Helper to build a player entry for the GameSession players array (with bot flags)
 */
export function buildBotPlayerEntry(botUser, difficulty, pawn) {
  return {
    userId: botUser._id,
    cards: [],
    isBot: true,
    botDifficulty: difficulty,
    pawn: pawn,
    remainingParliamentHp: 1500,
    remainingShieldHp: 0,
    cashRemaining: 1200,
    position: 0,
    skippedChances: 0,
    isActive: true,
    purchasedWallSena: false,
    purchasedWallRose: false,
    purchasedWallMaria: false
  };
}

/**
 * Triggered at turn transitions to check if the current turn is a bot and run its cycle.
 */
export async function checkAndTriggerBotPlay(gameCode, io) {
  try {
    const game = await Game.findOne({ gameCode, status: "active" });
    if (!game) return;

    // Check if there is a pending action decision for a bot
    if (game.pendingAction?.playerId) {
      const actionPlayerIndex = game.players.findIndex(
        p => p.userId.toString() === game.pendingAction.playerId.toString()
      );
      if (actionPlayerIndex !== -1 && game.players[actionPlayerIndex].isBot && game.players[actionPlayerIndex].isActive) {
        handleBotActionChoice(gameCode, io);
        return;
      }
    }

    // Find the player whose turn it currently is
    const activePlayerIndex = game.players.findIndex(
      p => p.userId.toString() === game.currentTurn.toString()
    );
    if (activePlayerIndex === -1) return;

    const activePlayer = game.players[activePlayerIndex];
    if (!activePlayer.isBot || !activePlayer.isActive) {
      return; // Not a bot's turn, or bot is dead
    }

    // Call bot process loop
    runBotEngineCycle(gameCode, game.currentTurn, io);

  } catch (err) {
    console.error("[botLogic] checkAndTriggerBotPlay error:", err);
  }
}

/**
 * Execute strategic decisions before a bot rolls (Shield Wall buys / Emergency Meetings).
 * Only Hard & Extreme bots perform pre-roll maneuvers.
 */
async function performBotPreRollStrategy(game, botPlayer, io) {
  const difficulty = botPlayer.botDifficulty;
  if (difficulty === "medium1" || difficulty === "medium2") return false;

  const currentHp = botPlayer.remainingParliamentHp;
  const currentShield = botPlayer.remainingShieldHp;
  const cash = botPlayer.cashRemaining;

  // Let's load wall cards prices dynamically
  const wallSena = await Card.findOne({ name: "wall sena" });
  const wallRose = await Card.findOne({ name: "wall rose" });
  const wallMaria = await Card.findOne({ name: "wall maria" });

  let updated = false;

  // 1. Strategic Shield Purchases
  // Extreme bots will buy walls whenever they can afford and wall is not purchased.
  // Hard bots will buy walls if their HP is below 1000 or if an opponent is nearby (within 8 tiles).
  const isExtreme = difficulty === "extreme";
  const shouldBuyShield = isExtreme || currentHp < 1000;

  if (shouldBuyShield && cash >= 150) {
    // Try Wall Maria
    if (wallMaria && !botPlayer.purchasedWallMaria && cash >= wallMaria.price) {
      botPlayer.cashRemaining -= wallMaria.price;
      botPlayer.remainingShieldHp += wallMaria.ShieldHp;
      botPlayer.purchasedWallMaria = true;
      updated = true;
      emitSystemChat(game.gameCode, io, botPlayer, `purchased ${wallMaria.name}`);
    }
    // Try Wall Rose
    else if (wallRose && !botPlayer.purchasedWallRose && cash >= wallRose.price) {
      botPlayer.cashRemaining -= wallRose.price;
      botPlayer.remainingShieldHp += wallRose.ShieldHp;
      botPlayer.purchasedWallRose = true;
      updated = true;
      emitSystemChat(game.gameCode, io, botPlayer, `purchased ${wallRose.name}`);
    }
    // Try Wall Sena
    else if (wallSena && !botPlayer.purchasedWallSena && cash >= wallSena.price) {
      botPlayer.cashRemaining -= wallSena.price;
      botPlayer.remainingShieldHp += wallSena.ShieldHp;
      botPlayer.purchasedWallSena = true;
      updated = true;
      emitSystemChat(game.gameCode, io, botPlayer, `purchased ${wallSena.name}`);
    }
  }

  // 2. Call Emergency Meeting if in danger (adjacent opponent weapon tile that has high damage)
  // Or if extremely low HP (< 300) and have cash for meeting (200).
  if (cash >= 300) { // Keep safety cash margin
    const dangerZoneHp = isExtreme ? 400 : 300;
    let inImmediateDanger = currentHp < dangerZoneHp;

    // Check if landing on any of the next 1-6 positions would be lethal/dangerous
    for (let step = 1; step <= 6; step++) {
      const checkPos = (botPlayer.position + step) % 32;
      const targetCard = await Card.findOne({ position: checkPos });
      if (targetCard && targetCard.category === "weapon") {
        // Find owner of this weapon card in current game
        const cardOwner = game.players.find(p => p.cards.some(c => c.cardId.toString() === targetCard._id.toString()));
        if (cardOwner && cardOwner.userId.toString() !== botPlayer.userId.toString()) {
          const expectedDamage = targetCard.weaponDamage * (1 + (cardOwner.scientist || 0) * 0.03);
          if (expectedDamage >= currentShield + currentHp) {
            inImmediateDanger = true;
          }
        }
      }
    }

    if (inImmediateDanger) {
      botPlayer.cashRemaining -= 200;
      for (const p of game.players) {
        p.position = Math.floor(Math.random() * 32);
      }
      updated = true;
      io.to(game.gameCode).emit("newPositions", { players: game.players });
      emitSystemChat(game.gameCode, io, botPlayer, `called Emergency Meeting to escape danger zone`);
    }
  }

  return updated;
}

function emitSystemChat(gameCode, io, botPlayer, content) {
  // Try to retrieve populated user name, fallback to custom format/id
  const name = botPlayer.userId?.username || "Bot Player";
  io.to(gameCode).emit("receiveMessage", {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sender: "System",
    content: `${name} ${content}`,
    type: "system",
    time: new Date().toLocaleTimeString(),
  });
}

/**
 * Handles the actual dice rolling and move animations for bots.
 * Simulates a delay before rolling, emits events, simulates moving delays, and commits turn.
 */
export async function runBotEngineCycle(gameCode, botUserId, io) {
  try {
    // Acquire game atomic lock
    const game = await Game.findOneAndUpdate(
      {
        gameCode,
        status: "active",
        currentTurn: botUserId,
        isProcessing: false
      },
      { $set: { isProcessing: true } },
      { new: true }
    ).populate("players.userId").populate("players.cards.cardId");

    if (!game) return;

    const botIndex = game.players.findIndex(p => p.userId._id.toString() === botUserId.toString());
    if (botIndex === -1) return;

    const botPlayer = game.players[botIndex];

    // 1. Run Pre-roll strategy (Wall buys / Emergency Call)
    const strategyUpdated = await performBotPreRollStrategy(game, botPlayer, io);
    if (strategyUpdated) {
      await game.save();
    }

    // 2. Schedule natural human delay before rolling dice
    const difficulty = botPlayer.botDifficulty || "medium2";
    let preRollDelay = 1500;
    if (difficulty === "medium1") preRollDelay = 2200;
    if (difficulty === "extreme") preRollDelay = 1000;

    setTimeout(async () => {
      try {
        // Roll dice
        const diceValue = Math.floor(Math.random() * 6) + 1;
        game.pendingDice = diceValue;
        await game.save();

        io.to(gameCode).emit("diceRolling", { rolledBy: botUserId });

        // Simulate rolling time
        setTimeout(async () => {
          io.to(gameCode).emit("diceResult", {
            diceValue,
            rolledBy: botUserId,
            players: game.players,
          });

          io.to(gameCode).emit("receiveMessage", {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            sender: "System",
            content: `${botPlayer.userId.username} rolled ${diceValue}`,
            type: "system",
            time: new Date().toLocaleTimeString(),
          });

          // Wait for client pawn moving animation
          // (matching diceValue * 320ms + 600ms buffer)
          const moveDuration = diceValue * 320 + 800;
          setTimeout(async () => {
            await executeTurn(gameCode, botUserId, botPlayer.userId.username, io, null);

            // Turn completed. Let's see if we paused for action decision (buyOrBid/Bid)
            const updatedGame = await Game.findOne({ gameCode });
            if (updatedGame && updatedGame.pendingAction) {
              // Bot needs to choose action (buy vs bid)
              await handleBotActionChoice(gameCode, io);
            } else {
              // Normal turn advanced or game finished. If another bot's turn, trigger recursively.
              await checkAndTriggerBotPlay(gameCode, io);
            }
          }, moveDuration);

        }, 800);

      } catch (err) {
        console.error("[botLogic] roll timeout error:", err);
        await Game.findOneAndUpdate({ gameCode }, { $set: { isProcessing: false, pendingDice: null } });
      }
    }, preRollDelay);

  } catch (err) {
    console.error("[botLogic] runBotEngineCycle error:", err);
    await Game.findOneAndUpdate({ gameCode }, { $set: { isProcessing: false, pendingDice: null } });
  }
}

/**
 * Triggered when a bot lands on a weapon and must decide whether to direct buy or initiate auction.
 */
export async function handleBotActionChoice(gameCode, io) {
  try {
    const game = await Game.findOne({ gameCode }).populate("players.userId").populate("players.cards.cardId");
    if (!game || !game.pendingAction?.playerId) return;

    // Check if the landing player is a bot
    const activeIndex = game.players.findIndex(p => p.userId._id.toString() === game.pendingAction.playerId.toString());
    if (activeIndex === -1) return;

    const botPlayer = game.players[activeIndex];
    if (!botPlayer.isBot) return; // Only process if landing player is a Bot

    const card = await Card.findById(game.pendingAction.cardId);
    if (!card) return;

    const difficulty = botPlayer.botDifficulty || "medium2";
    const minPrice = card.price;
    const currentCash = botPlayer.cashRemaining;

    // Decision metrics:
    // Medium1 will always buy if they have cash, or start auction if not.
    // Medium2 prefers to buy but keeps a 100 cash buffer.
    // Hard prefers to buy but keeps a 200 cash buffer unless it is a high damage (>150) weapon.
    // Extreme buys everything if possible.
    let decision = "bid";
    if (game.pendingAction.type === "buyOrBid" && currentCash >= minPrice) {
      if (difficulty === "medium1" || difficulty === "extreme") {
        decision = "buy";
      } else if (difficulty === "medium2") {
        if (currentCash - minPrice >= 100) decision = "buy";
      } else if (difficulty === "hard") {
        if (currentCash - minPrice >= 200 || card.weaponDamage >= 150) decision = "buy";
      }
    }

    const name = botPlayer.userId.username;

    // Human delay before deciding to buy or auction (1 - 2.5s)
    let decisionDelay = Math.random() * 1500 + 1000;

    setTimeout(async () => {
      try {
        const checkGameObj = await Game.findOne({ gameCode });
        if (!checkGameObj || !checkGameObj.pendingAction) return;

        if (decision === "buy") {
          // BUY direct
          botPlayer.cashRemaining -= minPrice;
          botPlayer.cards.push({ cardId: card._id });

          const nextIndex = getNextActiveIndex(checkGameObj, activeIndex);
          checkGameObj.turnNo += 1;

          // Register time bomb if card is time bomb
          if (card.name.toLowerCase().replace(/\s+/g, "-") === "time-bomb") {
            const activeCount = checkGameObj.players.filter(p => p.isActive).length;
            if (!checkGameObj.timebombs) checkGameObj.timebombs = [];
            checkGameObj.timebombs.push({
              cardId: card._id,
              ownerId: botPlayer.userId._id,
              position: card.position,
              purchasedAtTurn: checkGameObj.turnNo,
              explodeAtTurn: checkGameObj.turnNo + activeCount,
              cycleLength: activeCount,
            });
          }

          io.to(gameCode).emit("receiveMessage", {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            sender: "System",
            content: `${name} purchased ${card.name}`,
            type: "system",
            time: new Date().toLocaleTimeString(),
          });

          checkGameObj.currentTurn = checkGameObj.players[nextIndex].userId;
          checkGameObj.isProcessing = false;
          checkGameObj.pendingDice = null;
          checkGameObj.pendingAction = null;
          checkGameObj.turnDeadline = new Date(Date.now() + 32_000);
          checkGameObj.actionDeadline = null;

          // Save and broadcast
          await checkGameObj.save();
          const populatedGame = await Game.findOne({ gameCode }).populate("players.userId").populate("players.cards.cardId");
          io.to(gameCode).emit("turnResult", {
            players: populatedGame.players,
            currentTurn: populatedGame.currentTurn._id || populatedGame.currentTurn,
            turnNo: populatedGame.turnNo,
            mysteryCase: null,
            cardLanded: { name: card.name, category: card.category },
          });

          // Trigger next play
          await checkAndTriggerBotPlay(gameCode, io);

        } else {
          // ACTIVATE AUCTION (Bid)
          const BID_DURATION = 20;
          checkGameObj.pendingAction = {
            cardId: card._id,
            playerId: botPlayer.userId._id,
            type: "bidding",
            bids: [],
            bidDeadline: new Date(Date.now() + BID_DURATION * 1000),
          };

          await checkGameObj.save();

          io.to(gameCode).emit("bidStarted", {
            card: { id: card._id, name: card.name, price: card.price, weaponDamage: card.weaponDamage },
            minBid: 1,
            duration: BID_DURATION,
          });

          io.to(gameCode).emit("receiveMessage", {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            sender: "System",
            content: `Auction started for ${card.name}! ${BID_DURATION}s to bid.`,
            type: "system",
            time: new Date().toLocaleTimeString(),
          });

          // Schedule bot bid responses during the 20s auction window
          handleBotBidding(gameCode, card._id, io);

          // Resolve auction after deadline
          setTimeout(async () => {
            await resolveBid(gameCode, card, io);
            // After resolveBid advances turn, recursively check next player
            await checkAndTriggerBotPlay(gameCode, io);
          }, BID_DURATION * 1000 + 500);
        }

      } catch (err) {
        console.error("[botLogic] decision submit error:", err);
      }
    }, decisionDelay);

  } catch (err) {
    console.error("[botLogic] handleBotActionChoice error:", err);
  }
}

/**
 * Runs during an active bidding auction to schedule realistic bids from any active bots.
 */
export async function handleBotBidding(gameCode, cardId, io) {
  try {
    const game = await Game.findOne({ gameCode }).populate("players.userId");
    if (!game || !game.pendingAction || game.pendingAction.type !== "bidding") return;

    const card = await Card.findById(cardId);
    if (!card) return;

    // Filter active bots in the game session
    const botPlayers = game.players.filter(p => p.isBot && p.isActive);

    botPlayers.forEach((botPlayer) => {
      const difficulty = botPlayer.botDifficulty || "medium2";
      const totalCash = botPlayer.cashRemaining;

      // Determine the bot's maximum bid ceiling for this card based on difficulty:
      // Medium1: up to 30% of their cash or 60% of card original price
      // Medium2: up to 45% of their cash or 80% of card original price
      // Hard: up to 75% of cash or 1.1x card original price
      // Extreme: up to 90% of cash or 1.5x card original price
      let maxBid = 0;
      if (difficulty === "medium1") maxBid = Math.min(totalCash * 0.3, card.price * 0.6);
      else if (difficulty === "medium2") maxBid = Math.min(totalCash * 0.45, card.price * 0.8);
      else if (difficulty === "hard") maxBid = Math.min(totalCash * 0.75, card.price * 1.1);
      else if (difficulty === "extreme") maxBid = Math.min(totalCash * 0.9, card.price * 1.5);

      maxBid = Math.floor(maxBid);
      if (maxBid < 1) return;

      // Choose a random actual bid for this bot up to their maxBid (must be >= 1)
      const bidAmount = Math.max(1, Math.floor(Math.random() * (maxBid - 10)) + 10);
      if (bidAmount > totalCash) return;

      // Humans don't bid instantly! Delay the bid by a random time between 2 and 15 seconds.
      const bidDelay = Math.random() * 13000 + 2000;

      setTimeout(async () => {
        try {
          const freshGameObj = await Game.findOne({ gameCode });
          if (!freshGameObj || !freshGameObj.pendingAction || freshGameObj.pendingAction.type !== "bidding") return;

          // Check if auction is still active
          if (new Date() > new Date(freshGameObj.pendingAction.bidDeadline)) return;

          // Validate bot's status and cash again
          const freshBotPlayer = freshGameObj.players.find(p => p.userId.toString() === botPlayer.userId._id.toString());
          if (!freshBotPlayer || !freshBotPlayer.isActive || freshBotPlayer.cashRemaining < bidAmount) return;

          // Remove any previous bid from this bot
          const existingBidIndex = freshGameObj.pendingAction.bids.findIndex(
            b => b.userId.toString() === botPlayer.userId._id.toString()
          );
          if (existingBidIndex !== -1) {
            freshGameObj.pendingAction.bids.splice(existingBidIndex, 1);
          }

          // Submit the bot's bid
          freshGameObj.pendingAction.bids.push({ userId: botPlayer.userId._id, amount: bidAmount });
          await freshGameObj.save();

          console.log(`[botLogic] Bot ${botPlayer.userId.username} submitted bid ₹${bidAmount} on ${card.name}`);

        } catch (err) {
          console.error("[botLogic] Delayed bot bid submission failed:", err);
        }
      }, bidDelay);

    });

  } catch (err) {
    console.error("[botLogic] handleBotBidding error:", err);
  }
}

// Helper to determine next active player index
function getNextActiveIndex(game, currentIndex) {
  const total = game.players.length;
  let nextIndex = (currentIndex + 1) % total;
  let loops = 0;
  while (!game.players[nextIndex].isActive) {
    nextIndex = (nextIndex + 1) % total;
    if (++loops >= total) return -1;
  }
  return nextIndex;
}
