import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const { image, eventCode, eventName, chapter } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // image should be a base64 data URL like "data:image/png;base64,..."
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid image format. Expected base64 data URL." },
        { status: 400 }
      );
    }

    const mediaType = match[1] as "image/png" | "image/jpeg" | "image/gif" | "image/webp";
    const base64Data = match[2];

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: "text",
              text: `You are parsing a Golf Genius screenshot showing event results/payouts for The Golf Fellowship.
${eventCode ? `Event code: ${eventCode}` : ""}
${eventName ? `Event/course name: ${eventName}` : ""}
${chapter ? `Chapter: ${chapter}` : ""}

Extract ALL payout/winning information from this screenshot. For each winner, identify:
1. Player name (first and last)
2. Category of win: one of "team_net", "individual_net", "individual_gross", "skins", "closest_to_pin", "hole_in_one", or "other"
3. Dollar amount won (just the number)
4. Any description of what they won (e.g. "1st place team net", "skin on hole #7")

Also extract:
- Event name/course name if visible
- Event date if visible
- Event code if visible (format like "s9.4")

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "event": {
    "code": "s9.4",
    "name": "The Quarry",
    "date": "2026-04-07",
    "course": "The Quarry Golf Club"
  },
  "payouts": [
    {
      "golferName": "John Smith",
      "category": "team_net",
      "amount": 25.00,
      "description": "1st place team net"
    }
  ]
}

If you can't determine a field, use null. Parse ALL payouts visible in the image.`,
            },
          ],
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse the JSON response
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Screenshot parsing failed:", err);
    const errorMessage =
      err instanceof SyntaxError
        ? "Failed to parse AI response as JSON"
        : "Failed to process screenshot";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
