<div align="center">
  <h1><a href="https://github.com/tycrek/ass" target="_blank"><img height="180" alt="ass" src="https://i.tycrek.dev/ass-round-square-logo-white-with-text"></a></h1>

![GitHub package.json version]
![GitHub license]
![GitHub last commit]
![GitHub Repo stars]
[![Discord badge]][Discord invite]

</div>

**ass** is a self-hosted ShareX upload server written in TypeScript.

[GitHub package.json version]: https://img.shields.io/github/package-json/v/tycrek/ass?color=fd842d&style=for-the-badge
[GitHub license]: https://img.shields.io/github/license/tycrek/ass?color=FD7C21&style=for-the-badge
[GitHub last commit]: https://img.shields.io/github/last-commit/tycrek/ass?color=FD710D&style=for-the-badge
[GitHub Repo stars]: https://img.shields.io/github/stars/tycrek/ass?color=F26602&style=for-the-badge
[Discord badge]: https://img.shields.io/discord/848274994375294986?label=Discord&logo=Discord&logoColor=FFF&style=for-the-badge
[Discord invite]: https://discord.gg/wGZYt5fasY

## Features

###### Out of date

#### For users

- Upload images, gifs, videos, audio, & files
- Token-based authentication
- Download & delete resources
- GPS data automatically removed
- Fully customizable Discord embeds
- Built-in web viewer with video & audio player
- Dashboard to manage your files
- Embed images, gifs, & videos directly in Discord
- Personal upload log using customizable Discord Webhooks
- macOS/Linux support with alternative clients such as [Flameshot] ([script for ass]) & [MagicCap]
- **Multiple URL styles**
   - Mixed-case alphanumeric
   - Gfycat
   - Timestamp
   - Original
   - ZWS

#### For hosts & developers

- Multi-user support
- Run locally or via Docker
- API for developers to write custom interfaces
- **Multiple file storage methods**
   - Local file system
   - S3
- **Multiple data storage methods**
   - JSON
   - MySQL
   - PostgreSQL

[Flameshot]: https://flameshot.org/
[script for ass]: #flameshot-users-linux
[MagicCap]: https://magiccap.me/

### Access types

| Type | What is it? |
| ---- | ----------- |
| **Mixed-case alphanumeric** | The "safe" mode. URL's are browser safe as the character set is just letters & numbers. |
| **Gfycat** | Gfycat-style ID's (for example: `https://example.com/unsung-discrete-grub`). Thanks to [Gfycat] for the wordlists |
| **Timestamp** | The quick but dirty mode. URL is a timestamp of when the file was uploaded, in milliseconds. This is the most unique mode, but also potentially the longest (Gfycat could be longer, easily). **Keep in mind this is vulnerable to iteration attacks** |
| **Original** | The "basic" mode. URL matches the same filename as when the file was uploaded. This may be prone to conflicts with files of the same name. |
| **ZWS** | "Zero-width spaces": when pasted elsewhere, the URL appears to be *just* your domain name. Some browsers or sites may not recognize these URLs (Discord sadly no longer supports these as of April 2023) |

[Gfycat]: https://gfycat.com

## Installation

ass supports two installation methods: Docker & local.

### Docker

<details>
<summary><em>Expand for Docker/Docker Compose installation steps</em></summary>
<br>

[Docker Compose] is the recommended way to install ass. These steps assume you already Docker & Docker Compose v2 installed.

[Docker Compose]: https://docs.docker.com/compose/

#### Install using docker-compose

0. This repo comes with a pre-made Compose file.
1. Clone the repo using `git clone https://github.com/tycrek/ass.git && cd ass/`
2. Run `docker compose up`
   - You can append `-d` to run in the background.
3. When the logs indicate, visit your installation in your browser to begin the setup.

</details>

### Local

<details>
<summary><em>Expand for local installation steps</em></summary>
<br>

1. You should have **Node.js 20** & **npm 10 or later** installed. 
2. Clone this repo using `git clone https://github.com/tycrek/ass.git && cd ass/`
3. Run `pnpm i` or `npm i`
4. Run `npm run build`
5. Run `npm start`
6. When the logs indicate, visit your installation in your browser to begin the setup.

</details>

# the readme from this point is out of date

## Using HTTPS

For HTTPS support, you must configure a reverse proxy. I recommend [Caddy] but any reverse proxy works fine (such as Apache or Nginx). A sample config for Caddy is provided below:

```
ass.example.com {
    reverse_proxy localhost:40115
}
```

