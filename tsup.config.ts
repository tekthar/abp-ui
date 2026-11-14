import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Charts, drag and drop and Motion stay external too: the host bundles them once, and pages that don't use them don't load them.
const external = ['react', 'react-dom', 'react/jsx-runtime', '@chakra-ui/react', '@emotion/react', 'next-themes', 'lucide-react', '@chakra-ui/charts', 'recharts', /^@dnd-kit\//, /^motion(\/|$)/];

export default defineConfig([
  // The design system: one ESM entry plus type declarations. Every peer dependency stays external so the host's single
  // copy of React, Chakra and emotion is used (and, through Module Federation, the plugins' too). The "use client"
  // banner lets Next.js server components render the provider.
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: false,
    target: 'es2022',
    splitting: false,
    external,
    banner: { js: '"use client";' },
    define: { __ABP_UI_VERSION__: JSON.stringify(version) },
  },
  // The rules alone (src/rules), with no React or Chakra, built on their own so their code and types stand in one file
  // each: a package that bundles them (a phone app's client) inlines them without reaching into shared chunks.
  {
    entry: { rules: 'src/rules/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: false,
    target: 'es2022',
    splitting: false,
  },
]);
