export const formatTime = (ms: number): string => {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const getActualRemainingTime = (timerState: import('../storage/models').TimerState): number => {
  if (timerState.phase === 'IDLE') return timerState.remainingDuration;
  if (timerState.pausedTime) return timerState.remainingDuration;
  
  if (timerState.startTime) {
    const elapsed = Date.now() - timerState.startTime;
    return Math.max(0, timerState.remainingDuration - elapsed);
  }
  
  return timerState.remainingDuration;
};
