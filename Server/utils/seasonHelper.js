/**
 * Season Helper — auto-computes current season number
 * Each season lasts 14 days (2 weeks).
 * Season 1 starts on 2026-07-07T00:00:00Z.
 */

const SEASON_1_START = new Date("2026-07-07T00:00:00Z");
const SEASON_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

/**
 * Returns the current season number (1-based).
 */
export function getCurrentSeason() {
    const elapsed = Date.now() - SEASON_1_START.getTime();
    if (elapsed < 0) return 1; // before season 1 starts
    return Math.floor(elapsed / SEASON_DURATION_MS) + 1;
}

/**
 * Returns the start and end dates for a given season number.
 */
export function getSeasonDates(seasonNumber) {
    const start = new Date(
        SEASON_1_START.getTime() + (seasonNumber - 1) * SEASON_DURATION_MS
    );
    const end = new Date(start.getTime() + SEASON_DURATION_MS);
    return { start, end };
}

/**
 * Returns how many milliseconds remain in the current season.
 */
export function getSeasonTimeRemaining() {
    const season = getCurrentSeason();
    const { end } = getSeasonDates(season);
    return Math.max(0, end.getTime() - Date.now());
}
