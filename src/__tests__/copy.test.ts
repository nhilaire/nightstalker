// The dictionaries say what the PRD "Player copy" tables say, with each language's typography (AC-07).
import fs from 'fs';
import path from 'path';

import { DICTIONARIES, LANGUAGES } from '../i18n';

const PRD = fs.readFileSync(path.join(__dirname, '../../docs/PRD.md'), 'utf8');
const normalize = (s: string) => s.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

type Row = { key: string; cells: Record<string, string> };

function prdRows(): Row[] {
  const start = PRD.indexOf('## Player copy');
  const end = PRD.indexOf('## Out of scope');
  return PRD.slice(start, end)
    .split('\n')
    .filter((line) => /^\| [a-z]+\.[A-Za-z.]+/.test(line))
    .map((line) => {
      const parts = line.split('|').slice(1, -1).map((c) => c.trim());
      return { key: parts[0], cells: Object.fromEntries(LANGUAGES.map((l, i) => [l, parts[i + 1]])) };
    });
}

function lookup(dict: unknown, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined), dict);
}

function asText(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return value.join(' ');
  return null;
}

describe('player copy matches the PRD (AC-07)', () => {
  const rows = prdRows();

  it('reads the PRD tables', () => {
    expect(rows.length).toBeGreaterThan(80);
  });

  it.each(LANGUAGES)('%s: single-key rows', (language) => {
    let checked = 0;
    for (const row of rows) {
      if (row.key.includes('/') || row.key.startsWith('powerup.')) continue;
      const text = asText(lookup(DICTIONARIES[language], row.key));
      if (text === null) continue; // formatted texts ({n}, {version}) are covered below
      expect([row.key, normalize(text)]).toEqual([row.key, normalize(row.cells[language])]);
      checked++;
    }
    expect(checked).toBeGreaterThan(50);
  });

  it.each(LANGUAGES)('%s: power-up labels and descriptions', (language) => {
    for (const row of rows.filter((r) => r.key.startsWith('powerup.'))) {
      const kind = row.key.slice('powerup.'.length);
      const entry = lookup(DICTIONARIES[language], `powerups.${kind}`) as { label: string; description: string };
      const [label, description] = row.cells[language].split(' / ');
      expect(normalize(entry.label)).toBe(normalize(label));
      expect(normalize(entry.description)).toBe(normalize(description));
    }
  });

  it.each(LANGUAGES)('%s: fire mode labels and hints', (language) => {
    const modes = { quadrants: 'quadrants', dpad: 'dpad', autoaim: 'autoaim', point: 'pointAndShoot' } as const;
    for (const [prdKey, mode] of Object.entries(modes)) {
      const row = rows.find((r) => r.key === `settings.fire.${prdKey} / hint`)!;
      const [label, hint] = row.cells[language].split(' / ');
      const entry = DICTIONARIES[language].settings.fire[mode];
      expect(normalize(entry.label)).toBe(normalize(label));
      expect(normalize(entry.hint)).toBe(normalize(hint));
    }
  });
});

describe('typography and formats (AC-07)', () => {
  function texts(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (typeof value === 'function') return texts(value(...Array(value.length).fill(1.5)));
    if (value && typeof value === 'object') return Object.values(value).flatMap(texts);
    return [];
  }

  it('French puts a no-break space, never a plain one, before : ; ! ?', () => {
    const bad = texts(DICTIONARIES.fr).filter((s) => / [:;!?](\s|$)/.test(s));
    expect(bad).toEqual([]);
  });

  it('shows the combo multiplier in each language style', () => {
    expect(DICTIONARIES.fr.game.combo(1.5)).toBe('COMBO ×1,5');
    expect(DICTIONARIES.en.game.combo(1.5)).toBe('COMBO ×1.5');
    expect(DICTIONARIES.fr.game.combo(2)).toBe('COMBO ×2');
  });

  it('uses tu in French', () => {
    const all = texts(DICTIONARIES.fr).join(' ');
    expect(all).not.toMatch(/\b(vous|votre|vos)\b/i);
    expect(all).toMatch(/\b(tu|ton|ta|tes)\b/);
  });
});
