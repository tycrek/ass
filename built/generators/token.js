import { v4 } from 'uuid';
import * as fs from 'fs-extra';
import * as path from 'path';
function generate() {
    return v4().replace(/-/g, '');
}
// If directly called on the command line, generate a new token
if (require.main === module) {
    let token = generate();
    let authPath = path.join(__dirname, '../..', 'auth.json');
    fs.readJson(authPath)
        .then((auth) => {
        auth.tokens.push(token);
        fs.writeJsonSync(authPath, auth, { spaces: 4 });
    })
        .then(() => console.log(`A new token has been generated and automatically applied. You do not need to restart 'ass'.\n\nYour token: ${token}`))
        .catch(console.error);
}
export default generate;
