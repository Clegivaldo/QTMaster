#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix relative imports that don't have .js extension
  // Match: from './something' or from '../something' but not from './something.js'
  const regex = /from\s+['"](\.\.?\/[^'"]+)(?<!\.js)['"]/g;
  
  const newContent = content.replace(regex, (match, importPath) => {
    // Don't modify if it already ends with .js or if it's importing from node_modules
    if (importPath.endsWith('.js') || !importPath.startsWith('.')) {
      return match;
    }
    modified = true;
    return match.replace(importPath, importPath + '.js');
  });

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Fixed: ${filePath}`);
    return true;
  }
  return false;
}

function walkDirectory(dir) {
  let fixedCount = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      fixedCount += walkDirectory(fullPath);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      if (fixImportsInFile(fullPath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

const srcDir = path.join(__dirname, 'src');
console.log(`Scanning ${srcDir} for TypeScript files...`);
const fixedCount = walkDirectory(srcDir);
console.log(`\nFixed ${fixedCount} files.`);
