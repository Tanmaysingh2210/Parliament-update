import mongoose from "mongoose";

const GameSchema = new mongoose.Schema({
    players: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'user',
                required: true
            },
            cards: [
                {
                    cardId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'cards',
                        required: true
                    }
                }
            ],
            purchasedWallSena: { type: Boolean, default: false },
            purchasedWallRose: { type: Boolean, default: false },
            purchasedWallMaria: { type: Boolean, default: false },
            isBot: { type: Boolean, required: true },
            remainingParliamentHp: { type: Number, required: true },
            remainingShieldHp: { type: Number },
            cashRemaining: { type: Number, required: true },
            position: { type: Number, required: true },
            skippedChances: { type: Number, default: 0 },
            pawn: { type: String, required: true },
            isActive: { type: Boolean, required: true },
            scientist: { type: Number, default: 0 },
            agent: { type: Boolean, default: false },

        }
    ],
    maxPlayer: { type: Number, required: true },
    gameCode: { type: String, required: true },
    currentTurn: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "user" },


    turnNo: { type: Number, default: 0 },
    timebombPurchaseTurn: Number,
    status: {
        type: String,
        enum: ["waiting", "active", "finished"],
        default: "waiting"
    },
    isProcessing: { type: Boolean, default: false },
    pendingDice: { type: Number, default: null },
    pendingAction: {
        type: { type: String },
        cardId: mongoose.Schema.Types.ObjectId,
        playerId: mongoose.Schema.Types.ObjectId,
        bids: [{ userId: mongoose.Schema.Types.ObjectId, amount: Number }],
        bidDeadline: Date,
        _id: false
    },
    timebombs: [
        {
            cardId: mongoose.Schema.Types.ObjectId,
            ownerId: mongoose.Schema.Types.ObjectId,
            position: Number,
            purchasedAtTurn: Number,
            explodeAtTurn: Number,
            cycleLength: Number,
            _id: false
        }
    ],

    turnDeadline: { type: Date, default: null },
    actionDeadline: { type: Date, default: null }, 

}, { timestamps: true });

// Auto delete after 2 days
GameSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 172800 }
);

export default mongoose.model('game-session', GameSchema);