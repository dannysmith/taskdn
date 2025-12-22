import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import path from 'path';

describe('API Consistency', () => {
    test('generated types match snapshot', () => {
        const typesPath = path.join(__dirname, '..', 'index.d.ts');
        const generatedTypes = readFileSync(typesPath, 'utf8');

        expect(generatedTypes).toMatchSnapshot();
    });
});
