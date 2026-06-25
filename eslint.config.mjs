// @ts-check
// Financee root ESLint flat config.
// @nuxt/eslint generates a project-aware config at ./.nuxt/eslint.config.mjs after
// `nuxt prepare`. `withNuxt` extends it; add project overrides inside the call.
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    // eslint-plugin-vue does not parse Pug templates, so script-setup bindings used only
    // in <template lang="pug"> are falsely flagged as unused. Disable the rule for SFCs.
    files: ['app/**/*.vue'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
)
