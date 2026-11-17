import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const svg = `
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1e1e"/>
      <stop offset="100%" stop-color="#121212"/>
    </linearGradient>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f0f0f0"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Background circle/square -->
  <rect width="256" height="256" rx="56" fill="url(#bg)"/>
  <rect x="6" y="6" width="244" height="244" rx="50" fill="none" stroke="#eab308" stroke-width="4" stroke-opacity="0.6"/>

  <!-- Card 1 (Back angled) -->
  <rect x="52" y="38" width="120" height="170" rx="14" fill="#2c2c2c" stroke="#555" stroke-width="2" transform="rotate(-12 112 123)" filter="url(#shadow)"/>
  
  <!-- Card 2 (Front main) -->
  <rect x="78" y="42" width="124" height="174" rx="14" fill="url(#cardBg)" stroke="#d4d4d4" stroke-width="2" transform="rotate(8 140 129)" filter="url(#shadow)"/>

  <!-- Card 2 content -->
  <g transform="rotate(8 140 129)">
    <text x="94" y="78" font-family="Arial, sans-serif" font-weight="900" font-size="30" fill="#dc2626">2</text>
    <text x="94" y="104" font-family="Arial, sans-serif" font-weight="900" font-size="24" fill="#dc2626">♥</text>
    
    <path d="M 140 115 C 140 100 120 95 120 115 C 120 135 140 155 140 155 C 140 155 160 135 160 115 C 160 95 140 100 140 115 Z" fill="#dc2626"/>

    <text x="186" y="196" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="#dc2626" transform="rotate(180 186 196)">2</text>
    <text x="186" y="172" font-family="Arial, sans-serif" font-weight="900" font-size="24" fill="#dc2626" transform="rotate(180 186 172)">♥</text>
  </g>

  <!-- Golden TL Badge -->
  <rect x="24" y="186" width="76" height="42" rx="12" fill="#eab308" filter="url(#shadow)"/>
  <text x="62" y="216" font-family="Arial, sans-serif" font-weight="900" font-size="24" fill="#000000" text-anchor="middle">TL</text>
</svg>
`;

async function main() {
  const png256 = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  const png48 = await sharp(Buffer.from(svg)).resize(48, 48).png().toBuffer();
  const png32 = await sharp(Buffer.from(svg)).resize(32, 32).png().toBuffer();
  const png16 = await sharp(Buffer.from(svg)).resize(16, 16).png().toBuffer();

  fs.writeFileSync('app-icon.png', png256);
  fs.writeFileSync('public/app-icon.png', png256);

  // Build multi-size ICO buffer
  const images = [
    { buf: png256, size: 256 },
    { buf: png48, size: 48 },
    { buf: png32, size: 32 },
    { buf: png16, size: 16 },
  ];

  const count = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // icon
  header.writeUInt16LE(count, 4); // count

  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // width
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(img.buf.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += img.buf.length;
  }

  const icoBuffer = Buffer.concat([
    header,
    ...entries,
    ...images.map((img) => img.buf),
  ]);

  fs.writeFileSync('app-icon.ico', icoBuffer);
  fs.writeFileSync('public/favicon.ico', icoBuffer);
  console.log('Icons generated successfully!');
}

main().catch(console.error);
