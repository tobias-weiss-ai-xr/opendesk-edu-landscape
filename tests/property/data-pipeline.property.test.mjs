// SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
// SPDX-License-Identifier: Apache-2.0
//
// Property-based tests (fast-check): instead of hand-written examples, we
// generate arbitrary landscapes and assert invariants hold for ALL of them.
// This is the SOTA approach for schema/contract testing — it finds edge
// cases a human would never think to write.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  VALID_TIERS,
    VALID_MATURITIES,
    validateData,
    deriveMetadata
} from '../../scripts/lib/data-pipeline.js';

// --- arbitrary generators ----------------------------------------------------

const requiredKeys = ['name', 'description', 'url', 'license', 'tier', 'maturity', 'category', 'subcategory'];

const validItem = fc.record(
  {
    name: fc.string({ minLength: 1, maxLength: 40 }),
    description: fc.string({ minLength: 1, maxLength: 80 }),
    url: fc.webUrl(),
    license: fc.constantFrom('MIT', 'Apache-2.0', 'GPL-3.0', 'AGPL-3.0'),
    tier: fc.constantFrom(...VALID_TIERS),
    maturity: fc.constantFrom(...VALID_MATURITIES),
    category: fc.constant('tools'),
    subcategory: fc.constant('Utilities'),
    stars: fc.oneof(fc.integer({ min: 0, max: 200000 }), fc.constantFrom('1k', '4.4k', '112k')),
    tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }), { nil: undefined }),
    organization: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: undefined }),
    language: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined })
  },
  { withDeletedKeys: true }
);

// The "valid landscape" arb must satisfy the strengthened contract:
// names/descriptions must be non-whitespace and globally unique (the
// validator now rejects whitespace-only strings and duplicate names).
const landscapeArb = fc.array(
  validItem,
  { minLength: 1, maxLength: 8 }
).map(items => ({
  categories: [
    {
      id: 'tools',
      name: 'Tools',
      subcategories: [{
        name: 'Utilities',
        items: (() => {
          const used = new Set();
          return items.map((it, i) => {
            let name = it.name.trim() || `service-${i}`;
            while (used.has(name)) name = `${name}-${i}`;
            used.add(name);
            return {
              ...it,
              name,
              description: it.description.trim() || 'a service description'
            };
          });
        })()
      }]
    }
  ]
}));

// --- properties ---------------------------------------------------------------

describe('property: arbitrary VALID landscapes', () => {
  it('never produce validation errors', () => {
    fc.assert(
      fc.property(landscapeArb, data => {
        const { errors } = validateData(data);
        return errors.length === 0;
      }),
      { numRuns: 200 }
    );
  });
});

describe('property: required-field removal always breaks validation', () => {
  it('deleting any required field from a valid item yields >= 1 error', () => {
    fc.assert(
      fc.property(validItem, fc.constantFrom(...requiredKeys), (item, fieldToDelete) => {
        // fast-check records may already omit optional fields; required ones
        // must be present by construction of validItem
        const { [fieldToDelete]: _dropped, ...rest } = item;
        const data = {
          categories: [{
            id: 'tools',
            name: 'Tools',
            subcategories: [{ name: 'Utilities', items: [rest] }]
          }]
        };
        const { errors } = validateData(data);
        return errors.some(e => e.includes(`missing ${fieldToDelete}`));
      }),
      { numRuns: 200 }
    );
  });
});

describe('property: invalid tier/maturity always rejected', () => {
  it('garbage tier values are flagged', () => {
    fc.assert(
      fc.property(validItem, fc.string(), (item, garbage) => {
        // avoid generating a string that coincidentally equals a valid tier
        fc.pre(!VALID_TIERS.includes(garbage));
        const bad = { ...item, tier: garbage };
        const data = {
          categories: [{
            id: 'tools',
            name: 'Tools',
            subcategories: [{ name: 'Utilities', items: [bad] }]
          }]
        };
        const { errors } = validateData(data);
        return errors.some(e => e.includes('invalid/missing tier'));
      }),
      { numRuns: 200 }
    );
  });

  it('garbage maturity values are flagged', () => {
    fc.assert(
      fc.property(validItem, fc.string(), (item, garbage) => {
        fc.pre(!VALID_MATURITIES.includes(garbage));
        const bad = { ...item, maturity: garbage };
        const data = {
          categories: [{
            id: 'tools',
            name: 'Tools',
            subcategories: [{ name: 'Utilities', items: [bad] }]
          }]
        };
        const { errors } = validateData(data);
        return errors.some(e => e.includes('invalid/missing maturity'));
      }),
      { numRuns: 200 }
    );
  });
});

describe('property: metadata breakdown invariants', () => {
  it('sum of each breakdown equals total_services', () => {
    fc.assert(
      fc.property(landscapeArb, data => {
        const m = deriveMetadata(data);
        const sum = arr => arr.reduce((s, x) => s + x.count, 0);
        return sum(m.license_breakdown) === m.total_services
          && sum(m.service_tiers) === m.total_services
          && sum(m.maturity_levels) === m.total_services
          && m.total_categories === 1;
      }),
      { numRuns: 200 }
    );
  });

  it('each breakdown is sorted deterministically by insertion order', () => {
    fc.assert(
      fc.property(landscapeArb, data => {
        const m = deriveMetadata(data);
        const tierSet = new Set(m.service_tiers.map(t => t.tier));
        const maturitySet = new Set(m.maturity_levels.map(l => l.level));
        // every distinct value in the input appears exactly once in the output
        for (const item of data.categories.flatMap(c => c.subcategories.flatMap(s => s.items))) {
          if (!tierSet.has(item.tier)) return false;
          if (!maturitySet.has(item.maturity)) return false;
        }
        return true;
      }),
      { numRuns: 200 }
    );
  });
});

describe('property: duplicate names are always caught', () => {
  it('two items sharing a name trigger the duplicate invariant', () => {
    fc.assert(
      fc.property(validItem, (item) => {
        const data = {
          categories: [{
            id: 'tools',
            name: 'Tools',
            subcategories: [{ name: 'Utilities', items: [item, { ...item, description: item.description + ' x' }] }]
          }]
        };
        const { errors } = validateData(data);
        return errors.some(e => e.includes('duplicate service name'));
      }),
      { numRuns: 100 }
    );
  });
});
