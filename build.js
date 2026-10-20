const { execSync } = require('child_process');

console.log('[Build] Bundling content scripts into self-contained bundle...');
try {
  execSync('npx esbuild src/content/content-core.js --bundle --outfile=src/content/content-bundle.js --format=iife', {
    stdio: 'inherit'
  });
  console.log('[Build] ✅ Successfully built src/content/content-bundle.js');
} catch (err) {
  console.error('[Build] ❌ Build failed:', err.message);
  process.exit(1);
}
