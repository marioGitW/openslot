// Native ESM: ts-jest emits ES modules and Jest runs them with
// --experimental-vm-modules (see the test scripts in package.json).
/** @type {import('jest').Config} */
const config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { useESM: true }],
  },
  moduleNameMapper: {
    // Relative imports end in .js (ESM); map them back to the .ts sources.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Hand-written code only; the Prisma client is generated.
  collectCoverageFrom: ['src/**/*.ts', '!src/generated/**', '!src/main.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};

export default config;
