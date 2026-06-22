import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

let _currentSound = null;

// Simple in-memory cache: voice+text → base64 mp3
const _cache = new Map();
const MAX_CACHE = 30;

export async function speakAsAgent(text, gender = 'female', { onStart, onEnd } = {}) {
  if (!text?.trim()) return;

  const voice   = gender === 'male' ? 'onyx' : 'nova';
  const cacheKey = `${voice}::${text.trim()}`;

  // Stop any in-progress audio first
  try {
    if (_currentSound) {
      await _currentSound.stopAsync();
      await _currentSound.unloadAsync();
      _currentSound = null;
    }
  } catch {}

  onStart?.();

  try {
    let base64;

    if (_cache.has(cacheKey)) {
      base64 = _cache.get(cacheKey);
    } else {
      const { data, error } = await supabase.functions.invoke('tts-coach', {
        body: { text: text.trim(), voice },
      });
      if (error || !data?.audio) { onEnd?.(); return; }
      base64 = data.audio;

      // Evict oldest entry if cache is full
      if (_cache.size >= MAX_CACHE) {
        _cache.delete(_cache.keys().next().value);
      }
      _cache.set(cacheKey, base64);
    }

    // Write to temp file (expo-av needs a URI, not base64 directly)
    const uri = FileSystem.cacheDirectory + 'ftc_coach_' + Date.now() + '.mp3';
    await FileSystem.writeAsStringAsync(uri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Audio.setAudioModeAsync({
      allowsRecordingIOS:   false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true },
    );
    _currentSound = sound;

    sound.setOnPlaybackStatusUpdate(status => {
      if (status.didJustFinish || status.error) {
        sound.unloadAsync().catch(() => {});
        _currentSound = null;
        onEnd?.();
        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      }
    });

  } catch (e) {
    console.warn('[TTS] speak error:', e?.message || e);
    onEnd?.();
  }
}

export async function stopAgent() {
  try {
    if (_currentSound) {
      await _currentSound.stopAsync();
      await _currentSound.unloadAsync();
      _currentSound = null;
    }
  } catch {}
}

// Pre-built script lines so the agent sounds human
export function buildWorkoutLine(event, payload = {}) {
  const { exerciseName, setNum, totalSets, restSec, muscle, totalTime, doneSets, planName, gender } = payload;
  const agentName = gender === 'male' ? 'Max' : 'Nova';

  switch (event) {
    case 'workout_start':
      return `Hey! I'm ${agentName}, your personal coach. Let's crush ${planName || 'this workout'} together! You've got this!`;

    case 'exercise_intro':
      return `Next up — ${exerciseName}. Targeting ${muscle || 'your muscles'}. Get in position!`;

    case 'set_start': {
      const lines = [
        `Set ${setNum} of ${totalSets}. Let's go, push hard!`,
        `Set ${setNum}. Come on, give me everything!`,
        `Set ${setNum} of ${totalSets}. You've got this!`,
        `Ready? Set ${setNum}. Go!`,
      ];
      return lines[setNum % lines.length];
    }

    case 'set_done': {
      const lines = [
        'Amazing set! Rest up and get ready.',
        'Great work! Take your rest.',
        'Excellent! You crushed it. Rest now.',
        'Solid set! Breathe and recover.',
        'That was powerful! Rest up.',
      ];
      return lines[setNum % lines.length];
    }

    case 'rest_end':
      return `Rest over. Next set starting now — let's go!`;

    case 'last_set':
      return `This is your last set! Leave everything you have on the floor!`;

    case 'workout_done': {
      const mins = totalTime ? Math.round(totalTime / 60) : 0;
      return `Incredible work! You finished ${planName || 'the workout'} — ${doneSets} sets in ${mins} minutes. I'm proud of you!`;
    }

    default:
      return null;
  }
}
