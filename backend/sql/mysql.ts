import mysql, { Pool } from 'mysql2/promise';
import { UserConfig } from '../UserConfig';
import { log } from '../log';

type TableNamesType = 'assfiles' | 'assusers' | 'asstokens';

export class MySql {
	private static _pool: Pool;

	private static _ready: boolean = false;
	public static get ready() { return MySql._ready; }

	/**
	 * Quick function for creating a simple JSON table
	 */
	private static _tableManager(mode: 'create' | 'drop', name: string, schema = '( NanoID varchar(255), Data JSON )'): Promise<void> {
		return new Promise((resolve, reject) =>
			MySql._pool.query(
				mode === 'create'
					? `CREATE TABLE ${name} ${schema};`
					: `DROP TABLE ${name};`)
				.then(() => resolve())
				.catch((err) => reject(err)));
	}

	/**
	 * Build the MySQL client and create the tables
	 */
	public static configure(): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {

				// Config check
				if (!UserConfig.ready) throw new Error('User configuration not ready');
				if (!UserConfig.config.sql?.mySql) throw new Error('MySQL configuration missing');

				// Create the pool
				MySql._pool = mysql.createPool(UserConfig.config.sql.mySql);

				// Check if the pool is usable
				const [rowz, _fields] = await MySql._pool.query(`SHOW FULL TABLES WHERE Table_Type LIKE 'BASE TABLE';`);
				const rows_tableData = rowz as unknown as { [key: string]: string }[];

				// Create tables if needed
				if (rows_tableData.length === 0) {
					log.warn('MySQL', 'Tables do not exist, creating');
					await Promise.all([
						MySql._tableManager('create', 'assfiles'),
						MySql._tableManager('create', 'assusers'),
						MySql._tableManager('create', 'asstokens')
					]);
					log.success('MySQL', 'Tables created').callback(resolve);
				} else {

					// There's at least one row, do further checks
					const tablesExist = { files: false, users: false, tokens: false };

					// Check which tables ACTUALLY do exist
					for (let row of rows_tableData) {
						const table = row[`Tables_in_${UserConfig.config.sql!.mySql!.database}`
						] as TableNamesType;
						if (table === 'assfiles') tablesExist.files = true;
						if (table === 'assusers') tablesExist.users = true;
						if (table === 'asstokens') tablesExist.tokens = true;
						// ! Don't use `= table === ''` because this is a loop
					}

					// Mini-function for creating a one-off table
					const createOneTable = async (name: TableNamesType) => {
						log.warn('MySQL', `Table '${name}' missing, creating`);
						await MySql._tableManager('create', name);
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
						log.info('MySQL', 'Tables exist, ready').callback(resolve(void 0));
					else throw new Error('Table(s) missing!');
				}
			} catch (err) {
				log.error('MySQL', 'failed to initialize');
				console.error(err);
				reject(err);
			}
		});
	}
}
