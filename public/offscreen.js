chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PLAY_SOUND') {
    const sound = msg.sound || 'bell';
    switch (sound) {
      case 'chime':  playChime();  break;
      case 'forest': playForest(); break;
      case 'bell':
      default:       playBell();   break;
    }
  }
});

// Shared audio context
let ctx = null;
function getCtx() {
  if (!ctx || ctx.state === 'closed') {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return ctx;
}

// Bell: clean single tone with decay
function playBell() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, c.currentTime);          // A5
  osc.frequency.exponentialRampToValueAtTime(440, c.currentTime + 1.2);
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.35, c.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.4);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 1.4);
}

// Chime: pleasant two-tone (same as original PLAY_AUDIO)
function playChime() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523.25, c.currentTime);       // C5
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, c.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.2);
  osc.frequency.setValueAtTime(659.25, c.currentTime + 0.2); // E5
  gain.gain.linearRampToValueAtTime(0.4, c.currentTime + 0.25);
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.8);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.8);
}

// Forest: soft three-note descending cascade
function playForest() {
  const c = getCtx();
  const notes = [392, 330, 262]; // G4, E4, C4
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    const t = c.currentTime + i * 0.18;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.start(t);
    osc.stop(t + 0.55);
  });
}
