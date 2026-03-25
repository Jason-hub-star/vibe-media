/** BGM audio analysis — WAV/MP3 binary parser with duration validation. */

const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav"];
const MIN_DURATION_MS = 5_000; // 5 seconds
const MAX_DURATION_MS = 300_000; // 5 minutes

export interface BgmAnalysisResult {
  valid: boolean;
  durationMs: number | null;
  bpm: number | null;
  format: string;
  reason?: string;
}

export function analyzeBgm(buffer: Buffer, mimeType: string): BgmAnalysisResult {
  if (!ALLOWED_AUDIO_TYPES.includes(mimeType)) {
    return { valid: false, durationMs: null, bpm: null, format: mimeType, reason: `Unsupported format: ${mimeType}. Allowed: MP3, WAV` };
  }

  if (buffer.length === 0) {
    return { valid: false, durationMs: null, bpm: null, format: mimeType, reason: "Empty file" };
  }

  let durationMs: number | null = null;

  if (mimeType === "audio/wav") {
    durationMs = getWavDuration(buffer);
  } else if (mimeType === "audio/mpeg") {
    durationMs = getMp3Duration(buffer);
  }

  if (durationMs === null) {
    return { valid: false, durationMs: null, bpm: null, format: mimeType, reason: "Could not determine audio duration" };
  }

  if (durationMs < MIN_DURATION_MS) {
    return { valid: false, durationMs, bpm: null, format: mimeType, reason: `Too short: ${(durationMs / 1000).toFixed(1)}s. Minimum: 5s` };
  }

  if (durationMs > MAX_DURATION_MS) {
    return { valid: false, durationMs, bpm: null, format: mimeType, reason: `Too long: ${(durationMs / 1000).toFixed(1)}s. Maximum: 300s` };
  }

  return { valid: true, durationMs, bpm: null, format: mimeType };
}

function getWavDuration(buffer: Buffer): number | null {
  try {
    if (buffer.length < 44) return null;
    const riff = buffer.toString("ascii", 0, 4);
    const wave = buffer.toString("ascii", 8, 12);
    if (riff !== "RIFF" || wave !== "WAVE") return null;

    let offset = 12;
    while (offset < buffer.length - 8) {
      const chunkId = buffer.toString("ascii", offset, offset + 4);
      const chunkSize = buffer.readUInt32LE(offset + 4);

      if (chunkId === "fmt ") {
        const sampleRate = buffer.readUInt32LE(offset + 12);
        const byteRate = buffer.readUInt32LE(offset + 16);
        if (byteRate === 0 || sampleRate === 0) return null;

        let dataOffset = offset + 8 + chunkSize;
        while (dataOffset < buffer.length - 8) {
          const dataChunkId = buffer.toString("ascii", dataOffset, dataOffset + 4);
          const dataChunkSize = buffer.readUInt32LE(dataOffset + 4);
          if (dataChunkId === "data") {
            return Math.round((dataChunkSize / byteRate) * 1000);
          }
          dataOffset += 8 + dataChunkSize;
        }
        return Math.round(((buffer.length - 44) / byteRate) * 1000);
      }
      offset += 8 + chunkSize;
    }
    return null;
  } catch {
    return null;
  }
}

function getMp3Duration(buffer: Buffer): number | null {
  try {
    let offset = 0;

    if (buffer.length > 10 && buffer.toString("ascii", 0, 3) === "ID3") {
      const tagSize =
        ((buffer[6] & 0x7f) << 21) |
        ((buffer[7] & 0x7f) << 14) |
        ((buffer[8] & 0x7f) << 7) |
        (buffer[9] & 0x7f);
      offset = 10 + tagSize;
    }

    while (offset < buffer.length - 4) {
      if (buffer[offset] === 0xff && (buffer[offset + 1] & 0xe0) === 0xe0) {
        const header = buffer.readUInt32BE(offset);
        const bitrateIndex = (header >> 12) & 0x0f;
        const sampleRateIndex = (header >> 10) & 0x03;
        const version = (header >> 19) & 0x03;

        if (bitrateIndex === 0 || bitrateIndex === 15) { offset++; continue; }
        if (sampleRateIndex === 3) { offset++; continue; }

        const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
        let bitrate = bitrates[bitrateIndex];

        if (version !== 3) {
          const bitrates2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
          bitrate = bitrates2[bitrateIndex];
        }

        if (bitrate === 0) { offset++; continue; }

        const audioBytes = buffer.length - offset;
        const durationMs = Math.round((audioBytes * 8) / (bitrate * 1000) * 1000);
        return durationMs;
      }
      offset++;
    }
    return null;
  } catch {
    return null;
  }
}
