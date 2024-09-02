/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Routes = "routes",
	Sends = "sends",
	Sets = "sets",
	Shares = "shares",
	UserSettings = "user_settings",
	Users = "users",
	UsersShares = "users_shares",
	Walls = "walls",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

// System fields
export type BaseSystemFields<T = never> = {
	id: RecordIdString
	created: IsoDateString
	updated: IsoDateString
	collectionId: string
	collectionName: Collections
	expand?: T
}

export type AuthSystemFields<T = never> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type RoutesRecord<Tholds = unknown> = {
	draft?: boolean
	free_feet?: boolean
	holds?: null | Tholds
	name?: string
	set: RecordIdString
	setter?: RecordIdString
	setter_grade?: number
	top_out?: boolean
}

export type SendsRecord = {
	grade?: number
	rating?: number
	route: RecordIdString
	sent?: boolean
	user: RecordIdString
}

export type SetsRecord<Tholds = unknown> = {
	draft?: boolean
	holds: null | Tholds
	image: string
	name?: string
	wall: RecordIdString
}

export type SharesRecord = {
	editing?: boolean
	wall: RecordIdString
}

export enum UserSettingsGradingSystemOptions {
	"v" = "v",
	"font" = "font",
	"dankyu" = "dankyu",
}
export type UserSettingsRecord = {
	grading_system?: UserSettingsGradingSystemOptions
	user?: RecordIdString
}

export type UsersRecord = {
	avatar?: string
	name?: string
}

export type UsersSharesRecord = {
	banned?: boolean
	last_accessed?: IsoDateString
	share?: RecordIdString
	user?: RecordIdString
}

export type WallsRecord = {
	allow_training?: boolean
	current_set?: RecordIdString
	name: string
	owner: RecordIdString
	public?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type RoutesResponse<Tholds = unknown, Texpand = unknown> = Required<RoutesRecord<Tholds>> & BaseSystemFields<Texpand>
export type SendsResponse<Texpand = unknown> = Required<SendsRecord> & BaseSystemFields<Texpand>
export type SetsResponse<Tholds = unknown, Texpand = unknown> = Required<SetsRecord<Tholds>> & BaseSystemFields<Texpand>
export type SharesResponse<Texpand = unknown> = Required<SharesRecord> & BaseSystemFields<Texpand>
export type UserSettingsResponse<Texpand = unknown> = Required<UserSettingsRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>
export type UsersSharesResponse<Texpand = unknown> = Required<UsersSharesRecord> & BaseSystemFields<Texpand>
export type WallsResponse<Texpand = unknown> = Required<WallsRecord> & BaseSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	routes: RoutesRecord
	sends: SendsRecord
	sets: SetsRecord
	shares: SharesRecord
	user_settings: UserSettingsRecord
	users: UsersRecord
	users_shares: UsersSharesRecord
	walls: WallsRecord
}

export type CollectionResponses = {
	routes: RoutesResponse
	sends: SendsResponse
	sets: SetsResponse
	shares: SharesResponse
	user_settings: UserSettingsResponse
	users: UsersResponse
	users_shares: UsersSharesResponse
	walls: WallsResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: 'routes'): RecordService<RoutesResponse>
	collection(idOrName: 'sends'): RecordService<SendsResponse>
	collection(idOrName: 'sets'): RecordService<SetsResponse>
	collection(idOrName: 'shares'): RecordService<SharesResponse>
	collection(idOrName: 'user_settings'): RecordService<UserSettingsResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
	collection(idOrName: 'users_shares'): RecordService<UsersSharesResponse>
	collection(idOrName: 'walls'): RecordService<WallsResponse>
}
