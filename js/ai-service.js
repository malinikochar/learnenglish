/**
 * AIService — Frontend API client for Learn English
 * Calls local /api/* proxy endpoints (never touches the API key)
 */
const AIService = (() => {
    const BASE = '';  // Same origin

    async function request(endpoint, body) {
        try {
            const res = await fetch(`${BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(err.error || err.details || `HTTP ${res.status}`);
            }

            return await res.json();
        } catch (err) {
            console.error(`AIService error [${endpoint}]:`, err.message);
            throw err;
        }
    }

    /**
     * Chat with AI tutor
     * @param {Array} messages — OpenAI messages format [{role, content}]
     * @returns {Promise<string>} AI response text
     */
    async function chat(messages) {
        const data = await request('/api/chat', { messages });
        return data.content;
    }

    /**
     * Start a tutoring session with system context
     * @param {string} topic — Grammar, Vocabulary, Conversation, Writing, Pronunciation
     * @param {string} level — Beginner, Intermediate, Advanced
     * @returns {string} System prompt to use
     */
    function getTutorSystemPrompt(topic, level) {
        return `You are a friendly, expert English tutor on the Learn English platform. You are teaching ${topic} at the ${level} level.

Rules:
- Be encouraging and supportive
- Use examples from real life
- After explaining a concept, ask the student a practice question
- If the student makes a mistake, gently correct them and explain why
- Use emojis sparingly to be friendly 😊
- Keep responses concise (under 200 words)
- Format key terms in **bold**
- When appropriate, provide the phonetic pronunciation in /slashes/

Start by greeting the student and introducing what you'll teach today.`;
    }

    /**
     * Generate a test
     * @param {string} category — Grammar, Vocabulary, Reading, Sentence Correction
     * @param {string} difficulty — Beginner, Intermediate, Advanced
     * @param {number} questionCount — Number of questions
     * @returns {Promise<Array>} Array of question objects
     */
    async function generateTest(category = 'Grammar', difficulty = 'Intermediate', questionCount = 10) {
        const data = await request('/api/generate-test', { category, difficulty, questionCount });
        return data.questions;
    }

    /**
     * Grade a specific answer with AI feedback
     */
    async function gradeAnswer(question, userAnswer, correctAnswer) {
        return await request('/api/grade', { question, userAnswer, correctAnswer });
    }

    /**
     * Check server health
     */
    async function checkHealth() {
        try {
            const res = await fetch('/api/health');
            return await res.json();
        } catch {
            return { status: 'error', hasKey: false };
        }
    }

    return { chat, getTutorSystemPrompt, generateTest, gradeAnswer, checkHealth };
})();
