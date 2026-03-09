import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['<rootDir>/apps/api/**/*.spec.ts', '<rootDir>/apps/api/**/*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', isolatedModules: false }],
  },
  modulePathIgnorePatterns: ['/dist/', '/node_modules/'],
  collectCoverageFrom: [
    'apps/api/src/**/*.ts',
    '!apps/api/src/**/*.module.ts',
    '!apps/api/src/**/index.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
};

export default config;
