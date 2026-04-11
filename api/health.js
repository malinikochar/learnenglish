export default function handler(req, res) {
    res.json({ status: 'ok', hasKey: !!process.env.OPENAI_API_KEY });
}
