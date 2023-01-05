/**
 * Defines the structure of a user
 */
export interface User {
	/**
	 * Unique ID, provided by Nano ID
	 */
	unid: string

	/**
	 * Name of the user
	 */
	username: string

	/**
	 * Hashed password. Passwords are hashed using bcrypt.
	 */
	passhash: string

	/**
	 * Token used for upload authentication
	 */
	token: string

	/**
	 * Indicates whether the user is an admin
	 */
	admin: boolean

	/**
	 * Extra metadata. Frontends can use this to store extra data.
	 */
	meta: {
		[key: string]: any
	}
}

/**
 * Defines the structure of the users.json file
 */
export interface Users {
	/**
	 * List of users. The key is the user's unique ID.
	 */
	users: User[]

	/**
	 * Indicates whether auth.json has been migrated
	 */
	migrated?: boolean

	/**
	 * Access key for the CLI
	 */
	cliKey?: string

	/**
	 * Extra metadata. Frontends can use this to store extra data.
	 */
	meta: {
		[key: string]: any
	}
}

export interface OldUser {
	username: string
	count: number
}

export interface OldUsers {
	[key: string]: OldUser
}
