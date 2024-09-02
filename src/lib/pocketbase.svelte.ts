import PocketBase from 'pocketbase';

const pb = new PocketBase('/');


// == Auth ========

export const auth = $state({ model: pb.authStore.model });

pb.authStore.onChange(async (token, model) => {
    auth.model = model;
});

export async function listAuthProviders() {
    const result = await pb.collection('users').listAuthMethods();
    return result.authProviders;
}

export async function login(provider: string) {
    try {
        const result = await pb.collection('users').authWithOAuth2({ provider });
        return result;
    } catch (error) {
        console.error(error);
    }
}

export async function logout() {
    pb.authStore.clear();
}


// == Walls ========

type SetExpand = {
    current_set: Set;
}

export type Wall = {
    collectionId: string;
    collectionName: string;
    id: string;
    name: string;
    owner: string;
    public: boolean;
    allow_training: boolean;
    created: string;
    updated: string;
    current_set: string;
    expand?: SetExpand;
}

export async function getWall(_: any, id: string): Promise<Wall> {
    const result = await pb.collection('walls').getOne(id, {
        expand: "current_set"
    });
    return result as Wall;
}


// == Sets ========

export type Hold = {
    id: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
    confidence: number;
    contours: number[][];
    style?: string;
}

export type Set = {
    collectionId: string;
    collectionName: string;
    id: string;
    name: string;
    image: string;
    draft: boolean;
    holds: Hold[];
    created: string;
    updated: string;
    wall: string;
}

export function getSetImageUrl(set: Set) {
    return `/api/files/${set.collectionId}/${set.id}/${set.image}`;
}


// == Routes ========

export type Route = {
    id: string;
    set: string;
    setter: string;
    name: string;
    setter_grade: number;
    free_feet?: boolean;
    top_out?: boolean;
    holds: RouteHolds;
    draft: boolean;
    created: string;
    updated: string;
}

export type RouteHolds = {
    holds: number[];
    start: number[];
    finish: number[];
}

export async function getRoutes(
    setId: string,
    pageSize: number,
    page: number,
    sort: string,
    desc: boolean,
    filter: string
) {
    const results = await pb.collection('routes').getList(page, pageSize, {
        sort: `-draft,${desc ? "-" : ""}${sort}`,
        filter: `set="${setId}" && ${filter}`
    });
    return results;
}


// == Utils ========

// TODO: this is kind of hard to read
export function applyRoute(holds: Hold[], route: Route | undefined) {
    if (!route?.holds) return holds.map(hold => ({ ...hold, style: "default" }));
    const holdsMap = new Map(holds.map((hold) => [hold.id, hold]));
    function getStyleReducer(style: string) {
        return (acc: Hold[], holdId: number) => {
            const hold = holdsMap.get(holdId);
            if (hold) {
                hold.style = style;
                acc.push(hold);
            }
            return acc;
        };
    }
    return route.holds?.holds.reduce(getStyleReducer("default"), [] as Hold[])
        .concat(route.holds?.start.reduce(getStyleReducer("start"), [] as Hold[]))
        .concat(route.holds?.finish.reduce(getStyleReducer("finish"), [] as Hold[]));
}
