chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PLAY_AUDIO') {
    playChime();
  }
});

function playChime() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sine';
  // A pleasant notification chime (double beep)
  
  // First beep
  osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  
  // Second beep
  osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2); // E5
  gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.25);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.8);
}
