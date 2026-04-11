require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname), {
    extensions: ['html']
}));

// ─── Health check ───
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasKey: !!OPENAI_API_KEY });
});

// ─── Chat proxy (AI Tutor) ───
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'messages array is required' });
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages,
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('OpenAI error:', response.status, err);
            return res.status(response.status).json({ error: 'OpenAI API error', details: err });
        }

        const data = await response.json();
        res.json({ content: data.choices[0].message.content });
    } catch (err) {
        console.error('Server error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── Generate test proxy ───
app.post('/api/generate-test', async (req, res) => {
    try {
        const { category, difficulty, questionCount } = req.body;

        const systemPrompt = `You are an English language test generator. Generate exactly ${questionCount || 10} multiple choice questions for an English ${category || 'grammar'} test at ${difficulty || 'intermediate'} level.

Return ONLY a valid JSON array with this exact structure (no markdown, no code fences):
[
  {
    "id": 1,
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Brief explanation of the correct answer"
  }
]

Make questions progressively harder. Each question must have exactly 4 options. correctIndex is 0-based.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Generate a ${difficulty || 'intermediate'} level ${category || 'grammar'} test with ${questionCount || 10} questions.` }
                ],
                temperature: 0.8,
                max_tokens: 3000
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('OpenAI error:', response.status, err);
            return res.status(response.status).json({ error: 'OpenAI API error', details: err });
        }

        const data = await response.json();
        let content = data.choices[0].message.content.trim();

        // Strip markdown code fences if present
        content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

        const questions = JSON.parse(content);
        res.json({ questions });
    } catch (err) {
        console.error('Server error:', err.message);
        res.status(500).json({ error: 'Failed to generate test', details: err.message });
    }
});

// ─── Grade answers proxy ───
app.post('/api/grade', async (req, res) => {
    try {
        const { question, userAnswer, correctAnswer } = req.body;

        const systemPrompt = `You are an English teacher grading a student's answer. Be encouraging but honest. Keep your response under 100 words.

Respond in this JSON format (no markdown, no code fences):
{
  "isCorrect": true/false,
  "feedback": "Your feedback here",
  "tip": "A quick learning tip related to this question"
}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Question: "${question}"\nStudent answered: "${userAnswer}"\nCorrect answer: "${correctAnswer}"` }
                ],
                temperature: 0.5,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            const err = await response.text();
            return res.status(response.status).json({ error: 'OpenAI API error', details: err });
        }

        const data = await response.json();
        let content = data.choices[0].message.content.trim();
        content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

        const grading = JSON.parse(content);
        res.json(grading);
    } catch (err) {
        console.error('Server error:', err.message);
        res.status(500).json({ error: 'Failed to grade', details: err.message });
    }
});

// ─── Text-to-Speech proxy ───
app.post('/api/tts', async (req, res) => {
    try {
        const { text, voice } = req.body;
        if (!text) return res.status(400).json({ error: 'text is required' });

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text.slice(0, 4096),
                voice: voice || 'nova',
                response_format: 'mp3'
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('OpenAI TTS error:', response.status, err);
            return res.status(response.status).json({ error: 'TTS API error', details: err });
        }

        res.set({
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-cache'
        });

        // Stream the audio response
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
    } catch (err) {
        console.error('TTS server error:', err.message);
        res.status(500).json({ error: 'TTS failed', details: err.message });
    }
});

// ─── Start server ───
app.listen(PORT, () => {
    console.log(`\n  ✅ Learn English server running at http://localhost:${PORT}`);
    console.log(`  🔒 API key: ${OPENAI_API_KEY ? '***' + OPENAI_API_KEY.slice(-6) : 'NOT SET'}`);
    console.log(`  📁 Serving static files from: ${__dirname}\n`);
});
