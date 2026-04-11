/**
 * AppData — localStorage persistence layer for Learn English
 * Manages test history, time tracking, learning stats, and progress snapshots.
 */
const AppData = (() => {
    const KEYS = {
        TESTS: 'Learn English_tests',
        TIME: 'Learn English_time',
        STATS: 'Learn English_stats',
        SNAPSHOTS: 'Learn English_snapshots',
        SESSION: 'Learn English_session_start'
    };

    function get(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch { return fallback; }
    }

    function set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    // ─── Stats ───
    function getStats() {
        return get(KEYS.STATS, {
            lessonsCompleted: 0,
            currentLevel: 'Beginner',
            streak: 0,
            xpPoints: 0
        });
    }

    function updateStats(partial) {
        const stats = getStats();
        Object.assign(stats, partial);
        set(KEYS.STATS, stats);
        return stats;
    }

    function addXP(points) {
        const stats = getStats();
        stats.xpPoints += points;
        set(KEYS.STATS, stats);
        return stats;
    }

    // ─── Test History ───
    function getTestHistory() {
        return get(KEYS.TESTS, []);
    }

    function saveTestResult(result) {
        const tests = getTestHistory();
        const record = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            date: new Date().toISOString(),
            category: result.category || 'General',
            difficulty: result.difficulty || 'Intermediate',
            score: result.score,
            totalQuestions: result.totalQuestions,
            percentage: Math.round((result.score / result.totalQuestions) * 100),
            timeTaken: result.timeTaken || 0,
            questions: result.questions || []
        };
        tests.unshift(record);
        // Keep last 100 tests
        if (tests.length > 100) tests.length = 100;
        set(KEYS.TESTS, tests);

        // Update stats
        const stats = getStats();
        stats.xpPoints += record.percentage >= 80 ? 50 : record.percentage >= 60 ? 30 : 15;
        stats.lessonsCompleted += 1;
        set(KEYS.STATS, stats);

        // Save daily snapshot
        saveDailySnapshot(record.percentage);

        return record;
    }

    function getAverageScore() {
        const tests = getTestHistory();
        if (tests.length === 0) return 0;
        const sum = tests.reduce((acc, t) => acc + t.percentage, 0);
        return Math.round(sum / tests.length);
    }

    function getScoresByCategory() {
        const tests = getTestHistory();
        const cats = {};
        tests.forEach(t => {
            if (!cats[t.category]) cats[t.category] = { total: 0, count: 0 };
            cats[t.category].total += t.percentage;
            cats[t.category].count += 1;
        });
        const result = {};
        for (const [k, v] of Object.entries(cats)) {
            result[k] = Math.round(v.total / v.count);
        }
        return result;
    }

    // ─── Daily Snapshots (for line chart) ───
    function saveDailySnapshot(score) {
        const snapshots = get(KEYS.SNAPSHOTS, []);
        const today = new Date().toISOString().split('T')[0];
        const existing = snapshots.find(s => s.date === today);
        if (existing) {
            existing.scores.push(score);
            existing.average = Math.round(existing.scores.reduce((a, b) => a + b, 0) / existing.scores.length);
        } else {
            snapshots.push({ date: today, scores: [score], average: score });
        }
        // Keep last 90 days
        if (snapshots.length > 90) snapshots.shift();
        set(KEYS.SNAPSHOTS, snapshots);
    }

    function getProgressOverTime(days = 30) {
        const snapshots = get(KEYS.SNAPSHOTS, []);
        return snapshots.slice(-days);
    }

    // ─── Time Tracking ───
    function startSession() {
        set(KEYS.SESSION, Date.now());
    }

    function endSession() {
        const start = get(KEYS.SESSION, null);
        if (!start) return 0;

        const duration = Math.round((Date.now() - start) / 1000 / 60); // minutes
        if (duration < 1) return 0;

        const time = getTimeData();
        const today = new Date().toISOString().split('T')[0];
        const todayEntry = time.sessions.find(s => s.date === today);
        if (todayEntry) {
            todayEntry.minutes += duration;
        } else {
            time.sessions.push({ date: today, minutes: duration });
        }
        // Keep last 90 days
        if (time.sessions.length > 90) time.sessions.shift();
        time.totalMinutes += duration;
        set(KEYS.TIME, time);

        localStorage.removeItem(KEYS.SESSION);
        return duration;
    }

    function getTimeData() {
        return get(KEYS.TIME, { sessions: [], totalMinutes: 0 });
    }

    function getTimeSpent() {
        const time = getTimeData();
        const today = new Date().toISOString().split('T')[0];
        const todayEntry = time.sessions.find(s => s.date === today);

        // Calculate current session time
        const sessionStart = get(KEYS.SESSION, null);
        const currentSessionMin = sessionStart ? Math.round((Date.now() - sessionStart) / 1000 / 60) : 0;

        // This week
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekStr = weekAgo.toISOString().split('T')[0];
        const weekMinutes = time.sessions
            .filter(s => s.date >= weekStr)
            .reduce((acc, s) => acc + s.minutes, 0) + currentSessionMin;

        return {
            today: (todayEntry ? todayEntry.minutes : 0) + currentSessionMin,
            week: weekMinutes,
            total: time.totalMinutes + currentSessionMin,
            sessions: time.sessions.slice(-7)
        };
    }

    // ─── Helpers ───
    function formatMinutes(mins) {
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }

    function clearAll() {
        Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    }

    // Public API
    return {
        getStats, updateStats, addXP,
        getTestHistory, saveTestResult, getAverageScore, getScoresByCategory,
        getProgressOverTime,
        startSession, endSession, getTimeSpent, getTimeData,
        formatMinutes, clearAll
    };
})();

// Auto-start session tracking on page load
AppData.startSession();
window.addEventListener('beforeunload', () => AppData.endSession());
