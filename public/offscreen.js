chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'PLAY_SOUND') return;

  const sound = msg.sound || 'bell';
  let playback;
  switch (sound) {
    case 'chime':  playback = playChime();  break;
    case 'forest': playback = playForest(); break;
    case 'bell':
    default:       playback = playBell();   break;
  }

  Promise.resolve(playback).then(
    () => sendResponse({ ok: true }),
    (error) => {
      console.warn('[KP] Could not play timer sound:', error);
      sendResponse({ ok: false, error: 'Could not play the selected timer sound' });
    },
  );
  return true;
});

// Shared audio context
let ctx = null;
function getCtx() {
  if (!ctx || ctx.state === 'closed') {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return ctx;
}

let activeBell = null;

// Bell Arpeggio 24: a calm vibraphone bell with a short echo, bundled under CC0.
function playBell() {
  const audio = new Audio(chrome.runtime.getURL('timer-chime.wav'));
  audio.preload = 'auto';
  audio.volume = 0.85;
  activeBell = audio;
  audio.addEventListener('ended', () => { activeBell = null; }, { once: true });
  return audio.play();
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
