import { Client } from 'pg';

import { log } from '../log';
import { Database, DatabaseTable, DatabaseValue } from './database';

export class PostgreSQLDatabase implements Database {
    private _client: Client;

    public open():  Promise<void> { return Promise.resolve(); }
    public close(): Promise<void> { return Promise.resolve(); }

    public configure(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {

            } catch (err) {
                log.error('PostgreSQL', 'failed to initialize');
                console.error(err);
                reject(err);
            }
        });
    }

    public put(table: DatabaseTable, key: string, data: DatabaseValue): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public get(table: DatabaseTable, key: string): Promise<DatabaseValue | undefined> {
        throw new Error("Method not implemented.");
    }

    public getAll(table: DatabaseTable): Promise<{ [index: string]: DatabaseValue; }> {
        throw new Error("Method not implemented.");
    }
}