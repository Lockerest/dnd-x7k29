// Test helper: a mono 16-bit WAV tone the browser can decode.
export function wavTone(seconds: number, hz = 220, rate = 8000): Buffer {
  const n = Math.round(rate * seconds)
  const wav = Buffer.alloc(44 + n * 2)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(36 + n * 2, 4)
  wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(rate, 24)
  wav.writeUInt32LE(rate * 2, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(Math.sin((i / rate) * 2 * Math.PI * hz) * 8000), 44 + i * 2)
  return wav
}
