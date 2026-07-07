import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    // made optional so users can sign up with email/password first and set username later
    username: { type: String, default: null },
    email: { type: String, unique: true, sparse: true },
    passHash: { type: String, default: null },
    isGuest: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now() },
    lastActive: { type: Date, default: Date.now() },
    sessionToken: { type: String, unique: true, sparse: true },
    totalPlayed: {
        type: Number,
        default: 0
    },

    totalWon: {
        type: Number,
        default: 0
    },
});


export default mongoose.model('user', userSchema);