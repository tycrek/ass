import { NID, Database, DatabaseTable, DatabaseValue } from "ass";

export class DBManager {
    private static _db:      Database;
    private static _dbReady: boolean = false; 
    public static get ready() {
        return this._dbReady;
    }
    
    static {
        process.on('exit', () => {
            if (DBManager._db) DBManager._db.close();
        });
    }

    /**
     * activate a database
     */
    public static use(db: Database): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (this._db != undefined) {
                await this._db.close();
                this._dbReady = false;
            }

            this._db = db;
            await this._db.open();
            await this._db.configure();

            this._dbReady = true;
            resolve();
        });
    }

    public static configure(): Promise<void> {
        if (this._db && this._dbReady) {
            return this._db.configure();
        } else throw new Error("No database active");
    }

    /**
     * put a value in the database
     */
    public static put(table: DatabaseTable, key: NID, data: DatabaseValue): Promise<void> {
        if (this._db && this._dbReady) {
            return this._db.put(table, key, data);
        } else throw new Error("No database active");
    }

    /**
     * get a value from the database
     */
    public static get(table: DatabaseTable, key: NID): Promise<DatabaseValue> {
        if (this._db && this._dbReady) {
            return this._db.get(table, key);
        } else throw new Error("No database active");
    }

    /**
     * get all values from the database
     */
    public static getAll(table: DatabaseTable): Promise<DatabaseValue[]> {
        if (this._db && this._dbReady) {
            return this._db.getAll(table);
        } else throw new Error("No database active");
    }
}