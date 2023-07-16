module.exports = {
    env: {
        browser: true,
        es2022: true,
        node: true
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'eslint-config-prettier'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    plugins: ['@typescript-eslint', 'prettier'],
    rules: {
        indent: ['error', 4],
        'linebreak-style': ['error', 'unix'],
        curly: ['error', 'all'],
        'no-multiple-empty-lines': [
            'error',
            {
                max: 1,
                maxEOF: 1,
                maxBOF: 0
            }
        ]
    },
    ignorePatterns: ['**.js']
};
