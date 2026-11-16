const DISCORD_WEBHOOK_URL =
  'https://discord.com/api/webhooks/1571371577386205294/ApQmtB4Jicgj0yokk2L83gS2-noqSr1Gbu18sgf3ePERPRd9zyeqdySHiTqY5X5_3KeP';

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export async function notifyDiscordEvent(params: {
  title: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
}): Promise<void> {
  try {
    const payload = {
      username: 'OOSAB',
      embeds: [
        {
          title: params.title,
          description: params.description,
          color: params.color ?? 0x0b3b2e,
          fields: (params.fields ?? []).map((f) => ({
            name: f.name,
            value: f.value || '—',
            inline: f.inline ?? true,
          })),
          footer: {
            text: typeof window !== 'undefined' ? window.location.host : 'OOSAB',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking telemetry: ignore webhook network errors
  }
}
