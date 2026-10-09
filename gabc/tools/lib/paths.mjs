// Paths of the repository shared by the scripts in gabc/tools.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const GABC = join(ROOT, 'gabc');
export const CHANTS = join(GABC, 'chants');
export const INDEX = join(GABC, 'index.json');

export const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
