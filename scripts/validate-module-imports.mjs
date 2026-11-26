import { execFileSync } from 'node:child_process';
import path from 'node:path';

// Parse module syntax without executing browser code. Diagnostic strings in a
// vendored SDK may contain examples of imports; those are not dependencies.
export function validateModuleImports(assets) {
  const parser = `
import {SourceTextModule} from 'node:vm';
import {readFileSync} from 'node:fs';
const modules=JSON.parse(readFileSync(0,'utf8'));
process.stdout.write(JSON.stringify(modules.map(({name,source})=>({name,imports:[...new SourceTextModule(source,{identifier:name}).dependencySpecifiers]}))));
`;
  const modules = Object.entries(assets).filter(([name]) => /\.m?js$/.test(name)).map(([name, asset]) => ({ name, source: asset.body }));
  const dependencies = JSON.parse(execFileSync(process.execPath, ['--experimental-vm-modules', '--input-type=module', '--eval', parser], {
    input: JSON.stringify(modules), encoding: 'utf8', env: { ...process.env, NODE_NO_WARNINGS: '1' },
  }));
  for (const { name, imports } of dependencies) for (const dependency of imports) {
    if (!dependency.startsWith('.')) throw new Error(`Unexpected external import in ${name}: ${dependency}`);
    const resolved = path.posix.resolve(path.posix.dirname(name), dependency);
    if (!assets[resolved]) throw new Error(`Missing module ${resolved} imported by ${name}`);
  }
}
