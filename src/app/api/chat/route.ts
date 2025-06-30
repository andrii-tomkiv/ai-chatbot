import { NextRequest, NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, options = {} } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const model = options.model || 'mistral-small-latest';
    let answer = '';
    let sources: any[] = [];

    if (model.includes('groq') || model.includes('llama')) {
      // Call Groq API
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: messages,
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
        }),
      });

      if (!groqResponse.ok) {
        throw new Error(`Groq API error: ${groqResponse.status}`);
      }

      const groqData = await groqResponse.json();
      answer = groqData.choices[0].message.content;
    } else {
      // Call Mistral API
      const mistralClient = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
      const mistralResponse = await mistralClient.chat.complete({
        model: 'mistral-small-latest',
        messages: messages,
        maxTokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
      });

      const content = mistralResponse.choices[0]?.message?.content;
      answer = Array.isArray(content) ? content.map(c => c.value ?? '').join('') : (content ?? '');
    }

    return NextResponse.json({
      answer: answer,
      sources: sources,
      success: true
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 