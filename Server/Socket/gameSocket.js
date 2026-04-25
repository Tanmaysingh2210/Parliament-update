import Game from "../models/GameSession.js";
import Card from "../models/cards.js";
import User from "../models/user.js";


function getMysteryCard() {
  const MysteryBox = [
    { amount: +150, statement: "Foreign investment deal approved" },
    { amount: -120, statement: "Cyber attack repair cost" },
    { amount: +100, statement: "Tax from citizens" },
    { amount: -90, statement: "Emergency defence spending" },
    { amount: +110, statement: "Black Money Raid" },
    { amount: -100, statement: "Defence Drone deployed" },
    { amount: +130, statement: "Received emergency funding from supporters" },
    { amount: -100, statement: "Corruption investigation fine" },
    { amount: +101, statement: "Public rally success donation" },
    { amount: +50, statement: "Printed War money" },
    { amount: +100, statement: "Bribe attempt works" },
    { amount: -100, statement: "Bribe attempt caught" },
    { amount: +100, statement: "Successful strike, looted enemy resources" },
  ];
  return MysteryBox[Math.floor(Math.random() * MysteryBox.length)];
}

const getRandomPosition = () => {
  return Math.floor(Math.random() * 32);
}

async function startTurnTimer(game, gameCode) {
  game.turnDeadline = new Date(Date.now() + 32_000);
  game.actionDeadline = null;
  await game.save();
}

function applyDamage(player, dmg) {
  dmg = Math.floor(dmg);
  if (player.remainingShieldHp >= dmg) {
    player.remainingShieldHp -= dmg;
  } else {
    const overflow = dmg - player.remainingShieldHp;
    player.remainingShieldHp = 0;
    player.remainingParliamentHp -= overflow;
  }
  if (player.remainingParliamentHp < 0) player.remainingParliamentHp = 0;
}

function applyPublicDamage(player, dmg) {
  dmg = Math.floor(dmg);
  player.remainingShieldHp -= dmg;
  player.remainingParliamentHp -= dmg;
  if (player.remainingShieldHp < 0) player.remainingShieldHp = 0;
  if (player.remainingParliamentHp < 0) player.remainingParliamentHp = 0;
}

function findCardOwner(game, cardId) {
  for (const p of game.players) {
    const owns = p.cards.some(c => c.cardId.toString() === cardId.toString());
    if (owns) return p;
  }
  return null;
}

function getNextActiveIndex(game, currentIndex) {
  const total = game.players.length;
  let nextIndex = (currentIndex + 1) % total;
  let loops = 0;

  while (!game.players[nextIndex].isActive) {
    nextIndex = (nextIndex + 1) % total;
    loops++;
    // If looped all the way around, no active players left
    if (loops >= total) return -1;
  }
  return nextIndex;
}

async function checkTimebombExplosions(game, io, gameCode) {
  if (!game.timebombs || game.timebombs.length === 0) return;

  const BLAST_RADIUS = 3;
  const TOTAL_TILES = 32;

  for (const bomb of game.timebombs) {
    if (game.turnNo < bomb.explodeAtTurn) continue;

    const blastPositions = new Set();
    for (let offset = -BLAST_RADIUS; offset <= BLAST_RADIUS; offset++) {
      if (offset == 2) continue; //safe zone here
      blastPositions.add((bomb.position + offset + TOTAL_TILES) % TOTAL_TILES);
    }

    const casualties = [];
    for (const p of game.players) {
      if (!p.isActive) continue;
      if (blastPositions.has(p.position)) {
        const dmg = 90;
        applyDamage(p, dmg);
        if (p.remainingParliamentHp <= 0) {
          p.remainingParliamentHp = 0;
          p.isActive = false;
        }
        casualties.push({
          userId: p.userId._id || p.userId,
          damage: dmg,
        });
      }
    }

    // Schedule NEXT explosion using the fixed cycleLength
    bomb.explodeAtTurn = bomb.explodeAtTurn + bomb.cycleLength;

    io.to(gameCode).emit("timebombExploded", {
      position: bomb.position,
      casualties,
      nextBlastInTurns: bomb.cycleLength,
    });

    for (const casualty of casualties) {
      const targetUserId = (casualty.userId._id || casualty.userId).toString();
      const hitPlayer = game.players.find(
        p => (p.userId._id || p.userId).toString() === targetUserId
      );
      const attackerUser = await User.findById(bomb.ownerId)
      const victimIds = casualties.map(c => c.userId);

      const victims = await User.find({ _id: { $in: victimIds } })
      const victimNames = victims.map(v => v.username).join(", ")
      io.to(gameCode).emit("damageTaken", {
        amount: casualty.damage,
        cardName: "Time Bomb",
        shieldAbsorbed: hitPlayer ? hitPlayer.remainingShieldHp > 0 : false,
        attacker: attackerUser?.username || "Unknown",
        victim: victimNames || "Players",
      });
    }

    io.to(gameCode).emit("receiveMessage", {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: "System",
      content: `💣 Time Bomb EXPLODED! ${casualties.length} player(s) hit. Next blast in ${bomb.cycleLength} turns.`,
      type: "system",
      time: new Date().toLocaleTimeString(),
    });
  }
  // Bombs are NEVER removed — they keep cycling every N turns
}


