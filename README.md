<div align="center">
  <h1><a href="https://github.com/tycrek/ass" target="_blank"><img height="180" alt="ass" src="https://jmoore.dev/files/ass-round-square-logo-white-with-text.png"></a></h1>
</div>

![GitHub package.json version](https://img.shields.io/github/package-json/v/tycrek/ass?color=fd842d&style=for-the-badge)
![GitHub license](https://img.shields.io/github/license/tycrek/ass?color=FD7C21&style=for-the-badge)
![GitHub last commit](https://img.shields.io/github/last-commit/tycrek/ass?color=FD710D&style=for-the-badge)
![Lines of code](https://img.shields.io/tokei/lines/github/tycrek/ass?color=F26602&label=LINES&style=for-the-badge)
![GitHub Repo stars](https://img.shields.io/github/stars/tycrek/ass?color=DE5E02&style=for-the-badge)
[![Discord](https://img.shields.io/discord/848274994375294986?label=Support%20server&logo=Discord&logoColor=FFF&style=for-the-badge)](https://discord.gg/wGZYt5fasY)

**ass** is a self-hosted ShareX upload server written in Node.js. I initially started this project purely out of spite.

## Code quality

| [CodeQL](https://codeql.github.com/docs/) | [DeepSource](https://deepsource.io/) |
| :---------------------------------------: | :----------------------------------: |
| [![CodeQL](https://github.com/tycrek/ass/actions/workflows/codeql-analysis.yml/badge.svg?branch=master)](https://github.com/tycrek/ass/actions/workflows/codeql-analysis.yml) | [![DeepSource Active Issues](https://deepsource.io/gh/tycrek/ass.svg/?label=active+issues&token=BtbWb2UNuISW8jXX4VoYtdwp)](https://deepsource.io/gh/tycrek/ass/?ref=repository-badge) [![DeepSource Resolved Issues](https://deepsource.io/gh/tycrek/ass.svg/?label=resolved+issues&token=BtbWb2UNuISW8jXX4VoYtdwp)](https://deepsource.io/gh/tycrek/ass/?ref=repository-badge) |

## Features

- ✔️ Token authorization via HTTP `Authorization` header
- ✔️ Upload images, videos, gifs, audio, files
- ✔️ Usage metrics
- ✔️ File deletion
- ✔️ File downloading
- ✔️ Thumbnail support
- ✔️ Mimetype blocking
- ✔️ Basic multi-user support
- ✔️ Fully customizable Discord embeds
- ✔️ Seamless inline video embeds on Discord
- ✔️ Built-in web viewer with video & audio player
- ✔️ Personal upload log via customizable Discord Webhooks
- ✔️ Configurable global upload limit (per-user coming soon!)
- ✔️ Basic macOS/Linux support using other clients including [Flameshot](https://flameshot.org/) ([ass-compatible Flameshot script](#flameshot-users-linux)) & [MagicCap](https://magiccap.me/)
- ✔️ Custom pluggable frontends using [Git Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- ✔️ Multiple access types
   - **[ZWS](https://zws.im)**
   - **Mixed-case alphanumeric**
   - **Gfycat**
   - **Original**
- ✔️ Multiple file storage methods:
   - **Local file system**
   - **Amazon S3** (including [DigitalOcean Spaces](https://www.digitalocean.com/products/spaces/))
- ✔️ Multiple data storage methods using [ass StorageEngines](#storageengines) (JSON by default)
   - **File**
      - **JSON** (default, [ass-storage-engine](https://github.com/tycrek/ass-storage-engine))
      - **YAML** (soon!)
   - **Databases**
      - **PostgreSQL** ([ass-psql](https://github.com/tycrek/ass-psql))
      - **Mongo** (soon!)
      - **MySQL** (soon!)

### Access types

| Type | What is it? |
| ---- | ----------- |
| **[ZWS](https://zws.im)** (Zero-width spaces) | The "fancy" mode. When pasted elsewhere, the URL appears to be *just* your domain name.<br>![ZWS sample](https://user-images.githubusercontent.com/29926144/113785625-bf43a480-96f4-11eb-8dd7-7f164f33ada2.png "ZWS sample") |
| **Mixed-case alphanumeric** | The "safe" mode. URL's are browser safe as the character set is just letters & numbers. |
| **Gfycat** | Gfycat-style ID's (for example: `https://gfycat.com/unsungdiscretegrub` "unsung discrete grub"). Thanks to [Gfycat](https://gfycat.com) for the wordlists |
| **Original** | The "basic" mode. URL matches the same filename as when the file was uploaded. This may be prone to conflicts with files of the same name. |

## Installation

The installation may look daunting but it's really pretty straightforward. Just follow it word-for-word & you'll be fine. If you are not fine, then by all means [open an Issue](https://github.com/tycrek/ass/issues/new) & I'll try my best to help.

1. First of all you must have **Node.js 14 or later** & **npm 7 or later** installed. 
2. Clone this repo using `git clone https://github.com/tycrek/ass.git && cd ass/`
3. Run `npm i` to install the required dependencies
4. Run `npm run setup` to start the easy configuration
5. Run `npm start` to start the server. The first time you run it you will be shown your first authorization token; save this as you will need it to configure ShareX.
6. **(Optional)** You must also configure an SSL-enabled reverse proxy (only if you want to use HTTPS):
   - I personally use Caddy, see [my tutorial](https://jmoore.dev/tutorials/2021/03/caddy-express-reverse-proxy/) on setting that up
   - You may also use Apache or Nginx as reverse proxies

### Generating new tokens

If you need to generate a new token at any time, run `npm run new-token <username>`. This will **automatically** load the new token so there is no need to restart ass. Username field is optional; if left blank, a random username will be created.

### Cloudflare users

In your Cloudflare DNS dashboard, make sure your domain/subdomain is set to **DNS Only**.

> <img src="https://user-images.githubusercontent.com/29926144/114085791-0f467680-986f-11eb-8cdb-34a9dfae3a23.png" height="140px">

## Configure ShareX

1. Add a new Custom Uploader in ShareX by going to `Destinations > Custom uploader settings...`
2. Under **Uploaders**, click **New** & name it whatever you like.
3. Set **Destination type** to `Image`, `Text`, & `File`
4. **Request** tab:
   - Method: `POST`
   - URL: `https://your.domain.name.here/`
   - Body: `Form data (multipart/form-data)`
   - File from name: `file` (literally put "`file`" in the field)
   - Headers:
      - Name: `Authorization`
	  - Value: (the value provided by `npm start` on first run)
5. **Response** tab:
   - URL: `$json:.resource$`
   - Thumbnail: `$json:.thumbnail$`
   - Deletion URL: `$json:.delete$`
   - Error message: `$response$`
   - MagicCap users: **do not** include the `.` in the above (i.e. `$json:resource$`)
6. The file `sample_config.sxcu` can also be modified & imported to suit your needs

### Header overrides

If you need to override a specific part of the config to be different from the global config, you may do so via "`X`" HTTP headers:

| Header | Purpose |
| ------ | ------- |
| **`X-Ass-Domain`** | Override the domain returned for the clipboard (useful for multi-domain hosts) |
| **`X-Ass-Access`** | Override the generator used for the resource URI. Must be one of: `original`, `zws`, `gfycat`, or `random` ([see above](#access-types)) |
| **`X-Ass-Gfycat`** | Override the length of Gfycat ID's. Defaults to `2` |

### Fancy embeds

If you primarily share media on Discord, you can add these additional (optional) headers to build embeds:

| Header | Purpose |
| ------ | ------- |
| **`X-Ass-OG-Title`** | Large text shown above your media |
| **`X-Ass-OG-Description`** | Small text shown below the title but above the media (does not show up on videos yet) |
| **`X-Ass-OG-Author`** | Small text shown above the title |
| **`X-Ass-OG-Author-Url`** | URL to open when the Author is clicked |
| **`X-Ass-OG-Provider`** | Smaller text shown above the author |
| **`X-Ass-OG-Provider-Url`** | URL to open when the Provider is clicked |
| **`X-Ass-OG-Color`** | Colour shown on the left side of the embed. Must be one of `&random`, `&vibrant`, or a hex colour value (for example: `#fe3c29`). Random is a randomly generated hex value & Vibrant is sourced from the image itself |

#### Embed placeholders

You can insert certain metadata into your embeds with these placeholders:

| Placeholder | Result |
| ----------- | ------ |
| **`&size`** | The files size with proper notation rounded to two decimals (example: `7.06 KB`) |
| **`&filename`** | The original filename of the uploaded file |
| **`&timestamp`** | The timestamp of when the file was uploaded (example: `Oct 14, 1983, 1:30 PM`) |

### Webhooks

You may use Discord webhooks as an easy way to keep track of your uploads. The first step is to [create a new Webhook](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks). You only need to follow the first section, **Making a Webhook**. Once you are done that, click **Copy Webhook URL**. Next, paste your URL into a text editor. Extract these two values from the URL:

```
https://discord.com/api/webhooks/12345678910/T0kEn0fw3Bh00K
                                 ^^^^^^^^^^  ^^^^^^^^^^^^ 
                                 Webhook ID  Webhook Token
```

Once you have these, add the following HTTP headers to your ShareX config:

| Header | Purpose |
| ------ | ------- |
| **`X-Ass-Webhook-Client`** | The **Webhook ID** |
| **`X-Ass-Webhook-Token`** | The **Webhook Token** |
| **`X-Ass-Webhook-Username`** | (Optional) the "username" of the Webhook; can be set to whatever you want |
| **`X-Ass-Webhook-Avatar`** | (Optional) URL to an image to use as the Webhook avatar. Use the **full** URL including `https://` |

Webhooks will show the filename, mimetype, size, upload timestamp, thumbail, & a link to delete the file. To disable webhooks, simply remove the headers from your config.

## Dashboard frontends

ass is intended to provide a strong backend for developers to build their own frontends around. The easiest way to do this is with a [Git Submodule](https://git-scm.com/book/en/v2/Git-Tools-Submodules). Your submodule should be a **separate** git repo. Make sure you [adjust the `FRONTEND_NAME`](https://github.com/tycrek/ass/blob/d766bd15cf8ac851058c8abf37238f1608d8c305/ass.js#L24) to match your frontend. To make updates easier, it is recommended to make a new branch. Since submodules are their own dedicated projects, you are free to build the router however you wish, as long as it exports the required items detailed below.

Sample submodule entry file:

```js
const { name, version } = require('./package.json');
const express = require('express');
const router = express.Router();

router.all('/', (_req, res) => res.send('My awesome dashboard!'));

// These exports are REQUIRED by ass, so don't forget to set them!
module.exports = {
	router,                       // The dashboard router itself
	enabled: true,                // Required to activate frontend in ass; DO NOT change unless you want to disable your frontend
	brand: `${name} v${version}`, // Printed in ass logs & reported to client. Can be changed to your liking
	endpoint: '/dashboard'        // URL to use for your dashboard router. ass will automatically set up Express to use this value. Can be changed to your liking
};
```

Now you should see `My awesome dashboard!` when you navigate to `http://your-ass-url/dashboard`.

#### Accessing data

If you want to access resource & user data within your frontend router, just add these two lines near the top of your router:

```js
const users = require('../auth');
const data = require('../data');
```

These values are recognized globally throughout ass, so they will stay up-to-date as users upload.

#### Custom index

By default, ass directs the app index to this README. To change it, just add an `index` function to your router exports:

```js

function index(req, res, next) {
   // redirect user to dashboard
   res.redirect('/dashboard/user');

   // you can also use req & next as you normally
   // would in an Express route handler
}

module.exports = {
   router,
   index,
   enabled: true,
   brand: `${name} v${version}`,
   endpoint: '/dashboard',
};
```

**For a detailed walkthrough on developing your first frontend, [consult the wiki](https://github.com/tycrek/ass/wiki/Writing-a-custom-frontend).**

## StorageEngines

[StorageEngines](https://github.com/tycrek/ass-storage-engine) are responsible for managing your data. "Data" has two parts: an identifier & the actual data itself. With ass, the data is a JSON object representing the uploaded resource. The identifier is the unique ID in the URL returned to the user on upload.

**Supported StorageEngines:**

| Name | Description | Links |
| ---- | ----------- | ----- |
| **JSON** | JSON-based data storage. On disk, data is stored in a JSON file. In memory, data is stored in a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map). This is the default StorageEngine. | [GitHub](https://github.com/tycrek/ass-storage-engine/), [npm](https://www.npmjs.com/package/@tycrek/ass-storage-engine) |
| **PostgreSQL** | Data storage using a [PostgreSQL](https://www.postgresql.org/) database. [node-postgres](https://node-postgres.com/) is used for communicating with the database. | [GitHub](https://github.com/tycrek/ass-psql/), [npm](https://www.npmjs.com/package/@tycrek/ass-psql) |

An ass StorageEngine implements support for one type of database (or file, such as JSON or YAML). This lets ass server hosts pick their database of choice, because all they'll have to do is plugin the connection/authentication details, then ass will handle the rest, using the resource ID as the key.

The only StorageEngine ass comes with by default is **JSON**. If you find (or create!) a StorageEngine you like, you can use it by installing it with `npm i <package-name>` then changing the contents of [`data.js`](https://github.com/tycrek/ass/blob/master/data.js). The StorageEngines own README file should also instruct how to use it. At this time, a modified `data.js` might look like this:

```js
/**
 * Used for global data management
 */

//const { JsonStorageEngine } = require('@tycrek/ass-storage-engine');
const { CustomStorageEngine } = require('my-custom-ass-storage-engine');

//const data = new JsonStorageEngine();

// StorageEngines may take no parameters...
const data1 = new CustomStorageEngine();

// multiple parameters...
const data2 = new CustomStorageEngine('Parameters!!', 420);

// or object-based parameters, depending on what the StorageEngine dev decides on.
const data3 = new CustomStorageEngine({ key1: 'value1', key2: { key3: 44 } });

module.exports = data1;

```

As long as the StorageEngine properly implements `GET`/`PUT`/`DEL`/`HAS` StorageFunctions, replacing the file/database system is just that easy.

**For a detailed walkthrough on developing StorageEngines, [consult the wiki](https://github.com/tycrek/ass/wiki/Writing-a-StorageEngine).**

#### But why not "DataEngine"?

Because I was dumb & didn't know what to call it, totally forgetting that "storage engine" would also imply a way to store *files*, not just *data*.

## npm scripts

ass has a number of pre-made npm scripts for you to use. **All** of these scripts should be run using `npm run <script-name>`.

| Script | Description |
| ------ | ----------- |
| **`start`** | Starts the ass server. This is the default script & is run with **`npm start`**. |
| `setup` | Starts the easy setup process. Should be run once after installing ass, & also after any updates that introduce new configuration options. |
| `metrics` | Runs the metrics script. This is a simple script that outputs basic resource statistics. |
| `new-token` | Generates a new API token. Accepts one parameter for specifying a username, like `npm run new-token <username>`. ass automatically detects the new token & reloads it, so there's no need to restart the server. |
| `update` | Runs update tasks. These will update ass to the latest version by first restoring `package-lock.json` (which tends to overrite on `git pull`), pulling changes with `git pull`, then running `npm i` to install any new dependencies. This is the recommended way to update ass.  After updating, you will need to restart ass. |
| `update-full` | Runs the previous update script, followed by `npm run setup` to ensure that all the latest configuration options are set. The setup script uses your **existing** config for setting defaults to make updates much quicker. If any ass Release Notes say to use `update-full` instead of `update`, then use `update-full`. |
| `restart` | Restarts the ass server using `systemctl`. More info soon (should work fine if you have an existing `ass.service` file) |
| `engine-check` | Ensures your environment meets the minimum Node & npm version requirements. |
| `logs` | Uses the [tlog Socket plugin](https://github.com/tycrek/tlog#socket) to stream logs from the ass server to your terminal, with full colour support (Remember to set [`FORCE_COLOR`](https://nodejs.org/dist/latest-v14.x/docs/api/cli.html#cli_force_color_1_2_3) if you're using Systemd) |

## Flameshot users (Linux)

Use [this script](https://github.com/tycrek/ass/blob/master/flameshot_example.sh) kindly provided by [@ToxicAven](https://github.com/ToxicAven). For the `KEY`, put your token.

## Contributing

No strict contributing rules at this time. I appreciate any Issues or Pull Requests.

## Credits

- Special thanks to [hlsl#1359](http://be.net/zevwolf) for the awesome logo!
- [@ToxicAven](https://github.com/ToxicAven) for the Flameshot script
- [Gfycat](https://gfycat.com) for their wordlists
