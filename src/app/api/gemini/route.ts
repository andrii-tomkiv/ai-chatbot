import { Mistral } from "@mistralai/mistralai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    console.log('prompt =>>>', prompt);
  

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Debug: Check if API key is available
    const apiKey = process.env.MISTRAL_API_KEY;
    console.log('Mistral API Key available:', !!apiKey);
    console.log('API Key length:', apiKey?.length || 0);
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "MISTRAL_API_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        
        // const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent', {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'X-goog-api-key': apiKey,
        //   },
        //   body: JSON.stringify({
        //     contents: [
        //       {
        //         parts: [
        //           {
        //             text: prompt
        //           }
        //         ]
        //       }
        //     ],
        //     generationConfig: {
        //       temperature: 0.1,
        //       topK: 1,
        //       topP: 0.8,
        //       maxOutputTokens: 1024,
        //       responseMimeType: "application/json"
        //     }
        //   })
        // });

        const client = new Mistral({apiKey: apiKey});
        const response = await client.chat.complete({
          model: 'mistral-medium-2505',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        });
        
        // if (response.ok) {
        if (response) {
          // const data = await response.json();
          // const generatedText = data.candidates[0]?.content?.parts[0]?.text;
          const generatedText = response.choices[0].message.content;
          
          if (!generatedText) {
            return NextResponse.json(
              { error: 'No response from Gemini API' },
              { status: 500 }
            );
          }

          return NextResponse.json({
            result: generatedText,
            success: true,
          });
        }

        // Handle rate limiting
        // if (response.status === 429) {
        //   const retryAfter = response.headers.get('retry-after') || Math.pow(2, attempt) * 5; // Exponential backoff
        //   console.log(`Rate limited, attempt ${attempt}/3. Waiting ${retryAfter}s...`);
          
        //   if (attempt < 3) {
        //     await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter.toString()) * 1000));
        //     continue;
        //   }
        // }

        // Store error for final attempt
        // const errorData = await response.json().catch(() => ({}));
        // lastError = { status: response.status, data: errorData };
        
        // if (attempt < 3 && (response.status >= 500 || response.status === 429)) {
        //   console.log(`Attempt ${attempt} failed, retrying...`);
        //   await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Progressive delay
        //   continue;
        // }

        break;

      } catch (fetchError) {
        console.error(`Attempt ${attempt} failed:`, fetchError);
        lastError = { error: fetchError instanceof Error ? fetchError.message : 'Network error' };
        
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
      }
    }

    // If we get here, all attempts failed
    console.error('All Gemini API attempts failed:', lastError);
    
    // if (lastError?.status) {
    //   return NextResponse.json(
    //     { error: `Gemini API error: ${lastError.status}`, details: lastError.data },
    //     { status: lastError.status }
    //   );
    // } else {
    //   return NextResponse.json(
    //     { error: 'Gemini API request failed', details: lastError },
    //     { status: 500 }
    //   );
    // }

  } catch (error) {
    console.error('Gemini API route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 