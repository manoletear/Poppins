/**
 * Post-build patch for Cloudflare Workers WASM compatibility.
 *
 * After `opennextjs-cloudflare build`, prepends a static yoga.wasm import to worker.js.
 * Wrangler then bundles it as a CompiledWasm module (pre-compiled WebAssembly.Module).
 * At runtime, globalThis.__YOGA_WASM__ is set before any app code runs, so the
 * instantiateWasm hook in yoga-layout/dist/src/index.js (patched by cf-patch.js) can use it.
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const workerPath = path.join(rootDir, '.open-next', 'worker.js');
const yogaWasmSrc = path.join(rootDir, 'yoga.wasm');
const yogaWasmDst = path.join(rootDir, '.open-next', 'yoga.wasm');

// Copy yoga.wasm to .open-next/ so the relative import in worker.js resolves correctly
fs.copyFileSync(yogaWasmSrc, yogaWasmDst);
console.log('[cf-post-build] yoga.wasm → .open-next/yoga.wasm');

// Prepend static import + globalThis assignment to worker.js
const workerContent = fs.readFileSync(workerPath, 'utf-8');
if (workerContent.includes('__YOGA_WASM__')) {
  console.log('[cf-post-build] worker.js already patched, skipping');
  process.exit(0);
}

const patch = `import __YOGA_WASM__ from './yoga.wasm';
globalThis.__YOGA_WASM__ = __YOGA_WASM__;
`;
fs.writeFileSync(workerPath, patch + workerContent);
console.log('[cf-post-build] Prepended YOGA_WASM import to worker.js');
