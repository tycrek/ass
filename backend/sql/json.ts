import { AssFile, AssUser, FilesSchema, UsersSchema, Database, DatabaseTable, DatabaseValue } from 'ass';

import path, { resolve } from 'path';
import fs from 'fs-extra';

import { log } from '../log.js';
import { nanoid } from '../generators.js';

/**
 * Absolute filepaths for JSON data files
 */
const PATHS = {
    files: path.join('.ass-data/files.json'),
    users: path.join('.ass-data/users.json')
};

/**
 * map from tables to paths
 */
const PATHMAP = {
    assfiles: PATHS.files,
    assusers: PATHS.users
} as { [index: string]: string };

/**
 * map from tables to sectors 
 */
const SECTORMAP = {
    assfiles: 'files',
    assusers: 'users'
} as { [index: string]: string };

const bothWriter = async (files: FilesSchema, users: UsersSchema) => {
    await fs.writeJson(PATHS.files, files, { spaces: '\t' });
    await fs.writeJson(PATHS.users, users, { spaces: '\t' });
};

/**
 * Creates a JSON file with a given empty data template
 */
const createEmptyJson = (filepath: string, emptyData: any): Promise<void> => new Promise(async (resolve, reject) => {
    try {
        if (!(await fs.pathExists(filepath))) {
            await fs.ensureFile(filepath);
            await fs.writeJson(filepath, emptyData, { spaces: '\t' });
        }
        resolve(void 0);
    } catch (err) {
        reject(err);
    }
});

/**
 * Ensures the data files exist and creates them if required
 */
export const ensureFiles = (): Promise<void> => new Promise(async (resolve, reject) => {
    log.debug('Checking data files');

    try {

        // * Default files.json
        await createEmptyJson(PATHS.files, {
            files: {},
            useSql: false,
            meta: {}
        } as FilesSchema);

        // * Default users.json
        await createEmptyJson(PATHS.users, {
            tokens: [],
            users: {},
            cliKey: nanoid(32),
            useSql: false,
            meta: {}
        } as UsersSchema);

        log.debug('Data files exist');
        resolve();
    } catch (err) {
        log.error('Failed to verify existence of data files');
        reject(err);
    }
});

/**
 * JSON database. i know json isnt sql, shut up.
 */
export class JSONDatabase implements Database {
    public open(): Promise<void> { return Promise.resolve() }
    public close(): Promise<void> { return Promise.resolve() }

    public configure(): Promise<void> {
        return new Promise((resolve, reject) => {
            ensureFiles();

            resolve();
        });
    }

    public put(table: DatabaseTable, key: string, data: DatabaseValue): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (table == 'assfiles') {
                // ? Local JSON
                const filesJson = await fs.readJson(PATHS.files) as FilesSchema;

                // Check if key already exists
                if (filesJson.files[key] != null) return reject(new Error(`File key ${key} already exists`));

                // Otherwise add the data
                filesJson.files[key] = data as AssFile;

                // Also save the key to the users file
                const usersJson = await fs.readJson(PATHS.users) as UsersSchema;
                // todo: uncomment this once users are implemented
                // usersJson.users[data.uploader].files.push(key);

                // Save the files
                await bothWriter(filesJson, usersJson);

                resolve()
            } else if (table == 'assusers') {
                // ? Local JSON
                const usersJson = await fs.readJson(PATHS.users) as UsersSchema;

                // Check if key already exists
                if (usersJson.users[key] != null) return reject(new Error(`User key ${key} already exists`));

                // Otherwise add the data
                usersJson.users[key] = data as AssUser;

                await fs.writeJson(PATHS.users, usersJson, { spaces: '\t' });

                resolve();
            }
        })
    }

    public get(table: DatabaseTable, key: string): Promise<DatabaseValue> {
        return new Promise(async (resolve, reject) => {
            const data = (await fs.readJson(PATHMAP[table]))[SECTORMAP[table]][key];
            (!data) ? reject(new Error(`Key '${key}' not found in '${table}'`)) : resolve(data);
        });
    }

    public getAll(table: DatabaseTable): Promise<DatabaseValue[]> {
        return new Promise(async (resolve, reject) => {
            const data = (await fs.readJson(PATHMAP[table]))[SECTORMAP[table]];
            // todo: fix this
            (!data) ? resolve(data) : resolve(data);
        });
    }
}