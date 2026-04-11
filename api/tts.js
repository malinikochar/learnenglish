export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

        const arrayBuffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(Buffer.from(arrayBuffer));
    } catch (err) {
        console.error('TTS server error:', err.message);
        res.status(500).json({ error: 'TTS failed', details: err.message });
    }
}
