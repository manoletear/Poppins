/**
 * Cloudflare Workers compatibility patches applied after npm install.
 *
 * 1. pdfkit.js → pdfkit.browser.js  (removes blake3-wasm WebAssembly from pdfkit)
 * 2. blake3_js.js (nodejs) → CF-safe stub  (prevents WebAssembly.Module crash at
 *    module-load time in case anything else in the bundle imports blake3-wasm)
 */
const fs = require('fs');
const path = require('path');

// --- 1. Replace pdfkit node build with browser build ---
const pdfkitDir = path.join(__dirname, '..', 'node_modules', '@react-pdf', 'pdfkit', 'lib');
fs.copyFileSync(
  path.join(pdfkitDir, 'pdfkit.browser.js'),
  path.join(pdfkitDir, 'pdfkit.js'),
);
console.log('[cf-patch] pdfkit.js ← pdfkit.browser.js');

// --- 2. Stub blake3-wasm nodejs WASM loader ---
const blake3NodejsDir = path.join(
  __dirname, '..', 'node_modules', 'blake3-wasm', 'dist', 'wasm', 'nodejs',
);
const blake3Stub = `\
// CF Workers stub — pdfkit.browser.js uses noble-hashes, not blake3.
// This stub prevents the WebAssembly.Module() call from crashing CF Workers
// in case esbuild includes this file via static require() analysis.
'use strict';
function notSupported() { throw new Error('blake3-wasm not supported in CF Workers'); }
module.exports.hash = notSupported;
module.exports.create_hasher = notSupported;
module.exports.create_keyed = notSupported;
module.exports.create_derive = notSupported;
module.exports.Blake3Hash = class Blake3Hash {};
module.exports.HashReader = class HashReader {};
module.exports.__wbindgen_throw = notSupported;
module.exports.__wasm = null;
`;
fs.writeFileSync(path.join(blake3NodejsDir, 'blake3_js.js'), blake3Stub);
console.log('[cf-patch] blake3-wasm/dist/wasm/nodejs/blake3_js.js → CF stub');
