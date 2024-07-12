import { writable } from 'svelte/store';

import PocketBase from 'pocketbase';


export const pb = new PocketBase('/');

export const authStore = writable(pb.authStore);

pb.authStore.onChange((auth) => {
    authStore.set(pb.authStore);
});

export async function loadSet(setId) {
    const record = await pb.collection("sets").getOne(setId);
    return record;
}

export async function loadRoute(routeId) {
    const record = await pb.collection("routes").getOne(routeId);
    return record;
}
