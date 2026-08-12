// SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
// SPDX-License-Identifier: Apache-2.0
//
// Unit tests for the data pipeline contract layer (scripts/lib/data-pipeline.js).
// Uses synthetic fixtures; no dependency on the real landscape data.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  VALID_TIERS,
    VALID_MATURITIES,
    parseYaml,
    validateData,
    deriveMetadata,
    serialize,
    buildFromYaml,
    ValidationError
} from '../../scripts/lib/data-pipeline.js';

// --- helpers ---------------------------------------------------------------

function makeItem(overrides = {}) {
  return {
    name: 'Example Service',
    description: 'An example service for testing.',
    url: 'https://example.org',
    license: 'MIT',
    tier: 'standard',
    maturity: 'production',
    category: 'tools',
    subcategory: 'Utilities',
    tags: ['utility', 'test'],
    ...overrides
  };
}

function makeLandscape(items = [makeItem()], categoryOverrides = {}) {
  return {
    categories: [
      {
        id: 'tools',
        name: 'Tools',
        subcategories: [{ name: 'Utilities', items }],
        ...categoryOverrides
      }
    ]
  };
}

let tmpDir;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'landscape-test-'));
});
afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- parseYaml -------------------------------------------------------------

describe('parseYaml', () => {
  it('parses valid YAML text into an object', () => {
    const obj = parseYaml('name: test\nitems:\n  - a\n  - b\n');
    expect(obj).toEqual({ name: 'test', items: ['a', 'b'] });
  });

  it('throws on invalid YAML', () => {
    expect(() => parseYaml('a: [unclosed')).toThrow();
  });
});

// --- validateData: happy path ----------------------------------------------

