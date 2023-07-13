const fs = require('fs-extra');
const { path } = require('@tycrek/joint');
const log = new (require('@tycrek/log').TLog)();

log.info('Fixing frontend JS');

// Read & fix file data
const setupUiFile = path.join('dist-frontend/setup.mjs');
const setupUiNew = fs.readFileSync(setupUiFile).toString().replace('export {};', '');

// Write new file
fs.writeFileSync(setupUiFile, setupUiNew);

log.success('Fixed.');
