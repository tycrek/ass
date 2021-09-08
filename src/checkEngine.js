const check = require("check-node-version");
const ENGINES = require('../package.json').engines;

const TLog = require('@tycrek/log');
const logger = new TLog();

function doCheck() {
	return new Promise((resolve, reject) =>
		check(ENGINES, (err, { isSatisfied: allSatisfied, versions }) =>
			err ? reject(err) : allSatisfied ? resolve('Node & npm version requirements satisfied!')
				: reject(Object.entries(versions)
					.filter(([, { isSatisfied }]) => (!isSatisfied))
					.map(([packageName, { version: current, wanted: minimum }]) =>
						`\nInvalid ${packageName} version!\n- Current: ${current}\n- Required: ${minimum}`)
					.join('')
					.concat('\nPlease update to continue!'))));
}

if (require.main !== module) module.exports = doCheck;
else doCheck()
	.then((result) => logger.comment(`Wanted: ${ENGINES.node} (npm ${ENGINES.npm})`).node().success(result))
	.catch((err) => logger.error(err) && process.exit(1));
