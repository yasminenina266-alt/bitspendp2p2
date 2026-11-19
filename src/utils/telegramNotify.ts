export async function notifyTelegramEvent(params: {
  type: 'support_247' | 'escrow_message';
  sender: string;
  reference?: string;
  summary?: string;
  text: string;
}): Promise<void> {
  try {
    await fetch('/api/telegram/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
      body: JSON.stringify(params),
    });
  } catch {
    // Non-blocking notification helper
  }
}
