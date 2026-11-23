import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CRC32 Table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

// 5x7 Monospace Bitmap Font
const FONT = {
  'A': [
    0b01110,
    0b10001,
    0b10001,
    0b11111,
    0b10001,
    0b10001,
    0b10001
  ],
  'C': [
    0b01110,
    0b10001,
    0b10000,
    0b10000,
    0b10000,
    0b10001,
    0b01110
  ],
  'D': [
    0b11110,
    0b10001,
    0b10001,
    0b10001,
    0b10001,
    0b10001,
    0b11110
  ],
  'E': [
    0b11111,
    0b10000,
    0b10000,
    0b11110,
    0b10000,
    0b10000,
    0b11111
  ],
  'F': [
    0b11111,
    0b10000,
    0b10000,
    0b11110,
    0b10000,
    0b10000,
    0b10000
  ],
  'G': [
    0b01110,
    0b10001,
    0b10000,
    0b10111,
    0b10001,
    0b10001,
    0b01110
  ],
  'I': [
    0b01110,
    0b00100,
    0b00100,
    0b00100,
    0b00100,
    0b00100,
    0b01110
  ],
  'M': [
    0b10001,
    0b11011,
    0b10101,
    0b10001,
    0b10001,
    0b10001,
    0b10001
  ],
  'Q': [
    0b01110,
    0b10001,
    0b10001,
    0b10001,
    0b10101,
    0b10010,
    0b01101
  ],
  'R': [
    0b11110,
    0b10001,
    0b10001,
    0b11110,
    0b10100,
    0b10010,
    0b10001
  ],
  'S': [
    0b01111,
    0b10000,
    0b10000,
    0b01110,
    0b00001,
    0b00001,
    0b11110
  ],
  'T': [
    0b11111,
    0b00100,
    0b00100,
    0b00100,
    0b00100,
    0b00100,
    0b00100
  ],
  'Z': [
    0b11111,
    0b00001,
    0b00010,
    0b00100,
    0b01000,
    0b10000,
    0b11111
  ],
  '0': [
    0b01110,
    0b10001,
    0b10011,
    0b10101,
    0b11001,
    0b10001,
    0b01110
  ],
  '1': [
    0b00100,
    0b01100,
    0b00100,
    0b00100,
    0b00100,
    0b00100,
    0b01110
  ],
  '2': [
    0b01110,
    0b10001,
    0b00001,
    0b00010,
    0b00100,
    0b01000,
    0b11111
  ],
  '3': [
    0b11110,
    0b00001,
    0b00001,
    0b01110,
    0b00001,
    0b00001,
    0b11110
  ],
  '4': [
    0b10001,
    0b10001,
    0b10001,
    0b11111,
    0b00001,
    0b00001,
    0b00001
  ],
  '5': [
    0b11111,
    0b10000,
    0b10000,
    0b11110,
    0b00001,
    0b00001,
    0b11110
  ],
  '6': [
    0b01110,
    0b10000,
    0b10000,
    0b11110,
    0b10001,
    0b10001,
    0b01110
  ],
  '7': [
    0b11111,
    0b00001,
    0b00010,
    0b00100,
    0b01000,
    0b01000,
    0b01000
  ],
  '8': [
    0b01110,
    0b10001,
    0b10001,
    0b01110,
    0b10001,
    0b10001,
    0b01110
  ],
  '9': [
    0b01110,
    0b10001,
    0b10001,
    0b01111,
    0b00001,
    0b10001,
    0b01110
  ],
  ':': [
    0b00000,
    0b01100,
    0b01100,
    0b00000,
    0b01100,
    0b01100,
    0b00000
  ],
  '-': [
    0b00000,
    0b00000,
    0b00000,
    0b11111,
    0b00000,
    0b00000,
    0b00000
  ],
  '·': [
    0b00000,
    0b00000,
    0b00100,
    0b01110,
    0b00100,
    0b00000,
    0b00000
  ],
  ' ': [
    0b00000,
    0b00000,
    0b00000,
    0b00000,
    0b00000,
    0b00000,
    0b00000
  ]
};

