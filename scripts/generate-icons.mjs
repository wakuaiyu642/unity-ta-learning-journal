import { mkdir } from "node:fs/promises";
import sharp from "sharp";

await mkdir("public", { recursive: true });

const svg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#123f3a"/>
  <circle cx="394" cy="118" r="42" fill="#d9ff83"/>
  <path d="M112 154h288v74H286v198h-76V228H112z" fill="#f6f2e9"/>
  <path d="M334 228h42v82h-42zM176 386h76v42h-76z" fill="#58c4a6"/>
  <path d="M84 92h84v14H98v70H84zM344 428h84v-84h14v98h-98z" fill="#a5c9c2" opacity=".55"/>
</svg>`);

for (const size of [192, 512]) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`public/pwa-${size}x${size}.png`);
}

await sharp(svg)
  .resize(180, 180)
  .png()
  .toFile("public/apple-touch-icon.png");

console.log("Generated PWA icons.");
