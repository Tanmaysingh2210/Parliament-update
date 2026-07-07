import mongoose from "mongoose";

const seasonStatsSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    season: {
        type: Number,
        required: true
    },

    played: {
        type: Number,
        default: 0
    },

    won: {
        type: Number,
        default: 0
    },

    winRate: {
        type: Number,
        default: 0
    },

}, {
    timestamps: true
});

seasonStatsSchema.index(
    { userId: 1, season: 1 },
    { unique: true }
);

// Index for fast leaderboard queries: sort by won DESC, winRate DESC within a season
seasonStatsSchema.index(
    { season: 1, won: -1, winRate: -1 }
);

export default mongoose.model(
    "season-stats",
    seasonStatsSchema
);