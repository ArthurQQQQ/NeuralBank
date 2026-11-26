import test from 'node:test';
import assert from 'node:assert/strict';
import { validateModuleImports } from '../scripts/validate-module-imports.mjs';

test('module packaging checks real imports and accepts quoted SDK diagnostics', () => {
  assert.doesNotThrow(() => validateModuleImports({
    '/app.js': { body: "import {value} from './vendor.js';\nexport const result=value;" },
    '/vendor.js': { body: 'const diagnostic="Add import \'@example/tracing\' at your entry point";\nexport const value=diagnostic;' },
  }));
  assert.throws(() => validateModuleImports({ '/app.js': { body: "import '@example/real-dependency';" } }), /Unexpected external import/);
  assert.throws(() => validateModuleImports({ '/app.js': { body: "import './missing.js';" } }), /Missing module/);
});
