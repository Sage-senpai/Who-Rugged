// Empty on purpose: this project uses plain hand-written CSS, no PostCSS
// plugins. Without this file, postcss-load-config walks up the directory
// tree and picks up an unrelated postcss.config.mjs from a sibling project
// in the parent folder, which references a package not installed here.
// This local (empty) config shadows that one so `vite dev`/`vite build`
// work regardless of what's configured in neighboring projects.
export default {
  plugins: {},
}
