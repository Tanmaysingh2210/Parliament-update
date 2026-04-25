import Game from "../models/GameSession.js";
import Card from "../models/cards.js";

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

function findCardOwner(game, cardId) {
  for (const p of game.players) {
    if (p.cards.some(c => c.cardId.toString() === cardId.toString())) return p;
  }
  return null;
}

export async function processAutoTurn(gameCode, currentUserId, io) {
  try {
    const game = await Game.findOne({ gameCode })
      .populate("players.userId")
      .populate("players.cards.cardId");

    if (!game || game.status !== "active") return;
    if (game.currentTurn.toString() !== currentUserId.toString()) return;
    if (!game.isProcessing || !game.pendingDice) return;

    const dice = game.pendingDice;
    const currentIndex = game.players.findIndex(
      p => p.userId._id.toString() === currentUserId.toString()
    );
    if (currentIndex === -1) return;

    const player = game.players[currentIndex];
    const oldPosition = player.position;
    player.position = (player.position + dice) % 32;
    if (player.position < oldPosition) player.cashRemaining += 200;

    const card = await Card.findOne({ position: player.position });
    if (!card) return;

    // Apply card effects (simplified — skip buy/bid for auto-turn)
    switch (card.category) {
      case "weapon": {
        if (!card.isPurchasable) {
          applyDamage(player, card.weaponDamage);
        } else {
          const owner = findCardOwner(game, card._id);
          if (owner && owner.userId._id.toString() !== currentUserId) {
            const dmg = card.weaponDamage * (1 + owner.scientist * 0.03);
            applyDamage(player, player.agent ? dmg / 2 : dmg);
          }
          // If unowned — skip buy/bid, card stays unowned
        }
        break;
      }
      case "public": {
        player.remainingShieldHp = Math.max(0, player.remainingShieldHp - card.weaponDamage);
        player.remainingParliamentHp = Math.max(0, player.remainingParliamentHp - card.weaponDamage);
        break;
      }
      case "terror":    { player.cashRemaining -= card.price; break; }
      case "engineer":  { player.remainingParliamentHp = Math.min(1500, player.remainingParliamentHp + 100); break; }
      case "scientist": { player.scientist += 1; break; }
      case "agent":     { player.agent = true; break; }
      default: break;
    }

    if (card.category !== "agent") player.agent = false;
    if (player.remainingParliamentHp <= 0) { player.remainingParliamentHp = 0; player.isActive = false; }

    const activePlayers = game.players.filter(p => p.isActive);
    if (activePlayers.length <= 1) {
      game.status = "finished";
      game.winner = activePlayers[0]?.userId._id || null;
      game.isProcessing = false;
      game.pendingDice = null;
      game.turnDeadline = null;
      await game.save();
      io.to(gameCode).emit("gameOver", { winner: game.winner, players: game.players });
      return;
    }

    const nextIndex = getNextActiveIndex(game, currentIndex);
    game.currentTurn = game.players[nextIndex].userId._id;
    game.turnNo += 1;
    game.isProcessing = false;
    game.pendingDice = null;
    game.pendingAction = null;
    game.turnDeadline = new Date(Date.now() + 32_000); // ← next player's timer
    game.actionDeadline = null;

    await game.save();

    io.to(gameCode).emit("turnResult", {
      players: game.players,
      currentTurn: game.players[nextIndex].userId._id,
      turnNo: game.turnNo,
      mysteryCase: null,
      cardLanded: { name: card.name, category: card.category },
    });

    io.to(gameCode).emit("receiveMessage", {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: "System",
      content: `[Auto] ${player.userId.username} landed on ${card.name}`,
      type: "system",
      time: new Date().toLocaleTimeString(),
    });

  } catch (err) {
    console.error("[autoTurn] error:", err);
    await Game.findOneAndUpdate({ gameCode }, { $set: { isProcessing: false } });
  }
}






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
            await resolveBid(gameCode, card);
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