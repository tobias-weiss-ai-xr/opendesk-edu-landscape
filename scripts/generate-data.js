#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 openDesk Edu Contributors
// SPDX-License-Identifier: Apache-2.0
//
// Generates data/services.js from data/services.yaml
// Usage: node scripts/generate-data.js
// Core logic lives in scripts/lib/data-pipeline.js (unit-tested).

const fs = require('fs');
const path = require('path');
const { buildFromYaml, serialize } = require('./lib/data-pipeline');

const yamlPath = path.join(__dirname, '..', 'data', 'services.yaml');
const outputPath = path.join(__dirname, '..', 'data', 'services.js');

let content;
try {
  content = fs.readFileSync(yamlPath, 'utf8');
} catch (e) {
  console.error(`Failed to read ${yamlPath}: ${e.message}`);
  process.exit(1);
}

let data;
let warnings = [];
try {
  ({ data, warnings } = buildFromYaml(content));
} catch (e) {
  console.error(e.message);
  if (e.errors) e.errors.forEach(err => console.error(`  ✗ ${err}`));
  process.exit(1);
}

warnings.forEach(w => console.warn(`  ⚠ ${w}`));
fs.writeFileSync(outputPath, serialize(data), 'utf8');
console.log(`Generated ${outputPath} (${data.categories.length} categories, ${data.metadata.total_services} services)`);
