export default {
    preset: 'ts-jest',
    transform: {
        '^.+\\.(ts|tsx)?$': 'ts-jest',
        "^.+\\.(js|jsx)$": "babel-jest",
    },
    collectCoverageFrom: [
        'src/**/*.{js,ts}',
        '!**/node_modules/**',
        '!src/router/**',
        '!**/vendor/**',
        '!src/index.ts',
        '!src/config.ts'
    ]
};
