import { TimerPhase } from '../storage/models';
import { getAppData, updateTimerState, addFocusSession, getTodayDateString, updateDailyStats } from '../storage/storage';
import { showNotification } from '../notifications/notifications';

const TIMER_ALARM_NAME = 'pomodoro-timer-alarm';
const BADGE_ALARM_NAME = 'pomodoro-badge-alarm';

const updateBadge = async (remainingMs: number, isRunning: boolean) => {
  if (remainingMs > 0 && isRunning) {
    const mins = Math.ceil(remainingMs / 60000);
    await chrome.action.setBadgeText({ text: mins.toString() });
    await chrome.action.setBadgeBackgroundColor({ color: '#D4AF37' });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
};

const playAudioCue = async () => {
  try {
    const hasDocument = await chrome.offscreen.hasDocument();
    if (!hasDocument) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
        justification: 'Play timer completion chime'
      });
    }
    chrome.runtime.sendMessage({ type: 'PLAY_AUDIO' });
  } catch (e) {
    console.error('Audio cue failed', e);
  }
};

const openPopupTab = () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
};

export const startTimer = async (): Promise<void> => {
  const data = await getAppData();
  const { timerState, settings } = data;

  if (timerState.phase === 'IDLE') {
    // Start a new focus session
    const duration = settings.focusDuration;
    await updateTimerState({
      phase: 'FOCUS',
      startTime: Date.now(),
      pausedTime: null,
      remainingDuration: duration,
      initialDuration: duration
    });
    chrome.alarms.create(TIMER_ALARM_NAME, { when: Date.now() + duration });
    chrome.alarms.create(BADGE_ALARM_NAME, { periodInMinutes: 1 });
    await updateBadge(duration, true);
  } else if (timerState.pausedTime) {
    // Resume
    await resumeTimer();
  }
};

export const pauseTimer = async (): Promise<void> => {
  const data = await getAppData();
  const { timerState } = data;

  if (timerState.phase === 'IDLE' || timerState.pausedTime) return;

  const now = Date.now();
  const elapsed = now - (timerState.startTime || now);
  const remaining = Math.max(0, timerState.remainingDuration - elapsed);

  await chrome.alarms.clear(TIMER_ALARM_NAME);
  await chrome.alarms.clear(BADGE_ALARM_NAME);
  await updateBadge(0, false);
  
  await updateTimerState({
    pausedTime: now,
    remainingDuration: remaining,
  });
};

export const resumeTimer = async (): Promise<void> => {
  const data = await getAppData();
  const { timerState } = data;

  if (timerState.phase === 'IDLE' || !timerState.pausedTime) return;

  await updateTimerState({
    startTime: Date.now(),
    pausedTime: null,
  });

  chrome.alarms.create(TIMER_ALARM_NAME, { when: Date.now() + timerState.remainingDuration });
  chrome.alarms.create(BADGE_ALARM_NAME, { periodInMinutes: 1 });
  await updateBadge(timerState.remainingDuration, true);
};

export const stopTimer = async (): Promise<void> => {
  const data = await getAppData();
  const { timerState } = data;

  if (timerState.phase !== 'IDLE') {
    await chrome.alarms.clear(TIMER_ALARM_NAME);
    await chrome.alarms.clear(BADGE_ALARM_NAME);
    await updateBadge(0, false);

    // Save as interrupted if it was a FOCUS session
    if (timerState.phase === 'FOCUS') {
      const actualDuration = timerState.initialDuration - timerState.remainingDuration;
      if (actualDuration > 60000) { // Only save if more than 1 minute
        await addFocusSession({
          id: Date.now().toString(),
          startTime: timerState.startTime || (Date.now() - actualDuration),
          endTime: Date.now(),
          plannedDuration: timerState.initialDuration,
          actualDuration,
          type: 'FOCUS',
          completed: false
        });
        
        await updateDailyStats(getTodayDateString(), {
          focusedTime: actualDuration
        });
      }
    }

    await updateTimerState({
      phase: 'IDLE',
      startTime: null,
      pausedTime: null,
      remainingDuration: data.settings.focusDuration,
      initialDuration: data.settings.focusDuration
    });
  }
};

