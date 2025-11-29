// api/index.js - Main API endpoint for Vercel
const fetch = require('node-fetch');

// Free API endpoints (no keys required)
const APIS = {
  gpt4: 'https://api.guruapi.tech/ai/gpt4',
  claude: 'https://api.guruapi.tech/ai/claude',
  gemini: 'https://api.guruapi.tech/ai/gemini',
  llama: 'https://api.guruapi.tech/ai/llama',
  imageGen: 'https://api.guruapi.tech/ai/image'
};

// Fallback APIs
const FALLBACK = {
  chat: [
    'https://widipe.com/openai',
    'https://api.freeaiapi.xyz/v1/chat/completions'
  ],
  image: [
    'https://api.freeaiapi.xyz/v1/images/generations'
  ]
};

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { prompt, model = 'gpt4', action = 'chat', history = [] } = 
      req.method === 'GET' ? req.query : req.body;

    if (!prompt && action === 'chat') {
      return res.status(400).json({ 
        error: 'Prompt required', 
        usage: 'GET /?prompt=your_question&model=gpt4|claude|gemini|llama' 
      });
    }

    // Image generation
    if (action === 'image') {
      return await handleImageGen(prompt, res);
    }

    // Chat/Text generation
    return await handleChat(prompt, model, history, res);

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
};

// Handle chat requests
async function handleChat(prompt, model, history, res) {
  const selectedModel = model.toLowerCase();
  
  try {
    // Try primary API
    let response = await callChatAPI(prompt, selectedModel, history);
    
    if (response) {
      return res.status(200).json({
        success: true,
        model: selectedModel,
        response: response,
        timestamp: new Date().toISOString()
      });
    }

    // Try fallback APIs
    for (const fallbackUrl of FALLBACK.chat) {
      response = await callFallbackChat(prompt, fallbackUrl, history);
      if (response) {
        return res.status(200).json({
          success: true,
          model: 'fallback',
          response: response,
          timestamp: new Date().toISOString()
        });
      }
    }

    throw new Error('All APIs failed');

  } catch (error) {
    return res.status(500).json({ 
      error: 'Chat generation failed', 
      message: error.message 
    });
  }
}

// Handle image generation
async function handleImageGen(prompt, res) {
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required for image generation' });
  }

  try {
    // Try Pollinations AI (free, no key required)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
    
    return res.status(200).json({
      success: true,
      model: 'pollinations-ai',
      imageUrl: imageUrl,
      prompt: prompt,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Fallback to another service
    try {
      const response = await fetch('https://api.freeaiapi.xyz/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          n: 1,
          size: '1024x1024'
        })
      });

      const data = await response.json();
      
      return res.status(200).json({
        success: true,
        model: 'dalle-free',
        imageUrl: data.data?.[0]?.url || null,
        prompt: prompt,
        timestamp: new Date().toISOString()
      });

    } catch (fallbackError) {
      return res.status(500).json({ 
        error: 'Image generation failed', 
        message: fallbackError.message 
      });
    }
  }
}

// Call primary chat API
async function callChatAPI(prompt, model, history) {
  const apiUrl = APIS[model] || APIS.gpt4;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: prompt,
        history: history || []
      }),
      timeout: 30000
    });

    if (!response.ok) throw new Error('API request failed');

    const data = await response.json();
    return data.response || data.answer || data.result || null;

  } catch (error) {
    console.error(`${model} API failed:`, error.message);
    return null;
  }
}

// Call fallback chat API
async function callFallbackChat(prompt, apiUrl, history) {
  try {
    const messages = [
      ...(history || []),
      { role: 'user', content: prompt }
    ];

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        stream: false
      }),
      timeout: 30000
    });

    if (!response.ok) throw new Error('Fallback API failed');

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;

  } catch (error) {
    console.error('Fallback API error:', error.message);
    return null;
  }
}
