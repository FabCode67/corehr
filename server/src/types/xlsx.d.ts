// The installed `xlsx` (SheetJS) package declares "types": "types/index.d.ts"
// in its package.json, but that file is missing from this install (likely
// an incomplete `npm install` — the runtime `xlsx.js` itself is present and
// working, only its bundled type declarations are absent). Rather than
// depend on every environment having a complete xlsx install before it can
// type-check, declare the module ambiently here so `import * as XLSX from
// "xlsx"` resolves to `any` instead of failing the build. If a future
// `npm install xlsx` restores the real types, this file becomes redundant
// but harmless (TypeScript prefers a package's own .d.ts when present).
declare module "xlsx";
