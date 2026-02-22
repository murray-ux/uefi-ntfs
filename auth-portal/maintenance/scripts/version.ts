#!/usr/bin/env npx ts-node
/**
 * version.ts - Display Auth Portal version information
 *
 * Usage:
 *   maintenance/run version
 *   maintenance/run version --json
 */

interface VersionInfo {
  name: string;
  version: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  scripts: number;
}

function getVersionInfo(): VersionInfo {
  return {
    name: 'Auth Portal',
    version: '1.0.0',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    scripts: 8, // Number of maintenance scripts
  };
}

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');

  const info = getVersionInfo();

  if (jsonOutput) {
    console.log(JSON.stringify(info, null, 2));
  } else {
    console.log(`
${info.name} v${info.version}

Environment:
  Node.js:    ${info.nodeVersion}
  Platform:   ${info.platform}
  Arch:       ${info.arch}

Maintenance scripts available: ${info.scripts}

For script list, run: maintenance/run --list
For help, run: maintenance/run --help
`);
  }
}

main();

// MediaWiki 1.40+ pattern: return class name
export default 'Version';
