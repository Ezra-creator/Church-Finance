const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distAppDir = path.join(rootDir, 'dist', 'win-unpacked', 'resources', 'app');
const distRoot = path.join(rootDir, 'dist', 'win-unpacked');

console.log('Running post-package desktop preparations...');

// 1. Copy .env to dist root and resources/app
const envSrc = path.join(rootDir, '.env');
if (fs.existsSync(envSrc)) {
  fs.copyFileSync(envSrc, path.join(distRoot, '.env'));
  fs.copyFileSync(envSrc, path.join(distAppDir, '.env'));
  console.log('✔ Copied .env to executable directory');
}

// 2. Find and copy .prisma generated client
const pnpmDir = path.join(rootDir, 'node_modules', '.pnpm');
if (fs.existsSync(pnpmDir)) {
  const entries = fs.readdirSync(pnpmDir);
  const prismaClientEntry = entries.find(e => e.startsWith('@prisma+client@'));
  if (prismaClientEntry) {
    const prismaSrc = path.join(pnpmDir, prismaClientEntry, 'node_modules', '.prisma');
    const prismaDest = path.join(distAppDir, 'node_modules', '.prisma');
    if (fs.existsSync(prismaSrc)) {
      fs.cpSync(prismaSrc, prismaDest, { recursive: true, force: true });
      console.log('✔ Copied .prisma client to packaged node_modules');
    }
  }
}

console.log('Desktop preparation complete!');

