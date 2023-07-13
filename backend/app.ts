import express, { Request, Response, NextFunction, RequestHandler, json as BodyParserJson } from 'express';
import fs from 'fs-extra';
import { path, isProd } from '@tycrek/joint';
import { epcss } from '@tycrek/express-postcss';
import tailwindcss from 'tailwindcss';
import { log } from './log';
import { ServerConfiguration } from 'ass';

/**
 * Custom middleware to attach the ass object (and construct the `host` property)
 */
function assMetaMiddleware(port: number, proxied: boolean): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction) => {
        req.ass = { host: `${req.protocol}://${req.hostname}${proxied ? '' : `:${port}`}` };
        next();
    }
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
    app.use(assMetaMiddleware(serverConfig.port, serverConfig.proxied));

    // CSS
    app.use('/.css', epcss({
        cssPath: path.join('tailwind2.css'),
        plugins: [
            tailwindcss,
            (await import('autoprefixer')).default(),
            (await import('cssnano')).default(),
            (await import('@tinycreek/postcss-font-magician')).default(),
        ],
        warn: (warning: Error) => log.warn('PostCSS', warning.toString())
    }));

    app.get('/.ass.host', (req, res) => res.send(req.ass.host));

    // Routing
    app.use('/setup', (await import('./routers/setup')).router);
    app.use('/', (await import('./routers/index')).router);

    // Host app
    const userConfigExists = await fs.pathExists(path.join('userconfig.json'));
    app.listen(serverConfig.port, serverConfig.host, () => log[userConfigExists ? 'success' : 'warn']('Server listening', userConfigExists ? 'Ready for uploads' : 'Setup required', `click http://127.0.0.1:${serverConfig.port}`));
}

// Launch log
const pkg = fs.readJsonSync(path.join('package.json')) as { name: string, version: string };
log.blank()
    .info(pkg.name, pkg.version)
    .blank();

// Start program
main().catch(() => process.exit(1));

// Exit tasks
['SIGINT', 'SIGTERM'].forEach((signal) => process.addListener(signal as any, () => {

    // Hide ^C in console output
    process.stdout.write('\r');

    // Log then exit
    log.info('Exiting', `received ${signal}`);
    process.exit();
}));
