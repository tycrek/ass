import { AssFile, AssUser, NID, UploadToken, Database, DatabaseTable, DatabaseValue } from 'ass';

import mysql, { Pool } from 'mysql2/promise';

import { log } from '../log.js';
import { UserConfig } from '../UserConfig.js';

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

	/**
	 * validate the mysql config
	 */
	private _validateConfig(): string | undefined {
		// make sure the configuration exists
		if (!UserConfig.ready) return 'User configuration not ready';
		if (typeof UserConfig.config.database != 'object') return 'MySQL configuration missing';
		if (UserConfig.config.database.kind != "mysql") return 'Database not set to MySQL, but MySQL is in use, something has gone terribly wrong';
		if (typeof UserConfig.config.database.options != 'object') return 'MySQL configuration missing';

		let mySqlConf = UserConfig.config.database.options;

		// Check the MySQL configuration
		const checker = (val: string) => val != null && val !== '';
		const issue =
			!checker(mySqlConf.host) ? 'Missing MySQL Host'
				: !checker(mySqlConf.user) ? 'Missing MySQL User'
					: !checker(mySqlConf.password) ? 'Missing MySQL Password'
						: !checker(mySqlConf.database) ? 'Missing MySQL Database'
							// ! Blame VS Code for this weird indentation
							: undefined;

		return issue;
	}

	public open() { return Promise.resolve(); }
	public close() { return Promise.resolve(); }

	/**
	 * Build the MySQL client and create the tables
	 */
	public configure(): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				// Config check
				let configError = this._validateConfig();
				if (configError) throw new Error(configError);

				// Create the pool
				this._pool = mysql.createPool(UserConfig.config.database!.options!);

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
					log.success('MySQL', 'Tables created');
				} else {

					// There's at least one row, do further checks
					const tablesExist = { files: false, users: false, tokens: false };

					// Check which tables ACTUALLY do exist
					for (let row of rows_tableData) {
						const table = row[`Tables_in_${UserConfig.config.database!.options!.database}`
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
						log.info('MySQL', 'Tables exist, ready');
					else throw new Error('Table(s) missing!');
				}

				// We are ready!
				this._ready = true;
				resolve();
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

			try {
				if (await this.get(table, key))
					reject(new Error(`${table == 'assfiles' ? 'File' : table == 'assusers' ? 'User' : 'Token'} key ${key} already exists`));
			} catch (err: any) {
				if (!err.message.includes('not found in'))
					reject(err);
			}

			const query = `
INSERT INTO ${table} ( NanoID, Data )
VALUES ('${key}', '${JSON.stringify(data)}');
`;

			return this._pool.query(query)
				.then(() => resolve(void 0))
				.catch((err) => reject(err));
		});
	}

	public get(table: DatabaseTable, key: NID): Promise<DatabaseValue> {
		return new Promise(async (resolve, reject) => {
			try {
				// Run query
				const [rowz, _fields] = await this._pool.query(`SELECT Data FROM ${table} WHERE NanoID = '${key}';`);

				// Disgustingly interpret the query results
				const rows_tableData = (rowz as unknown as { [key: string]: string }[])[0] as unknown as ({ Data: UploadToken | AssFile | AssUser | undefined });

				if (rows_tableData?.Data) resolve(rows_tableData.Data);
				else throw new Error(`Key '${key}' not found in '${table}'`);
			} catch (err) {
				reject(err);
			}
		});
	}

	public getAll(table: DatabaseTable): Promise<DatabaseValue[]> {
		return new Promise(async (resolve, reject) => {
			try {
				// Run query
				const [rowz, _fields] = await this._pool.query(`SELECT Data FROM ${table}`);

				// Interpret results this is pain
				const rows = (rowz as unknown as { Data: UploadToken | AssFile | AssUser }[]);

				resolve(rows.map((row) => row.Data));
			} catch (err) {
				reject(err);
			}
		});
	}
}
