import { writable } from 'svelte/store';

import PocketBase from 'pocketbase';


export const pb = new PocketBase('http://localhost:8090/');

export const authStore = writable(pb.authStore);

pb.authStore.onChange((auth) => {
    authStore.set(pb.authStore);
});