describe('validateData', () => {
  it('accepts a minimal valid landscape with zero errors', () => {
    const { errors, warnings } = validateData(makeLandscape());
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('accepts every valid tier and maturity value', () => {
    for (const tier of VALID_TIERS) {
      for (const maturity of VALID_MATURITIES) {
        const { errors } = validateData(makeLandscape([makeItem({ tier, maturity })]));
        expect(errors).toEqual([]);
      }
    }
  });

  it('accepts items without optional fields (logo, tags, stars, language)', () => {
    const item = makeItem();
    delete item.logo;
    delete item.tags;
    delete item.stars;
    delete item.language;
    const { errors } = validateData(makeLandscape([item]));
    expect(errors).toEqual([]);
  });

  it('accepts numeric and compact stars formats', () => {
    for (const stars of [400, 0, '112k', '4.4k', '0']) {
      const { errors } = validateData(makeLandscape([makeItem({ stars })]));
      expect(errors).toEqual([]);
    }
  });

  it('validates logo files when a logoDir is provided', () => {
    fs.writeFileSync(path.join(tmpDir, 'good.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const item = makeItem({ logo: 'good.svg' });
    const { errors } = validateData(makeLandscape([item]), { logosDir: tmpDir });
    expect(errors).toEqual([]);
  });
});

// --- validateData: required fields -----------------------------------------

describe('validateData required fields', () => {
  const required = ['name', 'description', 'url', 'license', 'tier', 'maturity', 'category', 'subcategory'];
  required.forEach(field => {
    it(`reports missing "${field}"`, () => {
      const item = makeItem();
      delete item[field];
      const { errors } = validateData(makeLandscape([item]));
      expect(errors.some(e => e.includes(`missing ${field}`))).toBe(true);
    });
  });

  it('reports a whitespace-only name as missing', () => {
    const { errors } = validateData(makeLandscape([makeItem({ name: '   ' })]));
    expect(errors.some(e => e.includes('missing name'))).toBe(true);
  });
});

// --- validateData: enums and cross-references -------------------------------

describe('validateData enums and cross-references', () => {
  it('rejects an invalid tier', () => {
    const { errors } = validateData(makeLandscape([makeItem({ tier: 'supreme' })]));
    expect(errors.some(e => e.includes('invalid/missing tier'))).toBe(true);
  });

  it('rejects an invalid maturity', () => {
    const { errors } = validateData(makeLandscape([makeItem({ maturity: 'preview' })]));
    expect(errors.some(e => e.includes('invalid/missing maturity'))).toBe(true);
  });

  it('rejects a category that does not exist', () => {
    const { errors } = validateData(makeLandscape([makeItem({ category: 'ghost' })]));
    expect(errors.some(e => e.includes('unknown category'))).toBe(true);
  });

  it('rejects a category that does not match the parent category', () => {
    const { errors } = validateData(makeLandscape([makeItem({ category: 'other' })]));
    expect(errors.some(e => e.includes("doesn't match parent category"))).toBe(true);
  });

  it('rejects a subcategory that does not match the parent subcategory', () => {
    const { errors } = validateData(makeLandscape([makeItem({ subcategory: 'Elsewhere' })]));
    expect(errors.some(e => e.includes("doesn't match parent"))).toBe(true);
  });

  it('rejects duplicate service names', () => {
    const { errors } = validateData(makeLandscape([makeItem(), makeItem()]));
    expect(errors.some(e => e.includes('duplicate service name'))).toBe(true);
  });

  it('rejects non-array tags', () => {
    const { errors } = validateData(makeLandscape([makeItem({ tags: 'not-an-array' })]));
    expect(errors.some(e => e.includes('tags must be an array'))).toBe(true);
  });

  it('rejects malformed stars', () => {
    const { errors } = validateData(makeLandscape([makeItem({ stars: 'many' })]));
    expect(errors.some(e => e.includes('invalid stars format'))).toBe(true);
  });

  it('warns (not errors) on non-absolute urls', () => {
    const { errors, warnings } = validateData(makeLandscape([makeItem({ url: 'example.org' })]));
    expect(errors).toEqual([]);
    expect(warnings.some(w => w.includes('not absolute http(s)'))).toBe(true);
  });

  it('rejects non-object data', () => {
    expect(validateData(null).errors).toHaveLength(1);
    expect(validateData({}).errors[0]).toContain('categories');
  });
});

// --- validateData: logo contract --------------------------------------------

describe('validateData logo contract (extension/content parity)', () => {
  it('reports a missing logo file', () => {
    const { errors } = validateData(makeLandscape([makeItem({ logo: 'nope.svg' })]), { logosDir: tmpDir });
    expect(errors.some(e => e.includes('logo file missing'))).toBe(true);
  });

  it('reports PNG bytes stored under a .svg extension', () => {
    fs.writeFileSync(path.join(tmpDir, 'bad.svg'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const { errors } = validateData(makeLandscape([makeItem({ logo: 'bad.svg' })]), { logosDir: tmpDir });
    expect(errors.some(e => e.includes('content does not match extension'))).toBe(true);
  });

  it('reports SVG text stored under a .png extension', () => {
    fs.writeFileSync(path.join(tmpDir, 'bad.png'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const { errors } = validateData(makeLandscape([makeItem({ logo: 'bad.png' })]), { logosDir: tmpDir });
    expect(errors.some(e => e.includes('content does not match extension'))).toBe(true);
  });

  it('accepts PNG bytes under a .png extension', () => {
    fs.writeFileSync(path.join(tmpDir, 'ok.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]));
    const { errors } = validateData(makeLandscape([makeItem({ logo: 'ok.png' })]), { logosDir: tmpDir });
    expect(errors).toEqual([]);
  });
});

// --- deriveMetadata ----------------------------------------------------------

describe('deriveMetadata', () => {
  it('counts services, categories, licenses, tiers, and maturities', () => {
    const data = makeLandscape([
      makeItem({ name: 'A', license: 'MIT', tier: 'high', maturity: 'production' }),
      makeItem({ name: 'B', license: 'MIT', tier: 'high', maturity: 'graduated' }),
      makeItem({ name: 'C', license: 'Apache-2.0', tier: 'critical', maturity: 'production' })
    ]);
    const m = deriveMetadata(data);
    expect(m.total_services).toBe(3);
    expect(m.total_categories).toBe(1);
    expect(m.license_breakdown).toEqual([
      { license: 'MIT', count: 2 },
      { license: 'Apache-2.0', count: 1 }
    ]);
    expect(m.service_tiers).toEqual([
      { tier: 'high', count: 2 },
      { tier: 'critical', count: 1 }
    ]);
    expect(m.maturity_levels).toEqual([
      { level: 'production', count: 2 },
      { level: 'graduated', count: 1 }
    ]);
  });

  it('invariant: breakdown counts always sum to total_services', () => {
    const data = makeLandscape([
      makeItem({ name: 'A', license: 'MIT', tier: 'high', maturity: 'production' }),
      makeItem({ name: 'B', license: 'GPL-3.0', tier: 'low', maturity: 'beta' })
    ]);
    const m = deriveMetadata(data);
    const sum = (arr) => arr.reduce((s, x) => s + x.count, 0);
    expect(sum(m.license_breakdown)).toBe(m.total_services);
    expect(sum(m.service_tiers)).toBe(m.total_services);
    expect(sum(m.maturity_levels)).toBe(m.total_services);
  });
});

// --- serialize ---------------------------------------------------------------

describe('serialize', () => {
  it('produces the stable golden-file header', () => {
    const out = serialize({ categories: [] });
    expect(out.startsWith('// Auto-generated from data/services.yaml — DO NOT EDIT DIRECTLY\n// Run: node scripts/generate-data.js\n\nwindow.__LANDSCAPE_DATA = ')).toBe(true);
    expect(out.trimEnd().endsWith('};')).toBe(true);
  });

  it('is deterministic across calls', () => {
    const data = makeLandscape();
    expect(serialize(data)).toBe(serialize(data));
  });
});

// --- buildFromYaml -----------------------------------------------------------

describe('buildFromYaml', () => {
  it('parses, validates, and attaches metadata in one step', () => {
    const yamlText = `
categories:
- id: tools
  name: Tools
  subcategories:
  - name: Utilities
    items:
    - name: A
      description: desc
      url: https://a.example
      license: MIT
      tier: high
      maturity: production
      category: tools
      subcategory: Utilities
`;
    const { data, warnings } = buildFromYaml(yamlText);
    expect(warnings).toEqual([]);
    expect(data.metadata.total_services).toBe(1);
  });

  it('throws a ValidationError with the collected errors', () => {
    const yamlText = `
categories:
- id: tools
  name: Tools
  subcategories:
  - name: Utilities
    items:
    - name: A
      description: desc
      url: not-a-url
      tier: wrong
      maturity: production
      category: tools
`;
    try {
      buildFromYaml(yamlText);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect(e.errors.length).toBeGreaterThanOrEqual(2);
      expect(e.message).toContain('validation error');
    }
  });
});
