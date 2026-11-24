export type TelegramEventType =
  | 'support_ticket'
  | 'support_247'
  | 'escrow_message'
  | 'trade_opened'
  | 'trade_status'
  | 'user_registered'
  | 'site_visit'
  | 'offer_created'
  | 'offer_clicked'
  | 'deposit_clicked';

export interface TelegramNotifyField {
  name: string;
  value: string;
}

export interface TelegramNotifyParams {
  type: TelegramEventType;
  sender?: string;
  reference?: string;
  summary?: string;
  text?: string;
  title?: string;
  fields?: TelegramNotifyField[];
  meta?: {
    path?: string;
    referrer?: string;
    language?: string;
    timezone?: string;
    screen?: string;
    host?: string;
  };
}

export function getClientVisitContext(): TelegramNotifyParams['meta'] {
  if (typeof window === 'undefined') return undefined;
  let timezone = '';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    timezone = '';
  }
  const path = `${window.location.pathname || '/'}${window.location.search || ''}`.slice(0, 180);
  const referrer = (document.referrer || '').slice(0, 200);
  const language = (navigator.language || '').slice(0, 32);
  const screen =
    typeof window.screen !== 'undefined'
      ? `${window.screen.width}x${window.screen.height}`
      : '';
  const host = (window.location.host || '').slice(0, 100);

  return {
    path,
    ...(referrer ? { referrer } : {}),
    ...(language ? { language } : {}),
    ...(timezone ? { timezone } : {}),
    ...(screen ? { screen } : {}),
    ...(host ? { host } : {}),
  };
}

export async function notifyTelegramEvent(params: TelegramNotifyParams): Promise<void> {
  try {
    const payload: TelegramNotifyParams = {
      ...params,
      meta: params.meta ?? getClientVisitContext(),
    };
    await fetch('/api/telegram/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking notification helper
  }
}