export async function executeTurn(gameCode, userId, username, io, socket = null) {
  try {
    const game = await Game.findOne({ gameCode });
    if (!game || game.status !== "active") return;
    if (game.currentTurn.toString() !== userId.toString()) return;
    if (!game.isProcessing) return;

    const dice = game.pendingDice;
    if (!dice) return;

    const currentIndex = game.players.findIndex(
      p => p.userId.toString() === userId.toString()
    );
    if (currentIndex === -1) return;

    const player = game.players[currentIndex];
    const oldPosition = player.position;
    const newPosition = (player.position + dice) % 32;
    if (newPosition < oldPosition) player.cashRemaining += 200;
    player.position = newPosition;

    const card = await Card.findOne({ position: player.position });
    if (!card) return;

    let mysteryCase = null;
    let needsAction = false;
    let actionPayload = null;

    switch (card.category) {
      case "start": break;

      case "mystery": {
        mysteryCase = getMysteryCard();
        player.cashRemaining += mysteryCase.amount;
        break;
      }

      case "public": {
        applyPublicDamage(player, card.weaponDamage);
        const victimUser = await User.findById(player.userId);
        io.to(gameCode).emit("damageTaken", {
          amount: Math.floor(card.weaponDamage),
          cardName: card.name,
          shieldAbsorbed: false,
          attacker: "System",
          victim: victimUser?.username || "Unknown",
        });
        break;
      }

      case "weapon": {
        if (!card.isPurchasable) {
          applyDamage(player, card.weaponDamage);
          io.to(gameCode).emit("damageTaken", {
            amount: Math.floor(card.weaponDamage),
            cardName: card.name,
            shieldAbsorbed: player.remainingShieldHp > 0,
            attacker: "System",
            victim: player.userId?.username || "Unknown",
          });
          break;
        }

        const owner = findCardOwner(game, card._id);

        if (!owner) {
          // ← KEY: only show buy/bid modal if socket exists (player connected)
          if (socket) {
            needsAction = true;
            if (player.cashRemaining < card.price) {
              actionPayload = { type: "Bid", card: { id: card._id, name: card.name, price: card.price, weaponDamage: card.weaponDamage } };
            } else {
              actionPayload = { type: "buyOrBid", card: { id: card._id, name: card.name, price: card.price, weaponDamage: card.weaponDamage } };
            }
          }
          // If socket is null (disconnected/watchdog) → skip buy/bid, card stays unowned, turn advances
        } else if (owner.userId.toString() !== userId.toString()) {
          if (newPosition !== 14) {
            const scientistBonus = 1 + (owner.scientist * 0.03);
            let dmg = card.weaponDamage * scientistBonus;
            if (player.agent) dmg /= 2;
            applyDamage(player, dmg);
            const attackerUser = await User.findById(owner.userId);
            const victimUser = await User.findById(player.userId);
            io.to(gameCode).emit("damageTaken", {
              amount: Math.floor(dmg),
              cardName: card.name,
              attacker: attackerUser?.username || "Unknown",
              victim: victimUser?.username || "Unknown",
              shieldAbsorbed: player.remainingShieldHp > 0,
            });
          }
        }
        break;
      }

      case "terror": {
        player.cashRemaining -= card.price;
        socket?.emit("system", { message: "you paid ₹100 to terrorists", type: "error" });
        break;
      }
      case "safe": { socket?.emit("system", { message: "you are safe", type: "success" }); break; }
      case "agent": { player.agent = true; socket?.emit("system", { message: "Agent card activated", type: "success" }); break; }
      case "scientist": { player.scientist += 1; socket?.emit("system", { message: `+1 scientist. Total: ${player.scientist}`, type: "success" }); break; }
      case "engineer": { player.remainingParliamentHp = Math.min(1500, player.remainingParliamentHp + 100); socket?.emit("system", { message: "Engineer recoveres lost HP", type: "success" }); break; }
      default: break;
    }

    if (player.remainingParliamentHp <= 0) { player.remainingParliamentHp = 0; player.isActive = false; io.to(gameCode).emit("system", { message: `${username} died`, type: "error" }) }
    if (card.category !== "agent") player.agent = false;

    const nextIndex = getNextActiveIndex(game, currentIndex);
    const activePlayers = game.players.filter(p => p.isActive);

    if (activePlayers.length <= 1) {
      game.status = "finished";
      game.winner = activePlayers[0]?.userId || userId;
      game.isProcessing = false;
      game.pendingDice = null;
      game.turnDeadline = null;
      await game.save();
      await game.populate("players.userId");
      await game.populate("players.cards.cardId");
      io.to(gameCode).emit("gameOver", { winner: game.winner, players: game.players });
      return;
    }

    // Pause for buy/bid — only if player is connected
    if (needsAction) {
      game.pendingAction = { type: actionPayload.type, cardId: card._id, playerId: player.userId };

      if (actionPayload.type === "Bid") {
        const BID_DURATION = 20;
        game.pendingAction.type = "bidding";
        game.pendingAction.bids = [];
        game.pendingAction.bidDeadline = new Date(Date.now() + BID_DURATION * 1000);
        game.turnDeadline = null;
        game.actionDeadline = new Date(Date.now() + BID_DURATION * 1000 + 2000);
        await game.save();
        await game.populate("players.userId");
        await game.populate("players.cards.cardId");
        io.to(gameCode).emit("boardUpdate", { players: game.players });
        io.to(gameCode).emit("bidStarted", { card: actionPayload.card, minBid: 1, duration: BID_DURATION });
        setTimeout(async () => { await resolveBid(gameCode, card, io); }, BID_DURATION * 1000 + 500);
        return;
      }

      game.turnDeadline = null;
      game.actionDeadline = new Date(Date.now() + 17_000);
      await game.save();
      await game.populate("players.userId");
      await game.populate("players.cards.cardId");
      io.to(gameCode).emit("boardUpdate", { players: game.players });
      socket.emit("actionRequired", { type: actionPayload.type, card: actionPayload.card, playerCash: player.cashRemaining });
      return;
    }

    game.turnNo += 1;
    await checkTimebombExplosions(game, io, gameCode);

    const activeAfterBombs = game.players.filter(p => p.isActive);
    if (activeAfterBombs.length <= 1) {
      game.status = "finished";
      game.winner = activeAfterBombs[0]?.userId || userId;
      game.isProcessing = false;
      game.pendingDice = null;
      game.pendingAction = null;
      game.turnDeadline = null;
      await game.save();
      await game.populate("players.userId");
      await game.populate("players.cards.cardId");
      io.to(gameCode).emit("gameOver", { winner: game.winner, players: game.players });
      return;
    }

    game.currentTurn = game.players[nextIndex].userId;
    game.isProcessing = false;
    game.pendingDice = null;
    game.pendingAction = null;
    game.turnDeadline = new Date(Date.now() + 32_000);
    game.actionDeadline = null;

    await game.save();
    await game.populate("players.userId");
    await game.populate("players.cards.cardId");

    io.to(gameCode).emit("turnResult", {
      players: game.players,
      currentTurn: game.players[nextIndex].userId._id,
      turnNo: game.turnNo,
      mysteryCase, // still sent — connected players see mystery, disconnected player misses it (expected)
      cardLanded: { name: card.name, category: card.category },
    });

    io.to(gameCode).emit("receiveMessage", {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: "System",
      content: `${player.userId?.username || "Player"} landed on ${card.name}`,
      type: "system",
      time: new Date().toLocaleTimeString(),
    });

  } catch (err) {
    console.error("executeTurn error:", err);
    await Game.findOneAndUpdate({ gameCode }, { $set: { isProcessing: false, pendingDice: null } });
  }
}

