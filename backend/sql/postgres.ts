import { PostgresConfiguration, Database, DatabaseTable, DatabaseValue } from 'ass';

import pg from 'pg';
import { log } from '../log.js';
import { UserConfig } from '../UserConfig.js';

/**
 * database adapter for postgresql 
 */
export class PostgreSQLDatabase implements Database {
    private _client: pg.Client;

    /**
     * validate config
     */
    private _validateConfig(): string | undefined {
        // make sure the configuration exists
        if (!UserConfig.ready) return 'User configuration not ready';
        if (typeof UserConfig.config.database != 'object') return 'PostgreSQL configuration missing';
        if (UserConfig.config.database.kind != "postgres") return 'Database not set to PostgreSQL, but PostgreSQL is in use, something has gone terribly wrong';
        if (typeof UserConfig.config.database.options != 'object') return 'PostgreSQL configuration missing';

        let config = UserConfig.config.database.options;

        // check the postgres config
        const checker = (val: string) => val != null && val !== '';
        const issue =
            !checker(config.host) ? 'Missing PostgreSQL Host'
                : !checker(config.user) ? 'Missing PostgreSQL User'
                    : !checker(config.password) ? 'Missing PostgreSQL Password'
                        : !checker(config.database) ? 'Missing PostgreSQL Database'
                            // ! Blame VS Code for this weird indentation
                            : undefined;

        return issue;

    }

    public open(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                // config check
                let configError = this._validateConfig();
                if (configError) throw new Error(configError);

                // grab the config
                let config = UserConfig.config.database!.options! as PostgresConfiguration;

                // set up the client
                this._client = new pg.Client({
                    host: config.host,
                    port: config.port,
                    user: config.user,
                    password: config.password,
                    database: config.database,
                });

                // connect to the database
                log.info('PostgreSQL', `connecting to ${config.host}:${config.port}`);
                await this._client.connect();
                log.success('PostgreSQL', 'ok');

                resolve();
            } catch (err) {
                log.error('PostgreSQL', 'failed to connect');
                console.error(err);
                reject(err);
            }
        });
    }

    public close(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                // gracefully disconnect
                await this._client.end();

                resolve();
            } catch (err) {
                log.error('PostgreSQL', 'failed to disconnect');
                console.error(err);
                reject(err);
            }
        });
    }

    public configure(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                await this._client.query(
                    `CREATE TABLE IF NOT EXISTS asstables (
    name    TEXT PRIMARY KEY,
    version INT NOT NULL
);`);

                log.info('PostgreSQL', 'checking database');

                // update tables
                let seenRows = new Set<string>();
                let versions = await this._client.query('SELECT * FROM asstables;');
                for (let row of versions.rows) {
                    seenRows.add(row.name);
                }

                const assTableSchema = '(id TEXT PRIMARY KEY, data JSON NOT NULL)'

                // add missing tables
                if (!seenRows.has('assfiles')) {
                    log.warn('PostgreSQL', 'assfiles missing, repairing...')
                    await this._client.query(
                        `CREATE TABLE assfiles ${assTableSchema};` +
                        `INSERT INTO asstables (name, version) VALUES ('assfiles', 1);`
                    );
                    log.success('PostgreSQL', 'ok');
                }

                if (!seenRows.has('assusers')) {
                    log.warn('PostgreSQL', 'asstokens missing, repairing...')
                    await this._client.query(
                        `CREATE TABLE assusers ${assTableSchema};` +
                        `INSERT INTO asstables (name, version) VALUES ('assusers', 1);`
                    );
                    log.success('PostgreSQL', 'ok');
                }

                if (!seenRows.has('asstokens')) {
                    log.warn('PostgreSQL', 'asstokens missing, repairing...')
                    await this._client.query(
                        `CREATE TABLE asstokens ${assTableSchema};` +
                        `INSERT INTO asstables (name, version) VALUES ('asstokens', 1);`
                    );
                    log.success('PostgreSQL', 'ok');
                }

                log.success('PostgreSQL', 'database is ok').callback(() => {
                    resolve();
                });
            } catch (err) {
                log.error('PostgreSQL', 'failed to set up');
                console.error(err);
                reject(err);
            }
        });
    }

    public put(table: DatabaseTable, key: string, data: DatabaseValue): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                const queries = {
                    assfiles: 'INSERT INTO assfiles (id, data) VALUES ($1, $2);',
                    assusers: 'INSERT INTO assusers (id, data) VALUES ($1, $2);',
                    asstokens: 'INSERT INTO asstokens (id, data) VALUES ($1, $2);'
                };

                let result = await this._client.query(queries[table], [key, data]);

                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    public get(table: DatabaseTable, key: string): Promise<DatabaseValue> {
        return new Promise(async (resolve, reject) => {
            try {
                const queries = {
                    assfiles: 'SELECT data FROM assfiles WHERE id = $1::text;',
                    assusers: 'SELECT data FROM assusers WHERE id = $1::text;',
                    asstokens: 'SELECT data FROM asstokens WHERE id = $1::text;'
                };

                let result = await this._client.query(queries[table], [key]);

                resolve(result.rowCount ? result.rows[0].data : void 0);
            } catch (err) {
                reject(err);
            }
        });
    }

    // todo: verify this works
    public getAll(table: DatabaseTable): Promise<DatabaseValue[]> {
        return new Promise(async (resolve, reject) => {
            try {
                const queries = {
                    assfiles: 'SELECT json_object_agg(id, data) AS stuff FROM assfiles;',
                    assusers: 'SELECT json_object_agg(id, data) AS stuff FROM assusers;',
                    asstokens: 'SELECT json_object_agg(id, data) AS stuff FROM asstokens;'
                };

                let result = await this._client.query(queries[table]);

                resolve(result.rowCount ? result.rows[0].stuff : void 0);
            } catch (err) {
                reject(err);
            }
        });
    }
}