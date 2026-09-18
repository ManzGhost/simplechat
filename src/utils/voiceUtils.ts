/**
 * Utilities for encoding, parsing, and formatting voice messages
 */

export interface VoiceMessageData {
  type: 'voice';
  audioUrl: string;
  duration: number; // in seconds
  waveform?: number[]; // normalized heights 0.1 to 1.0
}

export function generateFallbackWaveform(count = 28): number[] {
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    // Generate organic-looking speech pattern
    const sin1 = Math.sin((i / count) * Math.PI * 3);
    const sin2 = Math.sin((i / count) * Math.PI * 5 + 1);
    const val = 0.25 + Math.abs(sin1 * 0.45 + sin2 * 0.3);
    bars.push(Math.min(1, Math.max(0.15, Number(val.toFixed(2)))));
  }
  return bars;
}

export function encodeVoiceMessage(
  audioUrl: string,
  durationSeconds: number,
  waveform?: number[]
): string {
  const data: VoiceMessageData = {
    type: 'voice',
    audioUrl,
    duration: Math.max(1, Math.round(durationSeconds)),
    waveform: waveform && waveform.length > 0 ? waveform : generateFallbackWaveform(),
  };
  return JSON.stringify(data);
}

export function parseVoiceMessage(content: string): VoiceMessageData | null {
  if (!content) return null;

  const trimmed = content.trim();

  // 1. JSON encoded voice message
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && (parsed.type === 'voice' || parsed.audioUrl)) {
        return {
          type: 'voice',
          audioUrl: parsed.audioUrl,
          duration: typeof parsed.duration === 'number' ? parsed.duration : 0,
          waveform: Array.isArray(parsed.waveform) && parsed.waveform.length > 0
            ? parsed.waveform
            : generateFallbackWaveform(),
        };
      }
    } catch {
      // not JSON
    }
  }

  // 2. Direct data URL
  if (trimmed.startsWith('data:audio/')) {
    return {
      type: 'voice',
      audioUrl: trimmed,
      duration: 0,
      waveform: generateFallbackWaveform(),
    };
  }

  return null;
}

export function isVoiceMessage(content: string, messageType?: string): boolean {
  if (messageType === 'VOICE') return true;
  if (!content) return false;
  const trimmed = content.trim();
  if (trimmed.startsWith('data:audio/')) return true;
  if (trimmed.startsWith('{"type":"voice"') || trimmed.startsWith('{"audioUrl"')) return true;
  return false;
}

export function formatAudioDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
