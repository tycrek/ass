const uuid = require('uuid').v4;
module.exports = () => uuid().replace(/-/g, '');

// If directly called on the command line, generate a new token
require.main === module && console.log(`Here is your new token:\n\n ${module.exports()}\n\nThis token has been automatically applied and is ready for use. You do not need to restart 'ass'.`);
