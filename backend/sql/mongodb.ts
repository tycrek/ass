import { AssFile, AssUser, MongoDBConfiguration, NID, UploadToken, Database, DatabaseTable, DatabaseValue } from 'ass';

import mongoose, { Model, Mongoose, Schema } from 'mongoose';

import { UserConfig } from '../UserConfig.js';
import { log } from '../log.js';

interface TableVersion {
    name:    string;
    version: number;
}

const VERSIONS_SCHEMA = new Schema<TableVersion>({
    name:    String,
    version: Number
});

interface MongoSchema<T> {
    id:   NID,
    data: T
}

const FILE_SCHEMA = new Schema<MongoSchema<AssFile>>({
    id:   String,
    data: {
        fakeid:   String,
        fileKey:  String,
        filename: String,
        mimetype: String,
        save: {
            local: String,
            s3:    Boolean // this will break if it gets the url object
                           // but im so fucking tired of this, were just
                           // going to keep it like this until it becomes
                           // a problem
        },
        sha256:    String,
        size:      Number,
        timestamp: String,
        uploader:  String
    }
});

const TOKEN_SCHEMA = new Schema<MongoSchema<UploadToken>>({
    id:   String,
    data: {
        id:    String,
        token: String,
        hint:  String
    }
});

const USER_SCHEMA = new Schema<MongoSchema<AssUser>>({
    id:   String,
    data: {
        id:       String,
        username: String,
        password: String,
        admin:    Boolean,
        tokens:   [ String ],
        files:    [ String ],
        meta:     {
            type: String,
            get: (v: string) => JSON.parse(v),
            set: (v: string) => JSON.stringify(v)
        }
    }
});

/**
 * database adapter for mongodb 
 */
export class MongoDBDatabase implements Database {
    private _client: Mongoose;

    // mongoose models
    private _versionModel: Model<TableVersion>;
    private _fileModel:    Model<MongoSchema<AssFile>>;
    private _tokenModel:   Model<MongoSchema<UploadToken>>;
    private _userModel:    Model<MongoSchema<AssUser>>;

    private _validateConfig(): string | undefined {
        // make sure the configuration exists
		if (!UserConfig.ready) return 'User configuration not ready';
		if (typeof UserConfig.config.database != 'object') return 'MongoDB configuration missing';
		if (UserConfig.config.database.kind != 'mongodb') return 'Database not set to MongoDB, but MongoDB is in use, something has gone terribly wrong';
		if (typeof UserConfig.config.database.options != 'object') return 'MongoDB configuration missing';

		let config = UserConfig.config.database.options;

		// check the postgres config
		const checker = (val: string) => val != null && val !== '';
		const issue =
			!checker(config.host) ? 'Missing MongoDB Host'
				: !checker(config.user) ? 'Missing MongoDB User'
					: !checker(config.password) ? 'Missing MongoDB Password'
						: !checker(config.database) ? 'Missing MongoDB Database'
							// ! Blame VS Code for this weird indentation
							: undefined;

		return issue;
    }

    open(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                // validate config
                let configError = this._validateConfig();
                if (configError != null) throw new Error(configError);

                let options = UserConfig.config.database!.options! as MongoDBConfiguration;

                // connect
                log.info('MongoDB', `connecting to ${options.host}:${options.port}`);
                this._client = await mongoose.connect(`mongodb://${options.user}:${options.password}@${options.host}:${options.port}/${options.database}`);
                log.success('MongoDB', 'ok');

                resolve();
            } catch (err) {
                log.error('MongoDB', 'failed to connect');
                console.error(err);
                reject(err);
            }
        });
    }

    close(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                // gracefully disconnect
                await this._client.disconnect();

                resolve();
            } catch (err) {
                log.error('MongoDB', 'failed to disconnect');
                console.error(err);
                reject(err);
            }
        });
    }

    configure(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                this._versionModel = this._client.model('assversions', VERSIONS_SCHEMA);
                this._fileModel    = this._client.model('assfiles',    FILE_SCHEMA);
                this._tokenModel   = this._client.model('asstokens',   TOKEN_SCHEMA);
                this._userModel    = this._client.model('assusers',    USER_SCHEMA);

                // theres only one version right now so we dont need to worry about anything, just adding the version thingies if they arent there
                let versions = await this._versionModel.find().exec()
                    .then(res => res.reduce((obj, doc) => obj.set(doc.name, doc.version), new Map<string, number>()));

                for (let [table, version] of [['assfiles', 1], ['asstokens', 1], ['assusers', 1]] as [string, number][]) {
                    if (!versions.has(table)) {
                        // set the version
                        new this._versionModel({
                            name:    table, 
                            version: version
                        }).save();

                        versions.set(table, version);
                    }
                }

                resolve();
            } catch (err) {
                log.error('MongoDB', 'failed to configure');
                console.error(err);
                reject(err);
            }
        });
    }

    put(table: DatabaseTable, key: string, data: DatabaseValue): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                const models = {
                    assfiles:  this._fileModel,
                    assusers:  this._userModel,
                    asstokens: this._tokenModel
                };

                await new models[table]({
                    id:   key,
                    data: data
                }).save();

                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    get(table: DatabaseTable, key: string): Promise<DatabaseValue> {
        return new Promise(async (resolve, reject) => {
            try {
                const models = {
                    assfiles:  this._fileModel,
                    assusers:  this._userModel,
                    asstokens: this._tokenModel
                };

                // @ts-ignore
                // typescript cant infer this but it is 100% correct
                // no need to worry :>
                let result = await models[table].find({
                    id: key
                }).exec();

                if (result.length == 0) {
                    throw new Error(`Key '${key}' not found in '${table}'`);
                }

                resolve(result.length ? result[0].data : void 0);
            } catch (err) {
                reject(err);
            }
        });
    }

    // TODO: Unsure if this works.
    getAll(table: DatabaseTable): Promise<DatabaseValue[]> {
        return new Promise(async (resolve, reject) => {
            try {
                const models = {
                    assfiles:  this._fileModel,
                    assusers:  this._userModel,
                    asstokens: this._tokenModel
                };

                // more ts-ignore!
                // @ts-ignore
                let result = await models[table].find({}).exec() // @ts-ignore
                    .then(res => res.reduce((obj, doc) => (obj.push(doc.data)), [])); 
                
                resolve(result);
            } catch (err) {
                reject(err);
            }
        });
    }
};