[Caddy]: https://caddyserver.com/

## Cloudflare users

In your Cloudflare DNS dashboard, set your domain/subdomain to **DNS Only** if you experience issues with **Proxied**. This may not be necessary for all users.

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
   - URL: `{json:.resource}`
   - Thumbnail: `{json:.thumbnail}`
   - Deletion URL: `{json:.delete}`
   - Error message: `{response}`
   - MagicCap users: **do not** include the `.` in the above & replace `{}` with `$` (i.e. `$json:resource$`)
6. The file `sample_config.sxcu` can also be modified & imported to suit your needs

### Header overrides

If you need to override a specific part of the config to be different from the global config, you may do so via "`X`" HTTP headers:

| Header | Purpose |
| ------ | ------- |
| **`X-Ass-Domain`** | Override the domain returned for the clipboard (useful for multi-domain hosts) |
| **`X-Ass-Access`** | Override the generator used for the resource URL. Must be one of: `original`, `zws`, `gfycat`, `random`, or `timestamp` ([see above](#access-types)) |
| **`X-Ass-Gfycat`** | Override the length of Gfycat ID's. Defaults to `2` |
| **`X-Ass-Timeoffset`** | Override the timestamp offset. Defaults to `UTC+0`. Available options are whatever [Luxon] accepts (for example: `America/Edmonton` or `UTC-7`) |

[Luxon]: https://moment.github.io/luxon/#/zones?id=specifying-a-zone

### Fancy embeds

If you primarily share media on Discord, you can add these additional (optional) headers to build embeds:

| Header | Purpose |
| ------ | ------- |
| **`X-Ass-OG-Title`** | Large text shown above your media. Required for embeds to appear on desktop. |
| **`X-Ass-OG-Description`** | Small text shown below the title but above the media (does not show up on videos) |
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

#### Server-side embed configuration

You may also specify a default embed config on the server. Keep in mind that if users specify the `X-Ass-OG-Title` header, the server-side config will be ignored. To configure the server-side embed, create a new file in the `share/` directory named `embed.json`. Available options are:

- **`title`**
- `description`
- `author`
- `authorUrl`
- `provider`
- `providerUrl`
- `color`

Their values are equivalent to the headers listed above.

### Webhooks

You may use Discord webhooks as an easy way to keep track of your uploads. The first step is to [create a new Webhook]. You only need to follow the first section, **Making a Webhook**. Once you are done that, click **Copy Webhook URL**. Finally, add these headers to your custom uploader:

| Header | Purpose |
| ------ | ------- |
| **`X-Ass-Webhook-Url`** | The **Webhook URL** you copied |
| **`X-Ass-Webhook-Username`** | (Optional) the "username" of the Webhook; can be set to whatever you want |
| **`X-Ass-Webhook-Avatar`** | (Optional) URL to an image to use as the Webhook avatar. Use the **full** URL including `https://` |

Webhooks will show the filename, mimetype, size, upload timestamp, thumbail, & a link to delete the file. To disable webhooks, simply remove the headers from your config.

[create a new Webhook]: https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks

## Customizing the viewer

If you want to customize the font or colours of the viewer page, create a file in the `share/` directory called `theme.json`. Available options are:

| Option | Purpose |
| ------ | ------- |
| **`font`** | The font family to use; defaults to `"Josefin Sans"`. Fonts with a space should be surrounded by double quotes. |
| **`bgPage`** | Background colour for the whole page |
| **`bgViewer`** | Background colour for the viewer element |
| **`txtPrimary`** | Primary text colour; this should be your main brand colour. |
| **`txtSecondary`** | Secondary text colour; this is used for the file details. |
| **`linkPrimary`** | Primary link colour |
| **`linkHover`** | Colour of the `hover` effect for links |
| **`linkActive`** | Colour of the `active` effect for links |
| **`borderHover`** | Colour of the `hover` effect for borders; this is used for the underlining links. |

## Custom index

By default, ass directs the index route `/` to this README. Follow these steps to use a custom index:

1. Create a file in the `share/` directory called `index.html` or `index.js`.
   - ass will treat `index.html` as an HTML file and will send it to the client.
   - ass will treat `index.js` as a Node.js file that exports a function representing [Express middleware](https://expressjs.com/en/guide/using-middleware.html). ass will pass all handling of the index to this function. The function should take three arguments: `(req, res, next)`. Some code samples for common use cases are provided below.
   - If both `index.html` and `index.js` are present, the `index.html` file will be served first.
2. Add whatever you want to the file.
3. Restart ass. The startup info logs should mention which file is being used as the index.

### Custom index code samples

**Redirect to a custom frontend registration page**

```js
module.exports = (req, res, next) => res.redirect('/register');
```

## Custom 404 page

To use a custom 404 page, create a file in the `share/` directory called `404.html`. Restart ass, and any requests to missing resources will return HTTP 404 with the contents of this file.

If there's interest, I may allow making this a function, similar to the custom index.

## File storage

ass supports three methods of file storage: local, S3, or [Skynet].

### Local

Local storage is the simplest option, but relies on you having a lot of disk space to store files, which can be costly.

### S3

Any existing object storage server that's compatible with [Amazon S3] can be used with ass. I personally host my files using Digital Ocean Spaces, which implements S3.

S3 servers are generally very fast & have very good uptime, though this will depend on the hosting provider & plan you choose.

## New user system (v0.14.0)

The user system was overhauled in v0.14.0 to allow more features and flexibility. New fields on users include `admin`, `passhash`, `unid`, and `meta` (these will be documented more once the system is finalized).

New installs will automatically generate a default user. Check the `auth.json` file for the token. You will use this for API requests and to authenticate within ShareX.

ass will automatically convert your old `auth.json` to the new format. **Always backup your `auth.json` and `data.json` before updating**. By default, the original user (named `ass`) will be marked as an admin.

### Adding users

You may add users via the CLI or the API. I'll document the API further in the future.

#### CLI

```bash
npm run cli-adduser <username> <password> [admin] [meta]
```

| Argument | Purpose |
| -------- | ------- |
| **`username`** `string` | The username of the user. |
| **`password`** `string` | The password of the user. |
| **`admin?`** `boolean` | Whether the user is an admin. Defaults to `false`. |
| **`meta?`** `string` | Any additional metadata to store on the user, as a JSON string. |

**Things still not added:**

- Modifying/deleting users via the API

## Developer API

ass includes an API (v0.14.0) for frontend developers to easily integrate with. Right now the API is pretty limited but I will expand on it in the future, with frontend developer feedback.

Any endpoints requiring authorization will require an `Authorization` header with the value being the user's upload token. Admin users are a new feature introduced in v0.14.0. Admin users can access all endpoints, while non-admin users can only access those relevant to them.

Other things to note:

- **All endpoints are prefixed with `/api/`**.
- All endpoints will return a JSON object unless otherwise specified.
- Successful endpoints *should* return a `200` status code. Any errors will use the corresponding `4xx` or `5xx` status code (such as `401 Unauthorized`).
- ass's API will try to be as compliant with the HTTP spec as possible. For example, using `POST/PUT` for create/modify, and response codes such as `409 Conflict` for duplicate entries. This compliance may not be 100% perfect, but I will try my best.

### API endpoints

| Endpoint | Purpose | Admin? |
| -------- | ------- | ------ |
| **`GET /user/`** | Returns a list of all users | Yes |
| **`GET /user/:id`** | Returns the user with the given ID | Yes |
| **`GET /user/self`** | Returns the current user | No |
| **`GET /user/token/:token`** | Returns the user with the given token | No |
| **`POST /user/`** | Creates a new user. Request body must be a JSON object including `username` and `password`. You may optionally include `admin` (boolean) or `meta` (object). Returns 400 if fails. | Yes |
| **`POST /user/password/reset/:id`** | Force resets the user's **password**. Request body must be a JSON object including a `password`. | Yes |
| **`DELETE /user/:id`** | Deletes the user with the given ID, as well as all their uploads. | Yes |
| **`PUT /user/meta/:id`** | Updates the user's metadata. Request body must be a JSON object with keys `key` and `value`, with the key/value you want to set in the users metadata. Optionally you may include `force: boolean` to override existing keys. | Yes |
| **`DELETE /user/meta/:id`** | Deletes a key/value from a users metadata. Request body must be a JSON object with a `key` property specifying the key to delete. | Yes |
| **`PUT /user/username/:id`** | Updates the user's username. Request body must be a JSON object with a `username` property. | Yes |
| **`PUT /user/token/:id`** | Regenerates a users upload token | Yes |

## Custom frontends - OUTDATED

**Please be aware that this section is outdated (marked as of 2022-04-15). It will be updated when I overhaul the frontend system.**

**Update 2022-12-24: I plan to overhaul this early in 2023.**

ass is intended to provide a strong backend for developers to build their own frontends around. [Git Submodules] make it easy to create custom frontends. Submodules are their own projects, which means you are free to build the router however you wish, as long as it exports the required items. A custom frontend is really just an [Express.js router].

**For a detailed walkthrough on developing your first frontend, [consult the wiki][ctw1].**

[Git Submodules]: https://git-scm.com/book/en/v2/Git-Tools-Submodules
[Express.js router]: https://expressjs.com/en/guide/routing.html#express-router
[ctw1]: https://github.com/tycrek/ass/wiki/Writing-a-custom-frontend

## Data Engines

[Papito data engines] are responsible for managing your data. "Data" has two parts: an identifier & the actual data itself. With ass, the data is a JSON object representing the uploaded resource. The identifier is the unique ID in the URL returned to the user on upload. **Update August 2022:** I plan to overhaul Papito and how all this works *eventually*. If this comment is still here in a year, ~~kick~~ message me.

[Papito data engines]: https://github.com/tycrek/papito

**Supported data engines:**

| Name | Description | Links |
| :--: | ----------- | :---: |
| **JSON** | JSON-based data storage. On disk, data is stored in a JSON file. In memory, data is stored in a [Map]. This is the default engine. | [GitHub][GH ASE]<br>[npm][npm ASE] |
| **PostgreSQL** | Data storage using a [PostgreSQL] database. [node-postgres] is used for communicating with the database. | [GitHub][GH APSQL]<br>[npm][npm APSQL] |
| **Mongoose** | Data storage using a [MongoDB] database. [mongoose] is used for communicating with the database. Created by [@dylancl] | [GitHub][GH AMongoose]<br>[npm][npm AMongoose] |

[Map]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
[GH ASE]: https://github.com/tycrek/papito/
[npm ASE]: https://www.npmjs.com/package/@tycrek/papito
[PostgreSQL]: https://www.postgresql.org/
[node-postgres]: https://node-postgres.com/
[GH APSQL]: https://github.com/tycrek/ass-psql/
[npm APSQL]: https://www.npmjs.com/package/@tycrek/ass-psql
[MongoDB]: https://www.mongodb.com/
[mongoose]: https://mongoosejs.com/
[GH AMongoose]: https://github.com/dylancl/ass-mongoose
[npm AMongoose]: https://www.npmjs.com/package/ass-mongoose
[@dylancl]: https://github.com/dylancl

A Papito data engine implements support for one type of database (or file, such as JSON or YAML). This lets ass server hosts pick their database of choice, because all they'll have to do is enter the connection/authentication details & ass will handle the rest, using the resource ID as the key.

**~~For a detailed walkthrough on developing engines, [consult the wiki][ctw2].~~ Outdated!**

[`data.js`]: https://github.com/tycrek/ass/blob/master/data.js
[ctw2]: https://github.com/tycrek/ass/wiki/Writing-a-StorageEngine

## npm scripts

ass has a number of pre-made npm scripts for you to use. **All** of these scripts should be run using `npm run <script-name>` (except `start`).

| Script | Description |
| ------ | ----------- |
| **`start`** | Starts the ass server. This is the default script & is run with **`npm start`**. |
| `build` | Compiles the TypeScript files into JavaScript. |
| `dev` | Chains the `build` & `compile` scripts together. |
| `setup` | Starts the easy setup process. Should be run after any updates that introduce new config options. |
| `metrics` | Runs the metrics script. This is a simple script that outputs basic resource statistics. |
| `purge` | Purges all uploads & data associated with them. This does **not** delete any users, however. |
| `engine-check` | Ensures your environment meets the minimum Node & npm version requirements. |

[`FORCE_COLOR`]: https://nodejs.org/dist/latest-v16.x/docs/api/cli.html#cli_force_color_1_2_3

## Flameshot users (Linux)

Use [this script]. For the `KEY`, put your token. Thanks to [@ToxicAven] for creating this!

[this script]: https://github.com/tycrek/ass/blob/master/flameshot_example.sh
[@ToxicAven]: https://github.com/ToxicAven

## Contributing

Please follow the [Contributing Guidelines] when submiting Issues or Pull Requests.

[Contributing Guidelines]: https://github.com/tycrek/ass/blob/master/.github/CONTRIBUTING.md

## Credits

- Thanks to [hlsl#1359] for the logo
- [Gfycat] for their wordlists
- [Aven], for helping kickstart the project
- My spiteful ass for motivating me to actually take this project to new heights

[hlsl#1359]: https://behance.net/zevwolf
[Aven]: https://github.com/ToxicAven

