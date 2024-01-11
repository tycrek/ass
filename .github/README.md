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

### Webhooks

You may use Discord webhooks as an easy way to keep track of your uploads. The first step is to [create a new Webhook]. You only need to follow the first section, **Making a Webhook**. Once you are done that, click **Copy Webhook URL**. Finally, add these headers to your custom uploader:

| Header | Purpose |
| ------ | ------- |
| **`X-Ass-Webhook-Url`** | The **Webhook URL** you copied |
| **`X-Ass-Webhook-Username`** | (Optional) the "username" of the Webhook; can be set to whatever you want |
| **`X-Ass-Webhook-Avatar`** | (Optional) URL to an image to use as the Webhook avatar. Use the **full** URL including `https://` |

Webhooks will show the filename, mimetype, size, upload timestamp, thumbail, & a link to delete the file. To disable webhooks, simply remove the headers from your config.

[create a new Webhook]: https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks

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

## Flameshot users (Linux)

Use [`flameshot-v2.sh`] or [`sample_screenshotter.sh`].

[`flameshot-v2.sh`]: https://github.com/tycrek/ass/blob/dev/0.15.0/flameshot-v2.sh
[`sample_screenshotter.sh`]: https://github.com/tycrek/ass/blob/dev/0.15.0/sample_screenshotter.sh

## Contributing

Please follow the [Contributing Guidelines] when submiting Issues or Pull Requests.

[Contributing Guidelines]: https://github.com/tycrek/ass/blob/master/.github/CONTRIBUTING.md

## Credits

- Thanks to [hlsl#1359] for the logo
- [Gfycat] for their wordlists
- [Aven], for helping kickstart the project

[hlsl#1359]: https://behance.net/zevwolf
[Aven]: https://github.com/ToxicAven

