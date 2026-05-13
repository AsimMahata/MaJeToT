import { InferenceClient } from '@huggingface/inference';

const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY || '');

interface Delta {
  topicsCompleted: string[];
  topicsUnchecked: string[];
  lectureDeltas: Array<{ section: string; from: number; to: number; total: number }>;
}

export async function generateAIMessage(firstName: string, delta: Delta): Promise<string> {

  const systemPrompt = `You are a Telegram notification bot for a placement prep study group of friends. Your job is to announce what a member just did and playfully shame the others into working harder.

Rules:
- MAX 2 sentences
- Start by listing what they actually did (topics/lectures), then roast the others for slacking
- Use their first name
- Be informal, savage but funny — like a friend roasting you in the group chat
- Use 1-2 emojis
- Do NOT use any thinking tags or reasoning. Output ONLY the final message.
- Example style: "Arjun just finished CPU Scheduling and watched 4 more OS lectures 🔥 Meanwhile y'all are sleeping — get up losers 😤"`;

  const parts: string[] = [];
  if (delta.topicsCompleted.length > 0) {
    parts.push(`finished these topics: ${delta.topicsCompleted.join(', ')}`);
  }
  if (delta.lectureDeltas.length > 0) {
    parts.push(delta.lectureDeltas.map(l => `watched ${l.to - l.from} more ${l.section} lectures (now at ${l.to}/${l.total})`).join(', '));
  }
  if (delta.topicsUnchecked.length > 0) {
    parts.push(`unchecked: ${delta.topicsUnchecked.join(', ')}`);
  }

  const userPrompt = `${firstName} just ${parts.join(' and ')}. Write the notification message.`;

  try {
    const model = process.env.HUGGINGFACE_MODEL || 'Qwen/Qwen3-8B:fireworks-ai';

    const chatCompletion = await client.chatCompletion({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 150,
    });

    const text = chatCompletion.choices?.[0]?.message?.content?.trim() || '';
    // Strip <think>...</think> blocks (complete or incomplete/unclosed)
    const cleaned = text
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/<think>[\s\S]*/g, '')
      .trim();
    return cleaned || getFallbackMessage(firstName, delta);
  } catch (error) {
    console.error('HuggingFace API error:', error);
    return getFallbackMessage(firstName, delta);
  }
}

function getFallbackMessage(firstName: string, delta: Delta): string {
  const messages = [
    `📚 ${firstName} just put in some work! Respect the grind 💪`,
    `🔥 ${firstName} is cooking — someone's not sleeping on placements!`,
    `${firstName} just made progress while you're scrolling. Get moving! 🏃‍♂️`,
    `Another day, another W for ${firstName}. Keep stacking! 📈`,
    `${firstName} said "I'll rest when I'm placed" 😤🔥`,
  ];

  const topicCount = delta.topicsCompleted.length;
  const lectureCount = delta.lectureDeltas.reduce((sum, l) => sum + (l.to - l.from), 0);

  if (topicCount > 3 || lectureCount > 10) {
    return `🚀 ${firstName} just went BEAST MODE — ${topicCount} topics and ${lectureCount} lectures! Absolute menace 🔥`;
  }

  return messages[Math.floor(Math.random() * messages.length)];
}

export function generateCompletionMessage(firstName: string, sectionTitle: string): string {
  return `🎉 ${firstName} just COMPLETED ${sectionTitle}!! Beast mode activated 🔥💯`;
}
