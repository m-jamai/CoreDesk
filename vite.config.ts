import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * GitHub Pages base path.
 *
 * Project pages are served from https://<user>.github.io/<REPO_NAME>/,
 * so the production build must know the repository name.
 *
 * - Change REPO_NAME below to match your repository, OR
 * - let the included GitHub Actions workflow set BASE_PATH automatically.
 * - For a user/organization page (<user>.github.io), use '/'.
 *
 * No environment variable is required: the fallback below always works.
 */
const REPO_NAME = 'https://github.com/m-jamai/CoreDesk';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  // `npm run dev` serves at '/'; `build` and `preview` use the Pages subpath.
  base: command === 'build' || isPreview ? process.env.BASE_PATH ?? `/${REPO_NAME}/` : '/',
}));
