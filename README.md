# ass

![GitHub package.json version](https://img.shields.io/github/package-json/v/tycrek/ass?color=%234A148C&style=for-the-badge)
![GitHub license](https://img.shields.io/github/license/tycrek/ass?color=%236A1B9A&style=for-the-badge)
![GitHub last commit](https://img.shields.io/github/last-commit/tycrek/ass?color=%237B1FA2&style=for-the-badge)
![Lines of code](https://img.shields.io/tokei/lines/github/tycrek/ass?color=%238E24AA&label=LINES&style=for-the-badge)
![GitHub Repo stars](https://img.shields.io/github/stars/tycrek/ass?color=%239C27B0&style=for-the-badge)



**ass** is a self-hosted ShareX upload server written in Node.js. I initially started this project purely out of spite.

## Features

- ✔️ Token authorization via HTTP `Authorization` header
- ✔️ Upload images, videos, files
- ✔️ Seamless inline video embeds on Discord
- ✔️ Delete support
- ✔️ Multiple access types
   - **[ZWS](https://zws.im)**
   - **Mixed-case alphanumeric**
   - **Original**
- ❌ Thumbnail support
- ❌ Multiple database types 
   - **JSON**
   - **Mongo** (soon!)
   - **MySQL** (soon!)
   - **PostgreSQL** (soon!)
- ❌ Multi-user support (upload restrictions, web library, etc.)
- ❌ Block-storage support including Amazon S3
- ❌ Usage metrics

### Access types

| Type | What is it? |
| ---- | ----------- |
| **[ZWS](https://zws.im)** (Zero-width spaces) | The "fancy" mode. When pasted elsewhere, the URL appears to be *just* your domain name. ![ZWS sample](https://user-images.githubusercontent.com/29926144/113785625-bf43a480-96f4-11eb-8dd7-7f164f33ada2.png "ZWS sample") |
| **Mixed-case alphanumeric** | The "safe" mode. URL's are browser safe as the character set is just letters & numbers. |
| **Original** | The "basic" mode. URL matches the same filename as when the file was uploaded. This may be prone to conflicts with files of the same name. |

## Installation

The installation may look daunting but it's really pretty straightforward. Just follow it word-for-word & you'll be fine. If you are not fine, then by all means [open an Issue](https://github.com/tycrek/ass/issues/new) & I'll try my best to help.

1. First of all you must have Node.js 14 or later installed. It might work with Node.js 12 but just use 14.
2. Clone this repo using `git clone https://github.com/tycrek/ass.git && cd ass/`
3. Run `npm i` to install the required dependencies
4. Run `npm run setup` to start the easy configuration
5. Run `npm start` to start the server. The first time you run it you will be shown your first authorization token; save this as you will need it to configure ShareX.
6. **(Optional)** You must also configure an SSL-enabled reverse proxy (only if you want to use HTTPS):
   - I personally use Caddy, see [my tutorial](https://jmoore.dev/tutorials/2021/03/caddy-express-reverse-proxy/) on setting that up
   - You may also use Apache or Nginx as reverse proxies

### Generating new tokens

If you need to generate a new token at any time, run `npm run new-token`. This will **automatically** load the new token so there is no need to restart ass.

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
   - Deletion URL: `$json:.delete$`
6. The file `sample_config.sxcu` can also be modified & imported to suit your needs

### Header overrides

If you need to override a specific part of the config to be different from the global config, you may do so via "`X`" HTTP headers:

| Header | Purpose |
| ------ | ------- |
| **`X-Ass-Domain`** | Override the domain returned for the clipboard |
| **`X-Ass-Access`** | Override the generator used for the resource URI ([see above](#access-types)) |

## Contributing

No strict contributing rules at this time. I appreciate any Issues or Pull Requests.
