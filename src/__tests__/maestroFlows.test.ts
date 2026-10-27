// Static check of the Maestro flows: every id they use exists in the app, and the README captures are named.
// The flows themselves run on the emulator in verify-app.
import fs from 'fs';
import path from 'path';

import { POWERUP_GROUPS, POWERUP_KINDS } from '../game/powerups';
import { LANGUAGES } from '../i18n';

const ROOT = path.join(__dirname, '../..');
const FLOWS = path.join(ROOT, '.maestro');

function files(dir: string, ext: RegExp): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? files(p, ext) : ext.test(d.name) ? [p] : [];
  });
}

const flowFiles = files(FLOWS, /\.yaml$/);
const flows = flowFiles.map((f) => fs.readFileSync(f, 'utf8'));

// Literal testIDs in the source plus the ones built from templates.
function knownIds(): Set<string> {
  const ids = new Set<string>();
  for (const f of files(path.join(ROOT, 'src'), /\.tsx$/)) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/testID="([^"]+)"/g)) ids.add(m[1]);
  }
  for (const mode of ['quadrants', 'dpad', 'autoaim', 'pointAndShoot']) ids.add(`settings-fire-${mode}`);
  for (const lang of ['auto', ...LANGUAGES]) ids.add(`settings-language-${lang}`);
  for (const kind of POWERUP_KINDS) ids.add(`guide-${kind}`);
  for (const g of POWERUP_GROUPS) ids.add(`guide-group-${g.id}`);
  for (const side of ['left', 'right']) ids.add(`joystick-${side}`);
  for (const dir of ['N', 'S', 'E', 'W']) ids.add(`fire-${dir}`);
  return ids;
}

describe('Maestro flows (AC-01, AC-03, AC-06, AC-35, AC-37, AC-38, AC-39, AC-43, AC-44)', () => {
  it('only use ids that exist in the app', () => {
    const ids = knownIds();
    const used = flows.flatMap((text) => [...text.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]));
    expect(used.length).toBeGreaterThan(40);
    expect(used.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('name exactly 3 README captures: home, gameplay, end', () => {
    const shots = flows.flatMap((text) => [...text.matchAll(/takeScreenshot: (readme-\S+)/g)].map((m) => m[1]));
    expect(shots).toEqual(['readme-1-home', 'readme-2-gameplay', 'readme-3-game-over']);
  });

  it('have no ":" in their names and start from a clean install', () => {
    for (const [i, text] of flows.entries()) {
      const name = /^name: (.*)$/m.exec(text)?.[1] ?? '';
      expect([path.basename(flowFiles[i]), name.includes(':')]).toEqual([path.basename(flowFiles[i]), false]);
      if (!flowFiles[i].includes('helpers')) expect(text).toContain('clearState: true');
    }
  });

  it('keep one telemetry flow, excluded from the normal run by its tag', () => {
    expect(flows.filter((t) => /tags:\n\s+- telemetry/.test(t))).toHaveLength(1);
  });
});
