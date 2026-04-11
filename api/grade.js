export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
}
