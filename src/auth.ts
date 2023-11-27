/**
 * Used for global auth management
 */

import fs from 'fs-extra';
import { nanoid } from 'nanoid';
import { Request } from 'express';
import bcrypt from 'bcrypt';
import { log, path } from './utils';
import { data } from './data';
import { User, Users, OldUsers } from './types/auth';
import { FileData } from './types/definitions';

const SALT_ROUNDS = 10;

/**
 * !!!!!
 * Things for tycrek to do:
 * - [x] Add a way to configure passwords
 * - [x] Create new users
 * - [ ] Modify user (admin, meta, replace token/token history)
 * - [ ] Delete user
 * - [x] Get user
 * - [x] Get users
 * - [x] Get user by token
 */

/**
 * Map of users
 */
export const users = [] as User[];

/**
 * Migrates the old auth.json format to the new one
 * @since v0.14.0
 */
const migrate = (authFileName = 'auth.json'): Promise<Users> => new Promise(async (resolve, reject) => {

	// Get ready to read the old auth.json file
	const authPath = path(authFileName);
	const oldUsers = fs.readJsonSync(authPath).users as OldUsers;

	// Create a new users object
	const newUsers: Users = { users: [], meta: {}, cliKey: nanoid(32) };
	newUsers.migrated = true;

	// Loop through each user
	await Promise.all(Object.entries(oldUsers).map(async ([token, { username }]) => {

		// Determine if this user is the admin
		const admin = Object.keys(oldUsers).indexOf(token) === 0;
		const passhash = admin ? await bcrypt.hash(nanoid(32), SALT_ROUNDS) : '';

		// Create a new user object
		const newUser: User = {
			unid: nanoid(),
			username,
			passhash,
			token,
			admin,
			meta: {}
		};

		newUsers.users.push(newUser);
	}));

	// Save the new users object to auth.json
	fs.writeJson(authPath, newUsers, { spaces: '\t' })
		.catch(reject)

		// Migrate the datafile (token => uploader)
		.then(() => (!data())
			? (log.warn('data.json not found. This may be a new install?'), Promise.resolve())
			: data().get().then((fileData: [string, FileData][]) =>

				// ! A note about this block.
				// I know it's gross. But using Promise.all crashes low-spec servers, so I had to do it this way. Sorry.
				// Thanks to CoPilot for writing `runQueue` :D

				// Wait for all the deletions and puts to finish
				new Promise((resolve, reject) => {

					// Create a queue of functions to run
					const queue = fileData.map(([key, file]) => async () => {

						// We need to use `newUsers` because `users` hasn't been re-assigned yet
						const user = newUsers.users.find((user) => user.token === file.token!)?.unid ?? ''; // ? This is probably fine

						// Because of the stupid way I wrote papito, we need to DEL before we can PUT
						await data().del(key);

						// PUT the new data
						return data().put(key, { ...file, uploader: user });
					});

					// Recursively run the queue, hopefully sequentially without running out of memory
					const runQueue = (index: number) => {
						if (index >= queue.length) return resolve(void 0);
						queue[index]().then(() => runQueue(index + 1)).catch(reject);
					};

					runQueue(0);
				}))
				.catch((err: any) => log.warn(err.message))
		)
		// We did it hoofuckingray
		.then(() => log.success('Migrated all auth & file data to new auth system'))
		.then(() => resolve(newUsers))
		.catch((err) => (
			log.blank().blank().blank()
				.info('READ THIS', 'If you see this after installation, please run ass once again before asking for help. This error will automatically fix itself.')
				.blank()
				.info('Hey you', 'Read that message ^^')
				.blank().blank().blank(),
			reject(err)));
});

/**
 * Creates a new user account
 * @since v0.14.0
 */
export const createNewUser = (username: string, password: string, admin: boolean, meta?: { [key: string]: any }): Promise<User> => new Promise(async (resolve, reject) => {

	// Create a new user object
	const newUser: User = {
		unid: nanoid(),
		username,
		passhash: await bcrypt.hash(password, SALT_ROUNDS),
		token: nanoid(32),
		admin,
		meta: meta || {}
	};

	// Add the user to the users map
	users.push(newUser);

	// Save the new user to auth.json
	const authPath = path('auth.json');
	const authData = fs.readJsonSync(authPath) as Users;

	if (!authData.users) authData.users = [];
	authData.users.push(newUser);

	if (!authData.meta) authData.meta = {};

	// Check if the CLI key is set
	if (!authData.cliKey || authData.cliKey.length === 0) {
		log.debug('CLI key is not set, generating new key');
		authData.cliKey = nanoid(32);
	}

	fs.writeJson(authPath, authData, { spaces: '\t' })
		.then(() => log.info('Created new user', newUser.username, newUser.unid))
		.then(() => resolve(newUser))
		.catch(reject);
});

