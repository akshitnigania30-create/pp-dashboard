{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 export default async (request) => \{\
  if (request.method === 'OPTIONS') \{\
    return new Response(null, \{\
      headers: \{\
        'Access-Control-Allow-Origin': '*',\
        'Access-Control-Allow-Methods': 'POST, OPTIONS',\
        'Access-Control-Allow-Headers': 'Content-Type'\
      \}\
    \})\
  \}\
\
  const apiKey = Netlify.env.get('GEMINI_API_KEY')\
  if (!apiKey) \{\
    return new Response(JSON.stringify(\{ error: 'GEMINI_API_KEY not set' \}), \{\
      status: 500,\
      headers: \{ 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' \}\
    \})\
  \}\
\
  try \{\
    const body = await request.json()\
    const messages = body.messages || []\
    const systemPrompt = body.system || ''\
\
    const parts = []\
    if (systemPrompt) parts.push(\{ text: systemPrompt \})\
\
    for (const msg of messages) \{\
      if (Array.isArray(msg.content)) \{\
        for (const block of msg.content) \{\
          if (block.type === 'text') parts.push(\{ text: block.text \})\
          else if (block.type === 'image') parts.push(\{\
            inlineData: \{ mimeType: block.source.media_type, data: block.source.data \}\
          \})\
        \}\
      \} else \{\
        parts.push(\{ text: msg.content \})\
      \}\
    \}\
\
    const geminiBody = \{\
      contents: [\{ role: 'user', parts \}],\
      generationConfig: \{ maxOutputTokens: 4000, temperature: 0.1 \}\
    \}\
\
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$\{apiKey\}`\
    const response = await fetch(url, \{\
      method: 'POST',\
      headers: \{ 'Content-Type': 'application/json' \},\
      body: JSON.stringify(geminiBody)\
    \})\
\
    const data = await response.json()\
    if (!response.ok) \{\
      return new Response(JSON.stringify(data), \{\
        status: response.status,\
        headers: \{ 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' \}\
      \})\
    \}\
\
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''\
    return new Response(JSON.stringify(\{ content: [\{ type: 'text', text \}] \}), \{\
      headers: \{ 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' \}\
    \})\
\
  \} catch (err) \{\
    return new Response(JSON.stringify(\{ error: err.message \}), \{\
      status: 500,\
      headers: \{ 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' \}\
    \})\
  \}\
\}\
\
export const config = \{ path: '/api/analyze' \}}