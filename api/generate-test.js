export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
}
