/**
 * Used for global auth management
 */

import fs from 'fs-extra';
import { nanoid } from 'nanoid';
import { Request } from 'express';
import bcrypt from 'bcrypt';
import { log, path, arrayEquals } from './utils';
import { data } from './data';
import { User, Users, OldUsers } from './types/auth';
import { FileData } from './types/definitions';

const SALT_ROUNDS = 10;

/**
 * !!!!!
 * Things for tycrek to do:
 * - [ ] Add a way to configure passwords
 * - [ ] Create new users
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
	const newUsers: Users = { users: [], meta: {} };
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
		.then(() => data().get())
		.then((fileData: [string, FileData][]) =>

			// Wait for all the deletions and puts to finish
			Promise.all(fileData.map(async ([key, file]) => {

				// We need to use `newUsers` because `users` hasn't been re-assigned yet
				const user = newUsers.users.find((user) => user.token === file.token!)?.unid ?? ''; // ? This is probably fine

				// Because of the stupid way I wrote papito, we need to DEL before we can PUT
				await data().del(key);

				// PUT the new data
				return data().put(key, { ...file, uploader: user });
			})))

		// We did it hoofuckingray
		.then(() => log.success('Migrated all auth & file data to new auth system'))
		.then(() => resolve(newUsers))
		.catch(reject);
});

/**
 * This is a WIP
 */
export const createNewUser = (username: string, password: string, admin: boolean, meta?: { [key: string]: User }): Promise<User> => new Promise(async (resolve, reject) => {

	// todo: finish this

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
	authData.users.push(newUser);
	fs.writeJson(authPath, authData, { spaces: '\t' });
});

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
	fs.writeJson(authPath, authData, { spaces: '\t' });
});

/**
 * Called by ass.ts on startup
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
		.catch((errWriteJson) => log.error('Failed to create auth.json').callback(reject, errWriteJson))

		// File exists or was created
		.then(() => fs.readJson(file))
		.then((json: Users) => {

			// Check if the file is the old format
			if (json.migrated === undefined || !json.migrated) return (
				log.debug('auth.json is in old format, migrating'),
				migrate(authFile));
			else return json;
		})
		.then((json: Users) => {

			// Check if the file is empty
			if (Object.keys(json).length === 0) {
				log.debug('auth.json is empty, creating default user');
				//return createDefaultUser(); // todo: need to do this
			}

			// Add users to the map
			json.users.forEach((user) => users.push(user));
		})
		.catch((errReadJson) => log.error('Failed to read auth.json').callback(reject, errReadJson))
		.then(resolve);
});

/**
 * Retrieves a user using their upload token. Returns `null` if the user does not exist.
 */
export const findFromToken = (token: string) => {
	return users.find((user) => user.token === token) || null;
};

/**
 * Verifies that the upload token in the request exists in the user map
 */
export const verifyValidToken = (req: Request) => {
	return req.headers.authorization && findFromToken(req.headers.authorization);
};

// todo: move inside of onStart (currently broken)
// Monitor auth.json for changes (triggered by running 'npm run new-token')
/* fs.watch(path('auth.json'), { persistent: false },
	(eventType: String) => eventType === 'change' && fs.readJson(path('auth.json'))
		.then((json: { users: JSON[] }) => {
			if (!(arrayEquals(Object.keys(users), Object.keys(json.users)))) {
				// @ts-ignore
				Object.keys(json.users).forEach((token) => (!Object.prototype.hasOwnProperty.call(users, token)) && (users[token] = json.users[token]));
				log.info('New token added', Object.keys(users)[Object.keys(users).length - 1] || 'No new token');
			}
		})
		.catch(console.error));
 */