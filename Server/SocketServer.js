import http from 'http';
import { Server } from 'socket.io';
import { app, sessionMiddleWare } from "./app.js";
import chatSocket from "./Socket/chatSocket.js";
import gameSocket from "./Socket/gameSocket.js";
import Game from "./models/GameSession.js";
import Card from './models/cards.js';
import { executeTurn, resolveBid } from './Socket/gameSocket.js';

const server = http.createServer(app);

const allowedOrigins = [
    'http://localhost:5173',
    'https://parliamentbattle.aalsicoders.in',
    'https://parliamentbattle.vercel.app'
];

const io = new Server(server,
    {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    console.warn(`Socket CORS blocked for origin: ${origin}`);
                    callback(new Error(`CORS blocked for origin: ${origin}`));
                }
            },
            credentials: true,
            methods: ["GET", "POST"]
        },
        transports: ['websocket', 'polling']
    }
)
io.use((socket, next) => {
    sessionMiddleWare(socket.request, {}, next);
});

io.on("connection", (socket) => {
    console.log("Socket session:", socket.request.session);
    const user = socket.handshake.auth;;
    console.log("User: ", user);

    if (!user || !user.username) {
        console.log("Unauthenticated socket");
        socket.disconnect();
        return;
    }

    socket.userId = user.userId;
    socket.username = user.username;

    console.log("User connected:", user.username);

    // socket.on("joinMatch", () => {
    //     console.log("Match request from:", user.username);
    // });

    // console.log("Socket connected:", user.username);
    chatSocket(io, socket);
    gameSocket(io, socket);
});

// ── WATCHDOG — runs every 5 seconds ──────────────────────────
function getNextActiveIndex(game, currentIndex) {
    const total = game.players.length;
    let nextIndex = (currentIndex + 1) % total;
    let loops = 0;
    while (!game.players[nextIndex].isActive) {
        nextIndex = (nextIndex + 1) % total;
        loops++;
        if (loops >= total) return -1;
    }
    return nextIndex;
};


setInterval(async () => {
    try {
        const now = new Date();
        // ── Case 1: Player didn't roll dice in time ──────────────
        const staleTurnGames = await Game.find({
            status: "active",
            isProcessing: false,
            turnDeadline: { $lt: now },
            pendingAction: null,
        }).populate("players.userId").populate("players.cards.cardId");


        for (const game of staleTurnGames) {
            console.log(`[watchdog] Stale turn in room ${game.gameCode}`);

            const locked = await Game.findOneAndUpdate(
                { _id: game._id, isProcessing: false, status: "active" },
                { $set: { isProcessing: true, turnDeadline: null } },
                { new: true }
            );
            if (!locked) continue;

            const currentIndex = game.players.findIndex(
                p => p.userId._id.toString() === game.currentTurn.toString()
            );
            if (currentIndex === -1) {
                await Game.findByIdAndUpdate(game._id, { isProcessing: false });
                continue;
            }

            const player = game.players[currentIndex];
            player.skippedChances = (player.skippedChances || 0) + 1;

            io.to(game.gameCode).emit("receiveMessage", {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                sender: "System",
                content: `⏱️ ${player.userId.username} skipped (${player.skippedChances}/3) — auto rolling`,
                type: "system",
                time: new Date().toLocaleTimeString(),
            });

            if (player.skippedChances >= 4) {
                player.isActive = false;
                const activePlayers = game.players.filter(p => p.isActive);

                if (activePlayers.length <= 1) {
                    game.status = "finished";
                    game.winner = activePlayers[0]?.userId._id || null;
                    game.isProcessing = false;
                    game.turnDeadline = null;
                    await game.save();
                    io.to(game.gameCode).emit("gameOver", { winner: game.winner, players: game.players });
                    continue;
                }

                const nextIndex = getNextActiveIndex(game, currentIndex);
                game.currentTurn = game.players[nextIndex].userId._id;
                game.turnNo += 1;
                game.isProcessing = false;
                game.turnDeadline = new Date(Date.now() + 32_000);
                game.pendingAction = null;
                await game.save();

                io.to(game.gameCode).emit("turnResult", {
                    players: game.players,
                    currentTurn: game.players[nextIndex].userId._id,
                    turnNo: game.turnNo,
                    mysteryCase: null,
                });

                io.to(gameCode).emit("diceResult", {
                    diceValue: 1,          
                    rolledBy: null,        
                    players: game.players,
                });

                continue;
            }

            // Auto-roll and let existing playTurn handle the rest
            const diceValue = Math.floor(Math.random() * 6) + 1;
            game.pendingDice = diceValue;
            await game.save();

            io.to(game.gameCode).emit("diceResult", {
                diceValue,
                rolledBy: game.currentTurn,
                players: game.players,
            });

            // Emit playTurn to server itself after animation delay
            setTimeout(async () => {
                await executeTurn(game.gameCode, game.currentTurn.toString(), player.userId.username.toString(), io, null);
            }, diceValue * 320 + 600);
        }

        // ── Case 2: Player didn't act on buy/bid modal in time ───
        const staleActionGames = await Game.find({
            status: "active",
            actionDeadline: { $lt: now },
            "pendingAction.type": { $in: ["buyOrBid", "Bid"] },
        }).populate("players.userId").populate("players.cards.cardId");

        for (const game of staleActionGames) {
            console.log(`[watchdog] Stale action in room ${game.gameCode}`);

            const card = await Card.findById(game.pendingAction.cardId);
            if (!card) continue;

            const BID_DURATION = 20;
            game.pendingAction.type = "bidding";
            game.pendingAction.bids = [];
            game.pendingAction.bidDeadline = new Date(Date.now() + BID_DURATION * 1000);
            game.actionDeadline = null;
            await game.save();

            io.to(game.gameCode).emit("bidStarted", {
                card: { id: card._id, name: card.name, price: card.price, weaponDamage: card.weaponDamage },
                minBid: 1,
                duration: BID_DURATION,
            });

            io.to(game.gameCode).emit("receiveMessage", {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                sender: "System",
                content: `⏰ Auto-auction for ${card.name} (player timed out)`,
                type: "system",
                time: new Date().toLocaleTimeString(),
            });

            const cardRef = card;
            const gameCodeRef = game.gameCode;
            setTimeout(async () => {
                await resolveBid(gameCodeRef, cardRef, io);
            }, BID_DURATION * 1000 + 500);
        }

    } catch (err) {
        console.error("[watchdog] error:", err);
    }
}, 5000);

const port = 3000;
server.listen(port, () =>
    console.log(`Server running at port ${port}`)
);


