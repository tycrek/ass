const check = require("check-node-version");
const ENGINES = require('./package.json').engines;

function doCheck() {
	return new Promise((resolve, reject) =>
		check(ENGINES, (err, { isSatisfied: allSatisfied }) =>
			err ? reject(err) : allSatisfied ? resolve('Node & npm version requirements satisfied!')
				: reject(Object.entries(result.versions)
					.filter(([, { isSatisfied }]) => (!isSatisfied))
					.map(([packageName, { version: current, wanted: minimum }]) =>
						`\nInvalid ${packageName} version!\n- Current: ${current}\n- Minimum: ${minimum}`)
					.join('')
					.concat('\nPlease update to continue!'))));
}

if (require.main !== module) module.exports = doCheck;
else doCheck()
	.then(console.log)
	.catch((err) => console.error(err) && process.exit(1));
