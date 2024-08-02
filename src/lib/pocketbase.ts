import { writable } from 'svelte/store';

import PocketBase from 'pocketbase';


export const pb = new PocketBase('/');

export const authStore = writable(pb.authStore);
export const userSettingsStore = writable(null);

pb.authStore.onChange(async (auth) => {
    authStore.set(pb.authStore);
    initUserSettings();
}, true);

async function initUserSettings() {
    if (pb.authStore.isValid) {
        let userSettings;
        try {
            userSettings = await pb.collection("user_settings").getFirstListItem(`user = '${pb.authStore.model.id}'`);
        } catch (e) {
            console.log(e);
            userSettings = await pb.collection("user_settings").create({
                user: pb.authStore.model.id,
                grading_system: "v"
            });
        }
        userSettingsStore.set(userSettings);
        console.log(userSettings);
    }
}

userSettingsStore.subscribe(async (settings) => {
    if (pb.authStore.isValid && settings) {
        await pb.collection("user_settings").update(settings.id, settings);
    }
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

export async function getShare(shareId) {
    const record = await pb.collection("shares").getOne(shareId);
    return record;
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
        throw new Error("You must be logged in to access a Shared Wall.");
    }
    const record = await pb.collection("users_shares").create({
        user: userId,
        share: shareId,
        banned: false,
        last_accessed: new Date()
    });
    return record;
}

export async function getSettingUserShare(userId, wallId) {
    const record = await pb.collection("users_shares").getFirstListItem(
        `user = '${userId}' && share.wall.id = '${wallId}' && share.editing = True && banned = False`
    );
    console.log(record);
    return record;
}

export async function deleteShare(shareId) {
    await pb.collection("shares").delete(shareId);
}
