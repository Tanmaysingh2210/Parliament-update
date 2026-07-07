import mongoose from "mongoose";

const MatchmakingQueueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
    unique: true
  },

  preferredPlayerCount: {
    type: Number,
    enum: [2, 3, 4, 5, 6],
    required: true
  },

  status: {
    type: String,
    enum: ["queued", "matched", "cancelled", "expired"],
    default: "queued"
  },

  matchedGameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "game-session",
    default: null
  },

  joinedAt: {
    type: Date,
    default: Date.now
  },

  timeoutAt: {
    type: Date,
    required: true
  }

}, { timestamps: true });



// Fast queue searching
MatchmakingQueueSchema.index({
  status: 1,
  preferredPlayerCount: 1,
  joinedAt: 1
});


// Auto delete expired queue entries
MatchmakingQueueSchema.index(
  { timeoutAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.model(
  "MatchmakingQueue",
  MatchmakingQueueSchema
);