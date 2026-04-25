import Game from "../models/GameSession.js";
import Card from "../models/cards.js";

const pawnColor = ['redPawn', 'blackPawn', 'whitePawn', 'bluePawn', 'yellowPawn', 'greenPawn'];

export const createRoom = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = req.session.user;
    const { gameCode, maxPlayer } = req.body;

    if (!gameCode || !maxPlayer || maxPlayer < 2 || maxPlayer > 6) return res.status(400).json({ message: "gameCode not found or invalid maxPlayer", success: false });

    const game = await Game.create({
      gameCode,
      maxPlayer,
      players: [
        {
          userId: user.id,
          cards: [],
          isBot: false,

          pawn: 'redPawn',

          remainingParliamentHp: 1500,
          remainingShieldHp: 0,

          cashRemaining: 1200,
          position: 0,

          skippedChances: 0,
          isActive: true
        }
      ],
      currentTurn: null,
      status: "waiting"
    });
    res.status(200).json({
      gameSchema: game,
      players: game.players,
      success: true,
      gameCode: game.gameCode,
      gameId: game._id
    })
  }

  catch (err) {
    console.log({ message: "error creating game", err });
    res.json({ message: "error creating game", error: err.message });
  }
}



export const joinRoom = async (req, res) => {
  try {
    const { gameCode } = req.body;

    if (!req.session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = req.session.user;
    const userId = user.id;

    // const game = await Game.findOne({ gameCode });

    // if (!game) {
    //   return res.status(404).json({ error: "Room not found" });
    // }

    // const alreadyJoined = game.players.some(p =>
    //   p.userId.equals(userId)
    // );

    // if (!alreadyJoined) {
    //   if (game.players.length >= game.maxPlayer) {
    //     return res.status(400).json({ error: "Room is full" });
    //   }

    //   game.players.push({
    //     userId,
    //     cards: [],
    //     isBot: false,
    //     remainingParliamentHp: 1500,
    //     remainingShieldHp: 0,
    //     cashRemaining: 1200,
    //     position: 0,
    //     skippedChances: 0,
    //     isActive: true,
    //     pawn: pawnColor[game.players.length - 1]
    //   });
    // }

    // if (game.players.length === game.maxPlayer) {
    //   game.status = "active";
    //   game.turnNo = 1;
    //   game.currentTurn = game.players[0].userId;
    //   game.turnDeadline = new Date(Date.now() + 32_000);
    //   game.actionDeadline = null;
    //   game.pendingAction = null;
    // }

    // await game.save();

    // Step 1: Read current game to get player count for pawn color
    const currentGame = await Game.findOne({ gameCode });
    if (!currentGame) return res.status(404).json({ error: "Room not found" });

    const alreadyIn = currentGame.players.some(p => p.userId.equals(userId));
    const pawnIndex = currentGame.players.length; // snapshot before atomic push
    const assignedPawn = pawnColor[pawnIndex] || pawnColor[0]; // fallback

    // Step 2: Atomic push — only succeeds if room has space and user not already in
    const updatedGame = await Game.findOneAndUpdate(
      {
        gameCode,
        status: "waiting",
        $expr: { $lt: [{ $size: "$players" }, "$maxPlayer"] },  // atomic check
        "players.userId": { $ne: userId }                        // not already in
      },
      {
        $push: {
          players: {
            userId,
            cards: [],
            isBot: false,
            remainingParliamentHp: 1500,
            remainingShieldHp: 0,
            cashRemaining: 1200,
            position: 0,
            skippedChances: 0,
            isActive: true,
            // pawn: pawnColors[game.players.length - 1]  // use pre-read length for color
            pawn: assignedPawn
          }
        }
      },
      { new: true }
    );

    // Step 3: Handle failure cases
    if (!updatedGame) {
      if (alreadyIn) {
        // Player rejoining — return current game state
        return res.json({
          success: true,
          gameId: currentGame._id,
          gameCode: currentGame.gameCode,
          maxPlayer: currentGame.maxPlayer,
          status: currentGame.status,
          players: currentGame.players
        });
      }
      return res.status(400).json({ error: "Room is full" });
    }

    // Step 4: If room just filled, activate game
    if (updatedGame.players.length === updatedGame.maxPlayer) {
      updatedGame.status = "active";
      updatedGame.turnNo = 1;
      updatedGame.currentTurn = updatedGame.players[0].userId;
      updatedGame.turnDeadline = new Date(Date.now() + 32_000);
      updatedGame.actionDeadline = null;
      updatedGame.pendingAction = null;
      await updatedGame.save();
    }

    res.json({
      success: true,
      gameId: updatedGame._id,
      gameCode: updatedGame.gameCode,
      maxPlayer: updatedGame.maxPlayer,
      status: updatedGame.status,
      players: updatedGame.players
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};




const getMysteryCard = () => {
  const getRand = () => Math.floor(Math.random() * MysteryBox.length);
  const MysteryBox = [
    {
      amount: +150,
      statement: "Foreign investment deal approaved",
    },
    {
      amount: +100,
      statement: "Tax from citizens"
    },
    {
      amount: +110,
      statement: "Black Money Raid"
    },
    {
      amount: +130,
      statement: "Received emergency funding from supporters"
    },
    {
      amount: +101,
      statement: "Public rally success donation"
    },
    {
      amount: -100,
      statement: "Curruption investigation fine"
    },
    {
      amount: -90,
      statement: "Emergency defence spending"
    },
    {
      amount: -120,
      statement: "Cyber attack repair cost"
    },
    {
      amount: +50,
      statement: "Printed War money"
    },
    {
      amount: +100,
      statement: "Bribe attempt works"
    },
    {
      amount: -100,
      statement: "Bribe attempt caught"
    },
    {
      amount: +100,
      statement: "Successful strike, looted enemy resources"
    }, {
      amount: -100,
      statement: "Defence Drone deployed"
    }
  ]
  return MysteryBox[getRand()];

}

export const turn = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { gameId, dice, chanceSkipped } = req.query;

    dice = Number(dice);
    const game = await Game.findById(gameId);
    game.turnNo += 1;

    if (!game || game.status !== "active") {
      return res.status(400).json({ message: "Game not active" });
    }

    // turn validation
    if (!game.currentTurn.equals(userId)) {
      return res.status(403).json({ message: "Not your turn" });
    }

    const player = game.players.find(p =>
      p.userId.equals(userId)
    );

    if (chanceSkipped) {
      (player.skippedChances)++;
    }

    if (player.skippedChances == 4) {
      player.isActive = false;

      // ai take or free cards when he takes initally
    }

    const currentIndex = game.players.findIndex(p =>
      p.userId.equals(userId)
    );

    let nextIndex = (currentIndex + 1) % game.players.length;

    while (!game.players[nextIndex].isActive) {
      nextIndex = (nextIndex + 1) % game.players.length;
    }
    if (currentIndex == nextIndex) {
      game.status = "finished";
      game.winner = userId;
    }

    player.position = (player.position + dice) % 32;

    const card = await Card.findOne({ position: player.position });
    let purchased = false;
    let ownerOfCard = "";
    let shieldDamage = 0;
    let hasAgent = player.agent;
    let agentDamage = 0;
    let scientistDamage = 0;
    let scientistQty = 0;


    function getOwnerPlayerById(game, ownerId) {
      return game.players.find(p => p.userId.equals(ownerId));
    }
    let mysteryCase = {};

    switch (card.category) {
      case "public":
        player.remainingParliamentHp -= card.weaponDamage;
        player.remainingShieldHp -= card.weaponDamage;
        if (player.remainingShieldHp < 0) { player.remainingShieldHp = 0; }
        player.agent = false;// ye isliye kiya taki next chance par agent false ho jaye 
        break;

      case "weapon":
        if (card.isPurchasable) {
          for (let p of game.players) {
            ownerOfCard = p.userId;

            scientistQty = getOwnerPlayerById(game, ownerOfCard)?.scientist;
            for (let c of p.cards) {
              if (c.cardId === card._id) {
                purchased = true;
                break;
              }
            }
            if (purchased == true) {
              break;
            }
          }
          scientistDamage = card.weaponDamage + (card.weaponDamage * scientistQty * 0.03);
          agentDamage = hasAgent ? (scientistDamage / 2) : scientistDamage;

          if (purchased) {
            //damage to current player
            if (ownerOfCard != userId) {
              if (player?.remainingShieldHp >= agentDamage) {
                player.remainingShieldHp -= agentDamage;

              } else if (player?.remainingShieldHp !== 0 && player?.remainingShieldHp < agentDamage) {
                shieldDamage = player.remainingShieldHp - agentDamage;
                player.remainingShieldHp = 0;
                player.remainingParliamentHp += shieldDamage;
              } else {
                player.remainingParliamentHp -= agentDamage;
              }
            }
          } else { //buy or bid    

            if (player.cashRemaining < card.price) {

              const bidders = game.players
                .filter(p => p.isActive && p.cashRemaining > 0)
                .map(p => ({
                  userId: p.userId,
                  cash: p.cashRemaining
                }));

              return res.json({
                success: true,
                bidStarted: true,
                reason: "insufficent_money",
                card: {
                  id: card._id,
                  name: card.name,
                  price: card.price
                },
                bidders
              });
            }
            else {
              return res.json({
                success: true,
                actionRequired: true,
                options: ["buy", "bid"],
                card: {
                  id: card._id,
                  name: card.name,
                  price: card.price
                },
              })
            }

            if (card.name.toString() === "time bomb") {
              game.timebombPurchaseTurn = game.turnNo;
            }
          }
        }
        player.agent = false;
        break;

      case "terror":
        player.cashRemaining -= card.price;
        player.agent = false;
        break;

      case "safe":
        player.agent = false;

        break;

      case "start":
        player.cashRemaining += 200;
        player.agent = false;
        break;

      case "mystry":
        mysteryCase = getMysteryCard();
        player.cashRemaining += mysteryCase.amount;
        player.agent = false;

        break;

      case "agent":
        player.agent = true;
        break;

      case "scientist":
        player.scientist += 1;
        player.agent = false;

        break;

      case "engineer":
        player.remainingParliamentHp += 100;
        if (player.remainingParliamentHp > 1000) {
          player.remainingParliamentHp = 1000;
        }
        player.agent = false;

        break;

      default:
        throw new Error("Unknown card category");


    }

    if (player.remainingParliamentHp <= 0) {
      player.isActive = false;
    }

    await game.save();

    let remainingActivePlayer = 0;
    for (const p of game.players) {
      if (p.isActive == true) remainingActivePlayer++;
    }
    if (remainingActivePlayer == 1) {
      game.status = "finished";
      game.winner = userId;
    }

    let shieldDamageforTimeBomb = 0;
    if ((game.turnNo - game.timebombPurchaseTurn) % 4 == 0) {
      for (const p of game.players) {
        if (p.position <= 18 && p.position >= 10) {
          if (p?.remainingShieldHp >= 90) {
            p.remainingShieldHp -= 90;
          } else if (p?.remainingShieldHp !== 0 && p?.remainingShieldHp < 90) {
            shieldDamageforTimeBomb = p.remainingShieldHp - 90;
            p.remainingShieldHp = 0;
            p.remainingParliamentHp += shieldDamageforTimeBomb;
          } else {
            p.remainingParliamentHp -= 90;
          }
        }
      }
    }

    res.json({
      mysteryCase,
      success: true,
      newPosition: player.position
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

