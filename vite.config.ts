import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			"/detect": {
				target: "http://127.0.0.1:8000/",
				changeOrigin: true,
				rewrite: (path) => path.replace("/detect", "")
			}
		}
	}
});
