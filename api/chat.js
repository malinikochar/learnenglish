export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
}