/**
 * Sets the password for a user
 * @since v0.14.0
 */
export const setUserPassword = (unid: string, password: string): Promise<User> => new Promise(async (resolve, reject) => {

	// Find the user
	const user = users.find((user) => user.unid === unid);
	if (!user) return reject(new Error('User not found'));

	// Set the password
	user.passhash = await bcrypt.hash(password, SALT_ROUNDS);

	// Save the new user to auth.json
	const authPath = path('auth.json');
	const authData = fs.readJsonSync(authPath) as Users;
	const userIndex = authData.users.findIndex((user) => user.unid === unid);
	authData.users[userIndex] = user;
	fs.writeJson(authPath, authData, { spaces: '\t' })
		.then(() => log.info('Set password for user', user.username, user.unid))
		.then(() => resolve(user))
		.catch(reject);
});

/**
 * Check a username & password, and return the token if it's correct
 * @since v0.14.2
 */
export const checkUser = (username: string, password: string): Promise<string> => new Promise(async (resolve, reject) => {

	// Find the user
	const user = users.find((user) => user.username === username);
	if (!user) return reject(new Error('User not found'));

	// Check the password
	const match = await bcrypt.compare(password, user.passhash);
	if (!match) return reject(new Error('Incorrect password'));

	// Return the token
	resolve(user.token);
});

/**
 * Deletes a user account
 * @since v0.14.1
 */
export const deleteUser = (unid: string): Promise<void> => new Promise((resolve, reject) => {

	// Find the user
	const user = users.find((user) => user.unid === unid);
	if (!user) return reject(new Error('User not found'));

	// Remove the user from the users map
	users.splice(users.indexOf(user), 1);

	let fileCount: number;

	// Remove the user's files
	data().get().then((fileData: [string, FileData][]) => new Promise((resolve, reject) => {

		// Create a queue of functions to run
		const queue = fileData.map(([key, file]) => async () => {
			if (file.uploader === unid) {
				// Delete the file
				const p = path(file.path);
				await fs.unlink(p);

				// Delete the thumbnail
				const t = path(`uploads/thumbnails/${file.thumbnail}`);
				await fs.unlink(t);

				// Delete the info from the datafile
				await data().del(key);
			}
		});

		fileCount = queue.length;

		// Recursively run the queue (see note above in `migrate()`)
		const runQueue = (index: number) => {
			if (index >= queue.length) return resolve(void 0);
			queue[index]().then(() => runQueue(index + 1)).catch(reject);
		};

		runQueue(0);
	})
		.then(() => {

			// Save the new user to auth.json
			const authPath = path('auth.json');
			const authData = fs.readJsonSync(authPath) as Users;
			const userIndex = authData.users.findIndex((user) => user.unid === unid);
			authData.users.splice(userIndex, 1);
			return fs.writeJson(authPath, authData, { spaces: '\t' })
		})
		.then(() => log.info('Deleted user', user.unid, `${fileCount} files deleted`))
		.then(() => resolve())
		.catch(reject));
});

/**
 * Sets a meta value for a user
 * @since v0.14.1
 */
export const setUserMeta = (unid: string, key: string, value: any, force = false): Promise<User> => new Promise((resolve, reject) => {

	// Find the user
	const user = users.find((user) => user.unid === unid);
	if (!user) return reject(new Error('User not found'));

	// Set the meta value
	if (user.meta[key] && !force) return reject(new Error('Meta key already exists'));

	user.meta[key] = value;

	// Save the new user to auth.json
	const authPath = path('auth.json');
	const authData = fs.readJsonSync(authPath) as Users;
	const userIndex = authData.users.findIndex((user) => user.unid === unid);
	authData.users[userIndex] = user;
	fs.writeJson(authPath, authData, { spaces: '\t' })
		.then(() => log.info('Set meta value for', user.unid, `${key}=${value}`))
		.then(() => resolve(user))
		.catch(reject);
});

/**
 * Deletes a meta value for a user
 * @since v0.14.1
 */
