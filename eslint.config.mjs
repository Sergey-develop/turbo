import ts from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
export default [
  { ignores: ['scripts/vite/**', 'scripts/sites-env.mjs', 'scripts/tool-environment.mjs', 'dist/**'] },
  ...ts.configs.recommended,
  ...vue.configs['flat/essential'],
  { files:['**/*.vue'],languageOptions:{parserOptions:{parser:ts.parser}} },
  {languageOptions:{globals:{...globals.node,...globals.browser}}},
  { files: ['**/*.ts','**/*.mjs','**/*.vue'], rules: { '@typescript-eslint/no-explicit-any':'off', '@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_'}] } },
]
