import { AssFile, AssUser, NID, UploadToken } from 'ass';

import mysql, { Pool } from 'mysql2/promise';

import { log } from '../log';
import { UserConfig } from '../UserConfig';
import { Database, DatabaseTable, DatabaseValue } from './database';

export class MySQLDatabase implements Database {
	private _pool: Pool;

	private _ready: boolean = false;
	public get ready() { return this._ready; }

	/**
	 * Quick function for creating a simple JSON table
	 */
	private _tableManager(mode: 'create' | 'drop', name: string, schema = '( NanoID varchar(255), Data JSON )'): Promise<void> {
		return new Promise((resolve, reject) =>
			this._pool.query(
				mode === 'create'
					? `CREATE TABLE ${name} ${schema};`
					: `DROP TABLE ${name};`)
				.then(() => resolve())
				.catch((err) => reject(err)));
	}

	public open()  { return Promise.resolve(); }
	public close() { return Promise.resolve(); }

	/**
	 * Build the MySQL client and create the tables
	 */
	public configure(): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				// Config check
				if (!UserConfig.ready) throw new Error('User configuration not ready');
				if (!UserConfig.config.sql?.mySql) throw new Error('MySQL configuration missing');

				// Create the pool
				this._pool = mysql.createPool(UserConfig.config.sql.mySql);

				// Check if the pool is usable
				const [rowz, _fields] = await this._pool.query(`SHOW FULL TABLES WHERE Table_Type LIKE 'BASE TABLE';`);
				const rows_tableData = rowz as unknown as { [key: string]: string }[];

				// Create tables if needed
				if (rows_tableData.length === 0) {
					log.warn('MySQL', 'Tables do not exist, creating');
					await Promise.all([
						this._tableManager('create', 'assfiles'),
						this._tableManager('create', 'assusers'),
						this._tableManager('create', 'asstokens')
					]);
					log.success('MySQL', 'Tables created').callback(resolve);
				} else {

					// There's at least one row, do further checks
					const tablesExist = { files: false, users: false, tokens: false };

					// Check which tables ACTUALLY do exist
					for (let row of rows_tableData) {
						const table = row[`Tables_in_${UserConfig.config.sql!.mySql!.database}`
						] as DatabaseTable;
						if (table === 'assfiles') tablesExist.files = true;
						if (table === 'assusers') tablesExist.users = true;
						if (table === 'asstokens') tablesExist.tokens = true;
						// ! Don't use `= table === ''` because this is a loop
					}

					// Mini-function for creating a one-off table
					const createOneTable = async (name: DatabaseTable) => {
						log.warn('MySQL', `Table '${name}' missing, creating`);
						await this._tableManager('create', name);
						log.success('MySQL', `Table '${name}' created`);
					}

					// Check & create tables
					if (!tablesExist.files) await createOneTable('assfiles');
					if (!tablesExist.users) await createOneTable('assusers');
					if (!tablesExist.users) await createOneTable('asstokens');

					// ! temp: drop tables for testing
					/* await MySql._tableManager('drop', 'assfiles');
					await MySql._tableManager('drop', 'assusers');
					log.debug('Table dropped'); */

					// Hopefully we are ready
					if (tablesExist.files && tablesExist.users)
						log.info('MySQL', 'Tables exist, ready').callback(() => {
							this._ready = true;
							resolve(void 0);
						});
					else throw new Error('Table(s) missing!');
				}
			} catch (err) {
				log.error('MySQL', 'failed to initialize');
				console.error(err);
				reject(err);
			}
		});
	}

	public put(table: DatabaseTable, key: NID, data: DatabaseValue): Promise<void> {
		return new Promise(async (resolve, reject) => {
			if (!this._ready) return reject(new Error('MySQL not ready'));

			const query = `
INSERT INTO ${table} ( NanoID, Data )
VALUES ('${key}', '${JSON.stringify(data)}');
`;

			return this._pool.query(query)
				.then(() => resolve(void 0))
				.catch((err) => reject(err));
		});
	}

    public get(table: DatabaseTable, key: NID): Promise<DatabaseValue | undefined> {
		return new Promise(async (resolve, reject) => {
			try {
				// Run query
				const [rowz, _fields] = await this._pool.query(`SELECT Data FROM ${table} WHERE NanoID = '${key}';`);

				// Disgustingly interpret the query results
				const rows_tableData = (rowz as unknown as { [key: string]: string }[])[0] as unknown as ({ Data: UploadToken | AssFile | AssUser | undefined });

				resolve(rows_tableData?.Data ?? undefined);
			} catch (err) {
				reject(err);
			}
		});
	}

	// todo: unknown if this works
    public getAll(table: DatabaseTable): Promise<DatabaseValue[]> {
		return new Promise(async (resolve, reject) => {
			try {
				// Run query // ! this may not work as expected
				const [rowz, _fields] = await this._pool.query(`SELECT Data FROM ${table}`);

				// Interpret results this is pain
				const rows = (rowz as unknown as { [key: string]: string }[]);

				// console.log(rows);

				// aaaaaaaaaaaa
				resolve([]);
			} catch (err) {
				reject(err);
			}
		});
	}
}