export const deleteUserMeta = (unid: string, key: string): Promise<User> => new Promise((resolve, reject) => {

	// Find the user
	const user = users.find((user) => user.unid === unid);
	if (!user) return reject(new Error('User not found'));

	// Delete the meta value
	if (!user.meta[key]) return reject(new Error('Meta key does not exist'));

	delete user.meta[key];

	// Save the new user to auth.json
	const authPath = path('auth.json');
	const authData = fs.readJsonSync(authPath) as Users;
	const userIndex = authData.users.findIndex((user) => user.unid === unid);
	authData.users[userIndex] = user;
	fs.writeJson(authPath, authData, { spaces: '\t' })
		.then(() => log.info('Deleted meta value for', user.unid, key))
		.then(() => resolve(user))
		.catch(reject);
});

/**
 * Sets the username for a user
 * @since v0.14.1
 */
export const setUsername = (unid: string, username: string): Promise<User> => new Promise((resolve, reject) => {

	// Find the user
	const user = users.find((user) => user.unid === unid);
	if (!user) return reject(new Error('User not found'));

	// Check if the username is already taken
	if (users.find((user) => user.username === username)) return reject(new Error('Username already taken'));

	// Set the username
	user.username = username;

	// Save the new user to auth.json
	const authPath = path('auth.json');
	const authData = fs.readJsonSync(authPath) as Users;
	const userIndex = authData.users.findIndex((user) => user.unid === unid);
	authData.users[userIndex] = user;
	fs.writeJson(authPath, authData, { spaces: '\t' })
		.then(() => log.info('Set username for', user.unid, username))
		.then(() => resolve(user))
		.catch(reject);
});

/**
 * Resets a token
 * @since v0.14.1
 */
export const resetToken = (unid: string): Promise<User> => new Promise((resolve, reject) => {

	// Find the user
	const user = users.find((user) => user.unid === unid);
	if (!user) return reject(new Error('User not found'));

	// Reset the token
	user.token = nanoid(32);

	// Save the new user to auth.json
	const authPath = path('auth.json');
	const authData = fs.readJsonSync(authPath) as Users;
	const userIndex = authData.users.findIndex((user) => user.unid === unid);
	authData.users[userIndex] = user;
	fs.writeJson(authPath, authData, { spaces: '\t' })
		.then(() => log.info('Reset token for', user.unid))
		.then(() => resolve(user))
		.catch(reject);
});

/**
 * Called by ass.ts on startup
 * @since v0.14.0
 */
export const onStart = (authFile = 'auth.json') => new Promise((resolve, reject) => {
	// Reset user array (https://stackoverflow.com/questions/1232040/how-do-i-empty-an-array-in-javascript#1232046)
	// ! I don't think this works properly..?
	users.splice(0, users.length);

	const file = path(authFile);
	log.debug('Reading', file);

	// Check if the file exists
	fs.stat(file)

		// Create the file if it doesn't exist
		.catch((_errStat) => {
			log.debug('File does not exist', authFile, 'will be created automatically');
			return fs.writeJson(file, { migrated: true });
		})
		.catch((errWriteJson) => log.error('Failed to create auth.json').callback(() => reject(errWriteJson)))

		// File exists or was created
		.then(() => fs.readJson(file))
		.then((json: Users) => {

			// Check if the file is the old format
			if (json.migrated === undefined || !json.migrated) return (
				log.debug('auth.json is in old format, migrating'),
				migrate(authFile));
			else return json;
		})
		.then(async (json) => {

			// Check if the file is empty
			if (!json.users || json.users.length === 0) {
				log.debug('auth.json is empty, creating default user');
				return await createNewUser('ass', nanoid(), true);
			}

			// Add users to the map
			return json.users.forEach((user) => users.push(user));
		})
		.catch((errReadJson) => log.error('Failed to read auth.json').callback(() => reject(errReadJson)))
		.then(resolve);
});

/**
 * Retrieves a user using their upload token. Returns `null` if the user does not exist.
 * @since v0.14.0
 */
export const findFromToken = (token: string) => users.find((user) => user.token === token) || null;

/**
 * Verifies that the upload token in the request exists in the user map
 * @since v0.14.0
 */
export const verifyValidToken = (req: Request) => req.headers.authorization && findFromToken(req.headers.authorization);

/**
 * Verifies that the CLI key in the request matches the one in auth.json
 * @since v0.14.0
 */
export const verifyCliKey = (req: Request) => {
	const cliKey: string = fs.readJsonSync(path('auth.json')).cliKey;
	return req.headers.authorization != null && req.headers.authorization === cliKey;
};
