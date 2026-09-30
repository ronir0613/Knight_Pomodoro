import { UserSettings } from '../storage/models';

// ─── Notification IDs — fixed per transition type, so Chrome replaces not stacks ─

const NOTIF_ID: Record<'focus-done' | 'break-done', string> = {
  'focus-done': 'kp-focus-done',
  'break-done': 'kp-break-done',
};

const NOTIF_CONTENT: Record<'focus-done' | 'break-done', { title: string; message: string }> = {
  'focus-done': {
    title: 'Focus session done',
    message: 'Nice work — time to take a break.',
  },
  'break-done': {
    title: 'Break over',
    message: 'Ready to focus? Hit Start whenever you are.',
  },
};

export const notify = (
  type: 'focus-done' | 'break-done',
  settings: UserSettings
): void => {
  if (!settings.desktopNotifications) return;

  const { title, message } = NOTIF_CONTENT[type];
  const id = NOTIF_ID[type];

  // Using the same ID replaces any existing notification of the same type (no stacking)
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon-128.png'),
    title,
    message,
    priority: 2,
    requireInteraction: false,
  });
};

// ─── Sound via offscreen document ─────────────────────────────────────────────

const sendSound = async (sound: UserSettings['soundChoice']): Promise<void> => {
  try {
    const hasDocument = await chrome.offscreen.hasDocument();
    if (!hasDocument) {
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('offscreen.html'),
        reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
        justification: 'Play Pomodoro completion chime',
      });
    }
    const response = await chrome.runtime.sendMessage({
      type: 'PLAY_SOUND',
      sound,
    });
    if (response?.ok === false) throw new Error(response.error || 'Offscreen audio playback failed');
  } catch (e) {
    console.warn('[KP] Sound playback failed:', e);
    throw e;
  }
};

export const playSound = async (settings: UserSettings): Promise<void> => {
  if (!settings.soundEnabled) return;
  try {
    await sendSound(settings.soundChoice);
  } catch {
    // Keep timer transitions running if audio is unavailable.
  }
};

export const previewSound = async (sound: UserSettings['soundChoice']): Promise<void> => {
  await sendSound(sound);
};
