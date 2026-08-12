// SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
// SPDX-License-Identifier: Apache-2.0
//
// Core data pipeline: parse -> validate -> derive metadata -> serialize.
// Pure functions, no I/O, fully unit-testable.
// The CLI entry point (scripts/generate-data.js) is a thin wrapper.

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const VALID_TIERS = ['critical', 'high', 'standard', 'low'];
const VALID_MATURITIES = ['graduated', 'production', 'beta'];
const URL_RE = /^https?:\/\/\S+$/;
const STARS_RE = /^[\d.]+k?$/;

/**
 * Parse YAML text into a JS object.
 * @param {string} content
 * @returns {object}
 */
function parseYaml(content) {
  return yaml.load(content);
}

/**
 * Validate the landscape data structure and cross-field invariants.
 * Returns { errors, warnings } — errors must be empty for a valid landscape.
 *
 * Invariants (SOTA contract layer — encodes past production incidents):
 *  - required fields: name, description, url, license, tier, maturity, category
 *  - tier / maturity must be from the declared enums
 *  - category must reference an existing category id and match its parent
 *  - subcategory must match the parent subcategory name
 *  - urls must be absolute http(s) URLs
 *  - stars must be a number or a compact format like "112k", "4.4k"
 *  - tags, if present, must be an array
 *  - names must be unique across the whole landscape
 *  - logo, if present, must exist in hosted_logos/ AND its bytes must match
 *    the file extension (SVG content must contain <svg, PNG content must
 *    start with PNG magic bytes) — guards against the extension/mime drift
 *    incidents seen in production.
 *
 * @param {object} data
 * @param {{ logosDir?: string }} [opts]
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateData(data, opts = {}) {
  const logosDir = opts.logosDir || path.join(__dirname, '..', '..', 'hosted_logos');
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== 'object') {
    return { errors: ['data must be an object'], warnings };
  }
  if (!Array.isArray(data.categories)) {
    return { errors: ['data.categories must be an array'], warnings };
  }

  const validCategories = new Set(data.categories.map(c => c.id));
  const seenNames = new Set();

  data.categories.forEach(cat => {
    if (!cat.id || !cat.name) {
      errors.push(`Category missing id or name: ${JSON.stringify(cat)}`);
    }
    if (!Array.isArray(cat.subcategories)) {
      errors.push(`Category "${cat.id}" has no subcategories`);
      return;
    }
    cat.subcategories.forEach((sub, si) => {
      if (!sub.name) errors.push(`Category "${cat.id}" subcategory #${si} missing name`);
      if (!Array.isArray(sub.items)) {
        errors.push(`Category "${cat.id}" > "${sub.name}" has no items array`);
        return;
      }
      sub.items.forEach((item, ii) => {
        const where = `"${item.name || `#${ii}`}"`;
        if (!item.name || !String(item.name).trim()) errors.push(`${where} missing name`);
        if (!item.description || !String(item.description).trim()) errors.push(`"${item.name}" missing description`);
        if (!item.url) errors.push(`"${item.name}" missing url`);
        else if (!URL_RE.test(item.url)) warnings.push(`"${item.name}" url is not absolute http(s): ${item.url}`);
        if (!item.license) errors.push(`"${item.name}" missing license`);
        if (!item.tier || !VALID_TIERS.includes(item.tier)) {
          errors.push(`"${item.name}" invalid/missing tier (must be one of: ${VALID_TIERS.join(', ')})`);
        }
        if (!VALID_MATURITIES.includes(item.maturity)) {
          errors.push(`"${item.name}" invalid/missing maturity (must be one of: ${VALID_MATURITIES.join(', ')})`);
        }
        if (!item.category) errors.push(`"${item.name}" missing category`);
        else if (!validCategories.has(item.category)) errors.push(`"${item.name}" references unknown category "${item.category}"`);
        if (!item.subcategory) errors.push(`"${item.name}" missing subcategory`);
        else if (item.subcategory !== sub.name) {
          errors.push(`"${item.name}" subcategory "${item.subcategory}" doesn't match parent "${sub.name}"`);
        }
        if (item.category && item.category !== cat.id) {
          errors.push(`"${item.name}" category "${item.category}" doesn't match parent category "${cat.id}"`);
        }
        if (item.tags != null && !Array.isArray(item.tags)) {
          errors.push(`"${item.name}" tags must be an array`);
        }
        if (item.stars != null && !(typeof item.stars === 'number' || STARS_RE.test(String(item.stars)))) {
          errors.push(`"${item.name}" invalid stars format: ${item.stars}`);
        }
        if (seenNames.has(item.name)) {
          errors.push(`"${item.name}" duplicate service name`);
        }
        seenNames.add(item.name);

        if (item.logo) {
          const logoPath = path.join(logosDir, item.logo);
          if (!fs.existsSync(logoPath)) {
            errors.push(`"${item.name}" logo file missing: ${item.logo}`);
          } else {
            const buf = fs.readFileSync(logoPath);
            const isSvg = buf.toString('utf8', 0, 200).includes('<svg');
            const isPng = buf[0] === 0x89 && buf[1] === 0x50;
            const extOk = (item.logo.endsWith('.svg') && isSvg) || (item.logo.endsWith('.png') && isPng);
            if (!extOk) {
              errors.push(`"${item.name}" logo content does not match extension: ${item.logo}`);
            }
          }
        }
      });
    });
  });

  return { errors, warnings };
}

/**
 * Derive aggregate metadata (service counts, breakdowns) from the data.
 * @param {object} data
 * @returns {object} metadata object
 */
function deriveMetadata(data) {
  const items = data.categories.flatMap(c => c.subcategories.flatMap(s => s.items));
  const licenseCounts = {};
  const tierCounts = {};
  const maturityCounts = {};
  items.forEach(item => {
    licenseCounts[item.license] = (licenseCounts[item.license] || 0) + 1;
    tierCounts[item.tier] = (tierCounts[item.tier] || 0) + 1;
    maturityCounts[item.maturity] = (maturityCounts[item.maturity] || 0) + 1;
  });
  return {
    total_services: items.length,
    total_categories: data.categories.length,
    license_breakdown: Object.entries(licenseCounts).map(([license, count]) => ({ license, count })),
    service_tiers: Object.entries(tierCounts).map(([tier, count]) => ({ tier, count })),
    maturity_levels: Object.entries(maturityCounts).map(([level, count]) => ({ level, count }))
  };
}

/**
 * Serialize a fully-validated data object to the JS bundle format.
 * Output must be byte-stable for the golden-file test.
 * @param {object} data
 * @returns {string}
 */
function serialize(data) {
  return `// Auto-generated from data/services.yaml — DO NOT EDIT DIRECTLY
// Run: node scripts/generate-data.js

window.__LANDSCAPE_DATA = ${JSON.stringify(data, null, 2)};
`;
}

/**
 * End-to-end pipeline over YAML text: parse, validate (throws on errors),
 * attach derived metadata.
 * @param {string} content
 * @param {{ logosDir?: string }} [opts]
 * @returns {{ data: object, warnings: string[] }}
 */
function buildFromYaml(content, opts = {}) {
  const data = parseYaml(content);
  const { errors, warnings } = validateData(data, opts);
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
  data.metadata = deriveMetadata(data);
  return { data, warnings };
}

class ValidationError extends Error {
  constructor(errors) {
    super(`Found ${errors.length} validation error(s)`);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

module.exports = {
  VALID_TIERS,
  VALID_MATURITIES,
  parseYaml,
  validateData,
  deriveMetadata,
  serialize,
  buildFromYaml,
  ValidationError
};
