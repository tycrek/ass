declare module 'ass' {

    type IdType = 'random' | 'original' | 'gfycat' | 'timestamp' | 'zws'

    /**
     * Core Express server config.
     * This is separate from the user configuration starting in 0.15.0
     */
    interface ServerConfiguration {
        host: string,
        port: number,
        proxied: boolean
    }

    interface UserConfiguration {
        uploadsDir: string;
        idType: IdType;
        idSize: number;
        gfySize: number;
        maximumFileSize: number;
    }
}

//#region Dummy modules
declare module '@tinycreek/postcss-font-magician';
//#endregion

// don't commit
/* future UserConfig options:
    mediaStrict: boolean;
    viewDirect: boolean;
    viewDirectDiscord: boolean;
    adminWebhook: {}
    s3: {}
*/
