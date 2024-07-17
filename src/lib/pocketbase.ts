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

export async function getShares(wallId) {
    const records = await pb.collection("shares").getFullList({
        filter: `wall.id = '${wallId}'`,
        sort: "-created",
        expand: "users_shares_via_share.user"
    });
    return records;
}

export async function createShare(wallId, editing) {
    const record = await pb.collection("shares").create({
        wall: wallId,
        editing: editing
    });
    return record;
}

export async function createUserShare(shareId) {
    const userId = pb.authStore.model?.id;
    if (!userId) {
        throw new Error("Not logged in");
    }
    const record = await pb.collection("users_shares").create({
        user: userId,
        share: shareId,
        banned: false,
        last_accessed: new Date()
    });
    return record;
}

export async function deleteShare(shareId) {
    await pb.collection("shares").delete(shareId);
}