export const handleAlarm = async (alarm: chrome.alarms.Alarm): Promise<void> => {
  if (alarm.name === BADGE_ALARM_NAME) {
    const data = await getAppData();
    if (data.timerState.phase !== 'IDLE' && !data.timerState.pausedTime) {
      const now = Date.now();
      const elapsed = now - (data.timerState.startTime || now);
      const remaining = Math.max(0, data.timerState.remainingDuration - elapsed);
      await updateBadge(remaining, true);
    }
    return;
  }

  if (alarm.name !== TIMER_ALARM_NAME) return;

  const data = await getAppData();
  const { timerState, settings } = data;

  if (timerState.phase === 'IDLE') return;

  const now = Date.now();
  
  if (timerState.phase === 'FOCUS') {
    // Focus complete
    const completedSessions = timerState.completedFocusSessions + 1;
    
    await addFocusSession({
      id: now.toString(),
      startTime: timerState.startTime || (now - timerState.initialDuration),
      endTime: now,
      plannedDuration: timerState.initialDuration,
      actualDuration: timerState.initialDuration,
      type: 'FOCUS',
      completed: true
    });

    await updateDailyStats(getTodayDateString(), {
      focusedTime: timerState.initialDuration,
      completedSessions: 1
    });

    showNotification('Focus Complete', 'Great job! Time for a break.');
    playAudioCue();

    const needsLongBreak = completedSessions % settings.longBreakInterval === 0;
    const nextPhase: TimerPhase = needsLongBreak ? 'LONG_BREAK' : 'SHORT_BREAK';
    const nextDuration = needsLongBreak ? settings.longBreakDuration : settings.shortBreakDuration;

    if (settings.autoStartBreaks) {
      await updateTimerState({
        phase: nextPhase,
        startTime: now,
        pausedTime: null,
        remainingDuration: nextDuration,
        initialDuration: nextDuration,
        completedFocusSessions: completedSessions
      });
      chrome.alarms.create(TIMER_ALARM_NAME, { when: now + nextDuration });
      chrome.alarms.create(BADGE_ALARM_NAME, { periodInMinutes: 1 });
    } else {
      await updateTimerState({
        phase: nextPhase,
        startTime: null,
        pausedTime: now, // Wait for user to start it
        remainingDuration: nextDuration,
        initialDuration: nextDuration,
        completedFocusSessions: completedSessions
      });
      openPopupTab(); // Focus ended, user must choose to start break
    }

  } else if (timerState.phase === 'SHORT_BREAK' || timerState.phase === 'LONG_BREAK') {
    // Break complete
    showNotification('Break Complete', 'Time to focus!');
    playAudioCue();
    
    const nextDuration = settings.focusDuration;
    
    if (settings.autoStartFocus) {
      await updateTimerState({
        phase: 'FOCUS',
        startTime: now,
        pausedTime: null,
        remainingDuration: nextDuration,
        initialDuration: nextDuration
      });
      chrome.alarms.create(TIMER_ALARM_NAME, { when: now + nextDuration });
      chrome.alarms.create(BADGE_ALARM_NAME, { periodInMinutes: 1 });
    } else {
      await updateTimerState({
        phase: 'IDLE',
        startTime: null,
        pausedTime: null,
        remainingDuration: nextDuration,
        initialDuration: nextDuration
      });
      openPopupTab(); // Break ended, timer is idle — open popup so user can start next session
    }
  }
};

export const skipPhase = async (): Promise<void> => {
  const data = await getAppData();
  if (data.timerState.phase !== 'IDLE') {
    await chrome.alarms.clear(TIMER_ALARM_NAME);
    await chrome.alarms.clear(BADGE_ALARM_NAME);
    await handleAlarm({ name: TIMER_ALARM_NAME } as chrome.alarms.Alarm); // Fake alarm trigger
  }
};
