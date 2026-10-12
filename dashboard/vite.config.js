import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the build works from any S3 / CloudFront path
export default defineConfig({ base: './', plugins: [react()] });