export function generateCameraImage(outputPath, accessDigit = '1') {
  const width = 640;
  const height = 360;

  // Background: #08142c (RGBA: 8, 20, 44, 255)
  // Hidden text: #0d1c38 (RGBA: 13, 28, 56, 255)
  // Decoy text: #4a75a0 (RGBA: 74, 117, 160, 255)
  // Frame lines: #0a1835 (RGBA: 10, 24, 53, 255)

  const raster = Buffer.alloc(height * (1 + width * 4));

  // Initialize raster with background color
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    raster[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      raster[pxOffset] = 8;     // R
      raster[pxOffset + 1] = 20; // G
      raster[pxOffset + 2] = 44; // B
      raster[pxOffset + 3] = 255;// A
    }
  }

  // Draw a pixel
  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const offset = y * (1 + width * 4) + 1 + x * 4;
    raster[offset] = r;
    raster[offset + 1] = g;
    raster[offset + 2] = b;
    raster[offset + 3] = a;
  }

  // Draw bitmap text scaled
  function drawText(str, startX, startY, scale, r, g, b, a = 255) {
    let currX = startX;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i].toUpperCase();
      const glyph = FONT[ch] || FONT[' '];

      for (let row = 0; row < 7; row++) {
        const bits = glyph[row];
        for (let col = 0; col < 5; col++) {
          if ((bits >>> (4 - col)) & 1) {
            for (let dy = 0; dy < scale; dy++) {
              for (let dx = 0; dx < scale; dx++) {
                setPixel(currX + col * scale + dx, startY + row * scale + dy, r, g, b, a);
              }
            }
          }
        }
      }
      currX += (5 + 1) * scale;
    }
  }

  // 1. Draw subtle surveillance crosshairs and guide lines
  for (let x = 30; x < width - 30; x += 4) {
    setPixel(x, 40, 10, 24, 53);
    setPixel(x, height - 40, 10, 24, 53);
  }
  for (let y = 40; y < height - 40; y += 4) {
    setPixel(30, y, 10, 24, 53);
    setPixel(width - 30, y, 10, 24, 53);
  }

  // 2. Draw HIDDEN TEXT in center: "ACCESS DIGIT: <accessDigit>"
  // #0d1c38 -> R: 13, G: 28, B: 56
  // Scaled 4x: (15 chars * 6 * 4) = 360px wide, height = 28px
  const hiddenText = `ACCESS DIGIT: ${accessDigit}`;
  const hiddenScale = 4;
  const hiddenWidth = (hiddenText.length * 6 - 1) * hiddenScale;
  const hiddenX = Math.floor((width - hiddenWidth) / 2);
  const hiddenY = Math.floor((height - 7 * hiddenScale) / 2);
  drawText(hiddenText, hiddenX, hiddenY, hiddenScale, 13, 28, 56);

  // 3. Draw ALWAYS-VISIBLE CORNER LABEL: "CAM-4 · FREQ-ZETA9"
  // Scaled 2x in top-left or bottom-left corner
  drawText('CAM-4 · FREQ-ZETA9', 40, height - 32, 2, 74, 117, 160);

  // Top-right timestamp header
  drawText('REC 08:34:12', width - 160, 22, 2, 180, 50, 60);

  // Compress raster using zlib.deflateSync
  const compressedData = zlib.deflateSync(raster, { level: 9 });

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression: 0
  ihdrData[11] = 0; // Filter: 0
  ihdrData[12] = 0; // Interlace: 0
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const pngBuffer = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`Generated camera feed PNG: ${outputPath} (${pngBuffer.length} bytes, digit: ${accessDigit})`);
  return pngBuffer;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const setDigits = {
    A: '1',
    B: '4',
    C: '2',
    D: '3',
    E: '7'
  };

  const publicDir = path.join(__dirname, '../public/assets/stage4');
  const serverDir = path.join(__dirname, '../server/assets/stage4');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(serverDir)) fs.mkdirSync(serverDir, { recursive: true });

  for (const [set, digit] of Object.entries(setDigits)) {
    const pubFile = path.join(publicDir, `camera_${set}.png`);
    const srvFile = path.join(serverDir, `camera_${set}.png`);
    generateCameraImage(pubFile, digit);
    fs.copyFileSync(pubFile, srvFile);
  }

  // Also default camera.png
  fs.copyFileSync(path.join(publicDir, 'camera_A.png'), path.join(publicDir, 'camera.png'));
  fs.copyFileSync(path.join(serverDir, 'camera_A.png'), path.join(serverDir, 'camera.png'));
}
