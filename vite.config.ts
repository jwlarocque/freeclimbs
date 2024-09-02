import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			"/detect": {
				target: "http://127.0.0.1:8000/"
			},
			"/api": {
				target: "http://127.0.0.1:8090/"
			},
			"/_": {
				target: "http://127.0.0.1:8090/"
			}
		}
	}
});
