import express from "express";
import {
    getSeasonInfo,
    getLeaderboard,
    getMySeasonStats,
    getAllTimeLeaderboard,
} from "../Controller/seasonController.js";

const router = express.Router();

// Current season info (number, start, end, days remaining)
router.get("/info", getSeasonInfo);

// Season leaderboard — ?season=X&limit=50
router.get("/leaderboard", getLeaderboard);

// Current user's season stats — ?season=X
router.get("/me", getMySeasonStats);

// All-time leaderboard — ?limit=50
router.get("/all-time", getAllTimeLeaderboard);

export default router;
