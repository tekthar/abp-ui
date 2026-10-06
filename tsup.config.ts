import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// One ESM entry plus type declarations. Every peer dependency stays external so the host's
// single copy of React, Chakra and emotion is used (and, through Module Federation, the
// plugins' too). The "use client" banner lets Next.js server components render TodaProvider.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  splitting: false,
  external: ['react', 'react-dom', 'react/jsx-runtime', '@chakra-ui/react', '@emotion/react', 'next-themes', 'lucide-react'],
  banner: { js: '"use client";' },
  define: { __TODA_UI_VERSION__: JSON.stringify(version) },
});