export default function gameSocket(io, socket) {

  // userId is attached by middleware — never read from session here
  const userId = socket.userId;
  const username = socket.username;

  if (!userId) {
    socket.disconnect(true);
    return;
  }

  socket.on("joinLobby", async ({ gameCode }) => {
    try {
      const game = await Game.findOne({ gameCode }).populate("players.userId");
      await game.populate("players.cards.cardId");

      if (!game) return socket.emit("lobbyError", { message: "Game not found" });

      socket.gameCode = gameCode;
      socket.join(gameCode);
      socket.join(userId.toString());

      socket.emit("identity", { myUserId: socket.userId });

      // Re-sync active game state for reconnecting players
      if (game.status === "active") {
        // Re-send current turn state
        socket.emit("turnResult", {
          players: game.players,
          currentTurn: game.currentTurn,
          turnNo: game.turnNo,
          mysteryCase: null,
        });

        if (game.pendingAction?.type === "bidding") {
          const timeLeft = Math.max(0,
            Math.floor((new Date(game.pendingAction.bidDeadline) - Date.now()) / 1000)
          );
          if (timeLeft > 0) {
            const card = await Card.findById(game.pendingAction.cardId);
            socket.emit("bidStarted", {
              card: { id: card._id, name: card.name, price: card.price },
              minBid: 1,
              duration: timeLeft, // remaining time, not full 20s
            });
          }
        }
      }

      io.to(gameCode).emit("system", { message: `${username} connected`, type: "success" });

      if (game.status === "waiting" && game.players.length >= game.maxPlayer) {
        game.status = "active";
        game.currentTurn = game.players[0].userId._id;
        game.turnDeadline = new Date(Date.now() + 32_000);
        await game.save();
      }

      io.to(gameCode).emit("lobbyUpdate", {
        players: game.players,
        maxPlayer: game.maxPlayer,
        status: game.status,
        game: game,
      });

      if (game.status === "active") {
        io.to(gameCode).emit("gameStart", {
          gameId: game._id,
          game,
        });
      }

    } catch (err) {
      console.error("joinLobby error:", err);
      socket.emit("lobbyError", { message: "Unable to join lobby" });
    }
  });



  socket.on("disconnect", async () => {

    const gameCode = socket.gameCode;

    console.log(`${username} disconnected`);

    io.to(gameCode).emit("receiveMessage", {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: "System",
      content: `${username} disconnected`,
      type: "system",
      time: new Date().toLocaleTimeString(),
    });

    io.to(gameCode).emit("error", {
      message: `${username} disconnected`,
    });

    try {
      const game = await Game.findOne({
        status: "active",
        "players.userId": userId,
      });
      if (!game) return;

      // Release processing lock if they crashed mid-roll
      if (game.isProcessing && game.currentTurn.toString() === userId.toString()) {
        game.isProcessing = false;
        game.pendingDice = null;
      }

      // ← KEY FIX: if it's their turn, set a short deadline
      // so the watchdog picks it up in ~5s instead of waiting 32s
      if (game.currentTurn.toString() === userId.toString()) {
        game.turnDeadline = new Date(Date.now() + 6_000); // 6s — watchdog fires next poll
      }

      await game.save();
    } catch (err) {
      console.error("disconnect cleanup error:", err);
    }
  });

  socket.on("requestIdentity", () => {
    socket.emit("identity", { myUserId: socket.userId });
  });


  socket.on("rollDice", async ({ gameCode, skippedChance }) => {

    try {
      // ── Atomic lock: find game where it's this player's turn AND not already processing
      const game = await Game.findOneAndUpdate(
        {
          gameCode,
          status: "active",
          currentTurn: userId,
          isProcessing: false,   // ← only wins if not locked
        },
        { $set: { isProcessing: true } },
        { new: true }
      );

      if (!game) return;

      io.to(gameCode).emit("diceRolling", { rolledBy: userId });

      const currentIndex = game.players.findIndex(
        p => p.userId.toString() === userId.toString()
      );
      const player = game.players[currentIndex];

      if (skippedChance) {
        player.skippedChances = (player.skippedChances || 0) + 1;

        io.to(gameCode).emit("receiveMessage", {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, sender: "System",
          content: `⏱️ ${username} skipped their turn (${player.skippedChances}/3)`,
          type: "system", time: new Date().toLocaleTimeString(),
        });

        if (player.skippedChances >= 4) {
          player.isActive = false;
          game.isProcessing = false;
          game.pendingDice = null;

          const activePlayers = game.players.filter(p => p.isActive);

          io.to(gameCode).emit("receiveMessage", {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, sender: "System",
            content: `🚫 ${username} was eliminated for skipping 3 turns!`,
            type: "system", time: new Date().toLocaleTimeString(),
          });

          if (activePlayers.length <= 1) {
            game.status = "finished";
            game.winner = activePlayers[0]?.userId || userId;
            await game.save();
            await game.populate("players.userId");
            await game.populate("players.cards.cardId");
            io.to(gameCode).emit("gameOver", { winner: game.winner, players: game.players });
            return;
          }
          const nextIndex = getNextActiveIndex(game, currentIndex);
          game.currentTurn = game.players[nextIndex].userId;
          game.turnNo += 1;
          game.pendingAction = null;
          await game.save();
          await game.populate("players.userId");
          await game.populate("players.cards.cardId");

          io.to(gameCode).emit("turnResult", {
            players: game.players,
            currentTurn: game.players[nextIndex].userId._id,
            turnNo: game.turnNo,
            mysteryCase: null,
          });

          //to stop dice rolling animation
          io.to(gameCode).emit("diceResult", {
            diceValue: 1,          
            rolledBy: null,        
            players: game.players,
          });

          await startTurnTimer(game, gameCode);

          return; // ← skip dice roll entirely
        }

        await game.save();
      }


      const diceValue = Math.floor(Math.random() * 6) + 1;

      // Store on DB so playTurn uses server's value, not client's
      game.pendingDice = diceValue;
      await game.save();

      await game.populate("players.userId");
      await game.populate("players.cards.cardId");

      // Tell everyone to animate
      io.to(gameCode).emit("diceResult", {
        diceValue,
        rolledBy: userId,
        players: game.players,
      });

      // System message in chat
      io.to(gameCode).emit("receiveMessage", {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sender: "System",
        content: `${username} rolled ${diceValue}`,
        type: "system",
        time: new Date().toLocaleTimeString(),
      });

    } catch (err) {
      console.error("rollDice error:", err);
    }

  });

  socket.on("playTurn", async ({ gameCode }) => {
    /*
    try {
      const game = await Game.findOne({ gameCode })

      if (!game || game.status !== "active") return;

      // Must be this player's turn
      if (game.currentTurn.toString() !== userId.toString()) return;

      // Must have gone through rollDice (isProcessing flag proves it)
      if (!game.isProcessing) return;

      const dice = game.pendingDice;
      if (!dice) return;

      const currentIndex = game.players.findIndex(
        p => p.userId.toString() === userId.toString()
      );
      if (currentIndex === -1) return;

      const player = game.players[currentIndex];
      const oldPosition = player.position;
      const newPosition = (player.position + dice) % 32;

      if (newPosition < oldPosition) player.cashRemaining += 200;

      player.position = (player.position + dice) % 32;

      const card = await Card.findOne({ position: player.position });
      if (!card) {
        console.error("No card found at position:", player.position);
        return;
      }

      let mysteryCase = null;
      let needsAction = false;
      let actionPayload = null;



      switch (card.category) {

        case "start": {
          // player.cashRemaining += 200;
          break;
        }

        case "mystery": {
          mysteryCase = getMysteryCard();
          player.cashRemaining += mysteryCase.amount;
          // Clamp cash — can't go below 0
          // if (player.cashRemaining < 0) player.cashRemaining = 0;
          break;
        }

        case "public": {
          // Public tiles hit everyone, no shield consideration — raw parliament damage
          applyPublicDamage(player, card.weaponDamage);

          const victimUser = await User.findById(player.userId);
          io.to(gameCode).emit("damageTaken", {
            amount: Math.floor(card.weaponDamage),
            cardName: card.name,
            shieldAbsorbed: false,
            attacker: "System",
            victim: victimUser?.username || "Unknown",
          });
          break;
        }

        case "weapon": {

          if (!card.isPurchasable) {
            // Non-purchasable weapon — hits the player directly
            applyDamage(player, card.weaponDamage);

            console.log('time to hit weapon damage');
            io.to(gameCode).emit("damageTaken", {
              amount: Math.floor(card.weaponDamage),
              cardName: card.name,
              shieldAbsorbed: player.remainingShieldHp > 0,
              attacker: "System",
              victim: player.userId.username
            });

            break;
          }

          const owner = findCardOwner(game, card._id);

          if (!owner) {
            needsAction = true;
            if (player.cashRemaining < card.price) {
              actionPayload = {
                type: "Bid",
                card: {
                  id: card._id,
                  name: card.name,
                  price: card.price,
                  weaponDamage: card.weaponDamage,
                },
              };
            } else {
              actionPayload = {
                type: "buyOrBid",
                card: {
                  id: card._id,
                  name: card.name,
                  price: card.price,
                  weaponDamage: card.weaponDamage,
                },
              };
            }

          } else if (owner.userId.toString() === userId.toString()) {
            // Player landed on their own card — no effect
          }
          else {
            if (newPosition != 14) {
              const scientistBonus = 1 + (owner.scientist * 0.03);
              let dmg = card.weaponDamage * scientistBonus;

              if (player.agent) dmg = dmg / 2;

              applyDamage(player, dmg);

              const attackerUser = await User.findById(owner.userId);
              const victimUser = await User.findById(player.userId)
              io.to(gameCode).emit("damageTaken", {
                amount: Math.floor(dmg),
                cardName: card.name,
                attacker: attackerUser?.username || "Unknown",
                victim: victimUser?.username || "Unknown",
                shieldAbsorbed: player.remainingShieldHp > 0,
              })
            }
          }
          break;
        }

        case "terror": {
          player.cashRemaining = player.cashRemaining - card.price;
          socket.emit("system", {
            message: "you paid ₹100 to terrorrists",
            type: "error"
          })
          break;
        }

        case "safe": {
          socket.emit("system", {
            message: "you are safe",
            type: "success"
          })
          break;
        }

        case "agent": {
          // Agent buff activates — stays on until next non-agent tile
          player.agent = true;
          socket.emit("system", {
            message: `Agent card activated`,
            type: "success"
          })
          break;
        }

        case "scientist": {
          player.scientist += 1;
          socket.emit("system", {
            message: `you got +1 scientist card. Total: ${player.scientist}`,
            type: "success"
          })
          break;
        }

        case "engineer": {
          player.remainingParliamentHp = Math.min(1500, player.remainingParliamentHp + 100);
          socket.emit("system", {
            message: `you got engineer card. It recovers lost HP`,
            type: "success"
          })
          break;
        }

        default: {
          console.error("Unknown card category:", card.category);
          break;
        }
      }

      // ── If player HP dropped to 0, eliminate them
      if (player.remainingParliamentHp <= 0) {
        player.remainingParliamentHp = 0;
        player.isActive = false;
      }

      // Agent resets after every tile EXCEPT the agent tile itself
      if (card.category !== "agent") {
        player.agent = false;
      }
      // ── skippedChances handling (if you want to skip turns)
      // if (player.skippedChances >= 4) {
      //   player.isActive = false;
      // }

      // ── Find next active player
      const nextIndex = getNextActiveIndex(game, currentIndex);

      // ── Check win condition (only one active player left)
      const activePlayers = game.players.filter(p => p.isActive);
      if (activePlayers.length <= 1) {
        game.status = "finished";
        game.winner = activePlayers[0]?.userId || userId;
        game.isProcessing = false;
        game.pendingDice = null;
        await game.save();
        await game.populate("players.userId");
        await game.populate("players.cards.cardId");

        io.to(gameCode).emit("gameOver", {
          winner: game.winner,
          players: game.players,
        });
        return;
      }


      // ── If action required (buy/bid) — pause turn, don't advance yet
      if (needsAction) {
        game.pendingAction = {
          type: actionPayload.type,
          cardId: card._id,
          playerId: player.userId,
        };

        await game.save();
        await game.populate("players.userId");
        await game.populate("players.cards.cardId");

        io.to(gameCode).emit("boardUpdate", { players: game.players });

        if (actionPayload.type === "Bid") {
          const BID_DURATION = 20;

          game.pendingAction.type = "bidding";
          game.pendingAction.bids = [];
          game.pendingAction.bidDeadline = new Date(Date.now() + BID_DURATION * 1000);
          await game.save();

          io.to(gameCode).emit("bidStarted", {
            card: actionPayload.card,
            minBid: 1,
            duration: BID_DURATION,
          });

          io.to(gameCode).emit("receiveMessage", {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, sender: "System",
            content: `${username} can't afford ${actionPayload.card.name}! Auto-auction started.`,
            type: "system", time: new Date().toLocaleTimeString(),
          });

          setTimeout(async () => {
            await resolveBid(gameCode, card, io);
          }, BID_DURATION * 1000 + 500);

          return;
        }

        game.turnDeadline = null;
        game.actionDeadline = new Date(Date.now() + 17_000);
        await game.save();

        socket.emit("actionRequired", {
          type: actionPayload.type,
          card: actionPayload.card,
          playerCash: player.cashRemaining,
        });
        return;
      }


      game.turnNo += 1;

      await checkTimebombExplosions(game, io, gameCode);

      // ── Re-check win condition after bomb damage
      const activeAfterBombs = game.players.filter(p => p.isActive);
      if (activeAfterBombs.length <= 1) {
        game.status = "finished";
        game.winner = activeAfterBombs[0]?.userId || userId;
        game.isProcessing = false;
        game.pendingDice = null;
        game.pendingAction = null;
        await game.save();
        await game.populate("players.userId");
        await game.populate("players.cards.cardId");
        io.to(gameCode).emit("gameOver", { winner: game.winner, players: game.players });
        return;
      }

      // ── Normal turn end — advance to next player
      game.currentTurn = game.players[nextIndex].userId;
      // game.turnNo += 1;
      game.isProcessing = false;
      game.pendingDice = null;
      game.pendingAction = null;

      game.turnDeadline = new Date(Date.now() + 32_000);
      game.actionDeadline = null;

      await game.save();
      await game.populate("players.userId");
      await game.populate("players.cards.cardId");

      io.to(gameCode).emit("turnResult", {
        players: game.players,
        currentTurn: game.players[nextIndex].userId._id,
        turnNo: game.turnNo,
        mysteryCase,
        cardLanded: {
          name: card.name,
          category: card.category,
        },
      });

      io.to(gameCode).emit("receiveMessage", {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sender: "System",
        content: `${username} landed on ${card.name}`,
        type: "system",
        time: new Date().toLocaleTimeString(),
      });

    } catch (err) {
      console.error("playTurn error:", err);

      // Safety unlock — if something crashes, release the lock
      await Game.findOneAndUpdate(
        { gameCode },
        { $set: { isProcessing: false, pendingDice: null } }
      );
    }
      */

    executeTurn(gameCode, userId, username, io, socket);

  });


  socket.on("quitGame", async ({ gameCode }) => {
    try {
      const game = await Game.findOne({ gameCode });
      if (!game || game.status !== "active") return;

      const currentIndex = game.players.findIndex(
        p => p.userId.toString() === userId.toString()
      );
      if (currentIndex === -1) return;

      const player = game.players[currentIndex];
      player.isActive = false;

      io.to(gameCode).emit("receiveMessage", {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sender: "System",
        content: `🚪 ${username} left the game`,
        type: "system",
        time: new Date().toLocaleTimeString(),
      });

      const activePlayers = game.players.filter(p => p.isActive);

      // Win condition
      if (activePlayers.length <= 1) {
        game.status = "finished";
        game.winner = activePlayers[0]?.userId || null;
        game.isProcessing = false;
        game.pendingDice = null;
        game.pendingAction = null;
        await game.save();
        await game.populate("players.userId");
        await game.populate("players.cards.cardId");
        io.to(gameCode).emit("gameOver", { winner: game.winner, players: game.players });
        return;
      }

      // If it was their turn, advance to next player
      if (game.currentTurn.toString() === userId.toString()) {
        const nextIndex = getNextActiveIndex(game, currentIndex);
        game.currentTurn = game.players[nextIndex].userId;
        game.turnNo += 1;
        game.isProcessing = false;
        game.pendingDice = null;
        game.pendingAction = null;

        await game.save();
        await game.populate("players.userId");
        await game.populate("players.cards.cardId");

        io.to(gameCode).emit("turnResult", {
          players: game.players,
          currentTurn: game.players[nextIndex].userId._id,
          turnNo: game.turnNo,
          mysteryCase: null,
        });
      } else {
        await game.save();
        await game.populate("players.userId");
        await game.populate("players.cards.cardId");
        io.to(gameCode).emit("newPositions", { players: game.players });
      }

    } catch (err) {
      console.error("quitGame error:", err);
    }
  });

  socket.on("playerAction", async ({ gameCode, action }) => {
    try {
      const game = await Game.findOne({ gameCode });
      if (!game || game.status !== "active") return;
      if (!game.pendingAction) return;
      if (game.pendingAction.playerId.toString() !== userId.toString()) return;

      const currentIndex = game.players.findIndex(
        p => p.userId.toString() === userId.toString()
      );
      const player = game.players[currentIndex];
      const card = await Card.findById(game.pendingAction.cardId);

      if (action === "buy") {
        if (player.cashRemaining < card.price) {
          return socket.emit("actionError", { message: "Not enough cash" });
        }
        player.cashRemaining -= card.price;
        player.cards.push({ cardId: card._id });



        // ✅ Increment turnNo FIRST before registering bomb
        const nextIndex = getNextActiveIndex(game, currentIndex);
        game.turnNo += 1;
        await checkTimebombExplosions(game, io, gameCode);

        // ✅ If bought card is Time Bomb — register it
        if (card.name.toLowerCase().replace(/\s+/g, "-") === "time-bomb") {
          const activeCount = game.players.filter(p => p.isActive).length;
          if (!game.timebombs) game.timebombs = [];
          game.timebombs.push({
            cardId: card._id,
            ownerId: userId,
            position: card.position,
            purchasedAtTurn: game.turnNo,
            explodeAtTurn: game.turnNo + activeCount,
            cycleLength: activeCount,
          });
        }


        io.to(gameCode).emit("receiveMessage", {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, sender: "System",
          content: `${username} purchased ${card.name}`,
          type: "system", time: new Date().toLocaleTimeString(),
        });

        // Advance turn

        game.currentTurn = game.players[nextIndex].userId;
        game.isProcessing = false;
        game.pendingDice = null;
        game.pendingAction = null;

        game.turnDeadline = new Date(Date.now() + 32_000);
        game.actionDeadline = null;

        await game.save();
        await game.populate("players.userId");
        await game.populate("players.cards.cardId");

        io.to(gameCode).emit("turnResult", {
          players: game.players,
          currentTurn: game.players[nextIndex].userId._id,
          turnNo: game.turnNo,
          mysteryCase: null,
          cardLanded: { name: card.name, category: card.category },
        });
        return;
      }

      if (action === "bid") {
        // Save bid state — pendingAction stays, turn stays paused
        // minBid = 1 (anyone can bid any amount ≥ 1)
        // duration = 20 seconds for all players to submit bids
        const BID_DURATION = 20; // seconds

        game.pendingAction = {
          ...game.pendingAction.toObject(),
          type: "bidding",
          bids: [],           // will collect { userId, amount }
          bidDeadline: new Date(Date.now() + BID_DURATION * 1000),
        };
        await game.save();

        // Broadcast bid start to ALL players in the room
        io.to(gameCode).emit("bidStarted", {
          card: { id: card._id, name: card.name, price: card.price, weaponDamage: card.weaponDamage },
          minBid: 1,
          duration: BID_DURATION,
        });

        io.to(gameCode).emit("receiveMessage", {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, sender: "System",
          content: `Auction started for ${card.name}! ${BID_DURATION}s to bid.`,
          type: "system", time: new Date().toLocaleTimeString(),
        });

        // Auto-resolve after deadline
        setTimeout(async () => {
          await resolveBid(gameCode, card, io);
        }, BID_DURATION * 1000 + 500); // +500ms buffer
        return;
      }

    } catch (err) {
      console.error("playerAction error:", err);
    }
  });


  // 2. submitBid handler — player sends their bid amount during active auction

  socket.on("submitBid", async ({ gameCode, amount }) => {
    try {
      const game = await Game.findOne({ gameCode });
      if (!game || game.status !== "active") return;
      if (!game.pendingAction || game.pendingAction.type !== "bidding") return;

      // Bid deadline passed
      if (new Date() > new Date(game.pendingAction.bidDeadline)) return;

      const player = game.players.find(p => p.userId.toString() === userId.toString());
      if (!player || !player.isActive) return;

      // Validate amount
      const bidAmt = Math.floor(Number(amount));
      if (!bidAmt || bidAmt < 1) return;
      if (player.cashRemaining < bidAmt) return;

      // Remove previous bid from this player if they re-bid
      const existingBidIndex = game.pendingAction.bids.findIndex(
        b => b.userId.toString() === userId.toString()
      );
      if (existingBidIndex !== -1) {
        game.pendingAction.bids.splice(existingBidIndex, 1);
      }

      game.pendingAction.bids.push({ userId, amount: bidAmt });
      await game.save();

      console.log(`${username} bid ₹${bidAmt} on ${game.pendingAction.cardId}`);

    } catch (err) {
      console.error("submitBid error:", err);
    }
  });

  socket.on("emergency-meeting", async ({ gameCode }) => {
    const game = await Game.findOne({ gameCode, currentTurn: userId });
    if (!game) return;

    const currentIndex = game.players.findIndex(
      p => p.userId.toString() === userId.toString()
    );

    const player = game.players[currentIndex];
    if (player.cashRemaining >= 200) {

      player.cashRemaining -= 200;

      for (let p of game.players) {
        p.position = getRandomPosition();
      }

      await game.save();
      await game.populate("players.userId");
      await game.populate("players.cards.cardId");

      io.to(gameCode).emit("newPositions", {
        players: game.players
      });

      io.to(gameCode).emit("receiveMessage", {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sender: "System",
        content: `${username} called Emergency Meeting`,
        type: "system",
        time: new Date().toLocaleTimeString(),
      });
    } else {
      socket.emit("error", {
        message: "Not enough money"
      });
    }
  });

  socket.on("wall-purchase", async ({ gameCode, cardName }) => {
    console.log("gameCode, cardname", gameCode, cardName);

    const game = await Game.findOne({ gameCode, currentTurn: userId });
    if (!game) return;

    const currentIndex = game.players.findIndex((p) => p.userId.toString() === userId.toString());

    let getCardName = new Map([
      ["wall-maria", "wall maria"],
      ["wall-rose", "wall rose"],
      ["wall-sena", "wall sena"]
    ]);

    const player = game.players[currentIndex];
    const card = await Card.findOne({ name: getCardName.get(cardName) });
    if (!player || !card) return;

    let purchased = true;
    if (card.name === "wall sena" && player.purchasedWallSena === false) {
      purchased = false;
      player.purchasedWallSena = true;
    } else if (card.name === "wall rose" && player.purchasedWallRose === false) {
      purchased = false;
      player.purchasedWallRose = true;
    }
    else if (card.name === "wall maria" && player.purchasedWallMaria === false) {
      purchased = false;
      player.purchasedWallMaria = true;
    }

    if (player.cashRemaining >= card.price && purchased === false) {
      player.cashRemaining -= card.price;
      player.remainingShieldHp += card.ShieldHp;
      console.log("remainingShieldHP is", player.remainingShieldHp);

      await game.save();
      await game.populate("players.userId");
      await game.populate("players.cards.cardId");


      io.to(gameCode).emit("newPositions", {
        players: game.players
      });

      io.to(gameCode).emit("receiveMessage", {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sender: "System",
        content: `${username} purchased ${card.name}`,
        type: "system",
        time: new Date().toLocaleTimeString(),
      });

    } else if (purchased) {
      return socket.emit("error", {
        message: "Already purchased"
      });
    }
    else {
      socket.emit("error", {
        message: "Not enough money"
      });
    }
  });





  // ── DISCONNECT ───────────────────────────────
  // socket.on("disconnect", async () => {
  //   console.log(`${username} disconnected`);

  //   // Safety: if they disconnect mid-turn, release the lock
  //   // so the game doesn't get permanently stuck
  //   try {
  //     const game = await Game.findOne({
  //       currentTurn: userId,
  //       isProcessing: true,
  //     });

  //     if (game) {
  //       game.isProcessing = false;
  //       game.pendingDice = null;
  //       // Optionally skip their turn on disconnect
  //       // game.currentTurn = game.players[nextIndex].userId;
  //       await game.save();
  //     }
  //   } catch (err) {
  //     console.error("disconnect cleanup error:", err);
  //   }
  // });
}


