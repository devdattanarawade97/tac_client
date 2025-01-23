import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

import { nodePolyfills } from "vite-plugin-node-polyfills";
export default defineConfig({
	plugins: [sveltekit(), nodePolyfills({
		// Specify which Node.js modules to polyfill
		include: ["buffer"], // Add other modules if needed
	  })],
	
});
