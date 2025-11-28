export default async function handler(req, res) {
  try {
    const prompt = req.query.prompt || "Hello";
    
    const response = await fetch("https://api.cocos.si/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet",
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();

    res.status(200).json({
      success: true,
      model: "claude-3.5-sonnet",
      response: data.choices?.[0]?.message?.content || "No response."
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
