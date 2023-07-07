import express, { json as BodyParserJson } from 'express';
import fs from 'fs-extra';
import { path, isProd } from '@tycrek/joint';
import { log } from './log';

/**
 * Core Express server config.
 * This is separate from the user configuration starting in 0.15.0
 */
interface ServerConfiguration {
    host: string,
    port: number,
    proxied: boolean
}

/**
 * Main function.
 * Yes I'm using main() in TS, cry about it
 */
async function main() {

    // Set default server configuration
    const serverConfig: ServerConfiguration = {
        host: '0.0.0.0',
        port: 40115,
        proxied: isProd()
    };

    // Replace with user details, if necessary
    try {
        const exists = await fs.pathExists(path.join('server.json'));
        if (exists) {

            // Read file
            const { host, port, proxied } = await fs.readJson(path.join('server.json')) as { host?: string, port?: number, proxied?: boolean };

            // Set details, if available
            if (host) serverConfig.host = host;
            if (port) serverConfig.port = port;
            if (proxied != undefined) serverConfig.proxied = proxied;

            log.debug('server.json', `${host ? `host=${host},` : ''}${port ? `port=${port},` : ''}${proxied != undefined ? `proxied=${proxied},` : ''}`);
        }
    } catch (err) {
        log.error('Failed to read server.json');
        console.error(err);
        throw err;
    }

    // Set up Express
    const app = express();

    app.enable('case sensitive routing');
    app.disable('x-powered-by');

    app.set('trust proxy', serverConfig.proxied);
    app.set('view engine', 'pug');
    app.set('views', 'views2/');

    // Middleware
    app.use(log.express());
    app.use(BodyParserJson());

    // todo: routing

    // Host app
    app.listen(serverConfig.port, serverConfig.host, () => log.success('Server listening', 'Ready for uploads'));
}

// Launch log
const pkg = fs.readJsonSync(path.join('package.json')) as { name: string, version: string };
log.blank()
    .info(pkg.name, pkg.version)
    .blank();

// Start program
main().catch(() => process.exit(1));