export async function resolveBid(gameCode, card, ioInstance) {
  const io = ioInstance;
  try {
    const game = await Game.findOne({ gameCode }).populate("players.userId");
    await game.populate("players.cards.cardId");
    if (!game || game.status !== "active") return;
    if (!game.pendingAction || game.pendingAction.type !== "bidding") return;

    const bids = game.pendingAction.bids || [];

    // Find highest bidder who still has enough cash
    const validBids = bids
      .map(b => {
        const player = game.players.find(p => p.userId._id.toString() === b.userId.toString());
        return player && player.cashRemaining >= b.amount && player.isActive
          ? { player, amount: b.amount }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.amount - a.amount); // highest first

    // Find the landing player's original index for turn advance
    const landingPlayerId = game.pendingAction.playerId;
    const currentIndex = game.players.findIndex(
      p => p.userId._id.toString() === landingPlayerId.toString()
    );

    if (validBids.length === 0) {
      game.turnNo += 1;
      await checkTimebombExplosions(game, io, gameCode);
      // Nobody bid — card stays unowned, turn just advances
      // io.to(gameCode).emit("bidResult", {
      //   winnerName: null,
      //   amount: 0,
      //   cardName: card.name,
      // });

      io.to(gameCode).emit("receiveMessage", {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, sender: "System",
        content: `No bids for ${card.name}. Card remains unowned.`,
        type: "system", time: new Date().toLocaleTimeString(),
      });

    } else {
      const winner = validBids[0];
      winner.player.cashRemaining -= winner.amount;
      winner.player.cards.push({ cardId: card._id });

      // const nextIndex = getNextActiveIndex(game, currentIndex);
      game.turnNo += 1;
      await checkTimebombExplosions(game, io, gameCode);

      // ✅ If won card is Time Bomb — register it
      if (card.name.toLowerCase().replace(/\s+/g, "-") === "time-bomb") {
        const activeCount = game.players.filter(p => p.isActive).length;
        if (!game.timebombs) game.timebombs = [];
        game.timebombs.push({
          cardId: card._id,
          ownerId: winner.player.userId._id,
          position: card.position,
          purchasedAtTurn: game.turnNo,
          explodeAtTurn: game.turnNo + activeCount,
          cycleLength: activeCount,
        });
      }

      // const winnerUsername = (await game.populate("players.userId"))
      //   .players.find(p => p.userId._id.toString() === winner.player.userId.toString())
      //   ?.userId?.username || "Unknown";

      io.to(gameCode).emit("bidResult", {
        winnerName: winner.player?.userId?.username,
        amount: winner.amount,
        cardName: card.name,
      });

      io.to(gameCode).emit("receiveMessage", {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, sender: "System",
        content: `${winner.player.userId?.username} won ${card.name} for ₹${winner.amount}`,
        type: "system", time: new Date().toLocaleTimeString(),
      });
    }

    // Advance turn
    const nextIndex = getNextActiveIndex(game, currentIndex);
    game.currentTurn = game.players[nextIndex].userId;

    game.isProcessing = false;
    game.pendingDice = null;
    game.pendingAction = null;

    await game.save();
    await game.populate("players.userId");
    await game.populate("players.cards.cardId");

    io.to(gameCode).emit("turnResult", {
      players: game.players,
      currentTurn: game.players[nextIndex].userId._id,
      turnNo: game.turnNo,
      mysteryCase: null,
      cardLanded: { name: card.name, category: card.category },
    });

  } catch (err) {
    console.error("resolveBid error:", err);
  }
}