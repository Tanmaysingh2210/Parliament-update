import SeasonStats from "../models/season.js";
import User from "../models/user.js";
import {
    getCurrentSeason,
    getSeasonDates,
    getSeasonTimeRemaining,
} from "../utils/seasonHelper.js";


/**
 * GET /season/info
 * Returns current season metadata.
 */
export const getSeasonInfo = async (req, res) => {
    try {
        const season = getCurrentSeason();
        const { start, end } = getSeasonDates(season);
        const remainingMs = getSeasonTimeRemaining();
        const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

        return res.json({
            success: true,
            season,
            startDate: start,
            endDate: end,
            daysRemaining: remainingDays,
        });
    } catch (err) {
        console.error("getSeasonInfo error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};


/**
 * GET /season/leaderboard?season=X&limit=50
 * Returns the top players for a given season (defaults to current).
 * Sorted by wins DESC, then winRate DESC.
 */
export const getLeaderboard = async (req, res) => {
    try {
        const season = Number(req.query.season) || getCurrentSeason();
        const limit = Math.min(Number(req.query.limit) || 50, 100); // cap at 100

        const leaderboard = await SeasonStats.find({ season, played: { $gt: 0 } })
            .sort({ won: -1, winRate: -1 })
            .limit(limit)
            .populate("userId", "username isGuest")
            .lean();

        const entries = leaderboard.map((entry, index) => ({
            rank: index + 1,
            userId: entry.userId?._id,
            username: entry.userId?.username || "Unknown",
            isGuest: entry.userId?.isGuest || false,
            played: entry.played,
            won: entry.won,
            winRate: entry.winRate,
        }));

        return res.json({
            success: true,
            season,
            leaderboard: entries,
        });
    } catch (err) {
        console.error("getLeaderboard error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};


/**
 * GET /season/me?season=X
 * Returns the calling user's stats for a season (defaults to current).
 */
export const getMySeasonStats = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const userId = req.session.user.id;
        const season = Number(req.query.season) || getCurrentSeason();

        const stats = await SeasonStats.findOne({ userId, season }).lean();

        // Also fetch the user's all-time totals
        const user = await User.findById(userId).select("totalPlayed totalWon username").lean();

        return res.json({
            success: true,
            season,
            seasonStats: stats
                ? { played: stats.played, won: stats.won, winRate: stats.winRate }
                : { played: 0, won: 0, winRate: 0 },
            allTime: {
                totalPlayed: user?.totalPlayed || 0,
                totalWon: user?.totalWon || 0,
                username: user?.username || "Unknown",
            },
        });
    } catch (err) {
        console.error("getMySeasonStats error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};


/**
 * GET /season/all-time?limit=50
 * Returns the all-time leaderboard based on User.totalWon.
 */
export const getAllTimeLeaderboard = async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 100);

        const users = await User.find({ totalPlayed: { $gt: 0 } })
            .sort({ totalWon: -1 })
            .limit(limit)
            .select("username totalPlayed totalWon isGuest")
            .lean();

        const entries = users.map((user, index) => ({
            rank: index + 1,
            userId: user._id,
            username: user.username || "Unknown",
            isGuest: user.isGuest || false,
            totalPlayed: user.totalPlayed,
            totalWon: user.totalWon,
            winRate: user.totalPlayed > 0
                ? Math.round((user.totalWon / user.totalPlayed) * 10000) / 10000
                : 0,
        }));

        return res.json({
            success: true,
            leaderboard: entries,
        });
    } catch (err) {
        console.error("getAllTimeLeaderboard error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
