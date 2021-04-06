# anssxustawai
A Not Shitty ShareX Upload Server That Actually Works As Intended (Pronounced "an-zoo-sta-why")

This project is still very young, so don't expect *everything* to be perfect yet.

## Features

- ✔️ Token authorization via HTTP `Authorization` header
- ✔️ Upload images, videos, files
- ❌ Thumbnail support
- ✔️ Delete support
- ❌ Multiple database types (JSON, Mongo, MySQL, PostgreSQL, etc. Currently uses JSON)
- ✔️ Multiple access types
   - **[ZWS](https://zws.im)**
   - **Mixed-case alphanumeric**
   - **Original**
- ❌ Multi-user support (upload restrictions, web library, etc.)
- ❌ Block-storage support including Amazon S3
- ❌ Usage metrics

### Access types

| Type | What is it? |
| ---- | ----------- |
| **[ZWS](https://zws.im)** (Zero-width spaces) | The "fancy" mode. When pasted elsewhere, the URL appears to be *just* your domain name. |
| **Mixed-case alphanumeric** | The "safe" mode. URL's are browser safe as the character set is just letters & numbers. |
| **Original** | The "basic" mode. URL matches the same filename as when the file was uploaded. This may be prone to conflicts with files of the same name. |

## Installation

The installation may look daunting but it's really pretty straightforward. Just follow it word-for-word & you'll be fine. If you are not fine, then by all means [open an Issue](https://github.com/tycrek/anssxustawai/issues/new) & I'll try my best to help.

1. First of all you must have Node.js 14 or later installed. It might work with Node.js 12 but just use 14.
2. Clone this repo using `git clone https://github.com/tycrek/anssxustawai.git && cd anssxustawai/`
3. Run `npm i` to install the required dependencies
4. Run `npm run setup` to start the easy configuration
5. Run `npm start` to start the server. The first-time run will:
   - Create `data.json` & `auth.json`
   - Generate your first authorization token & save it to `auth.json`
6. **(Optional)** You must also configure an SSL-enabled reverse proxy (only if you want to use HTTPS):
   - I personally use Caddy, see [my tutorial](https://jmoore.dev/tutorials/2021/03/caddy-express-reverse-proxy/) on setting that up
   - You may also use Apache or Nginx as reverse proxies

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

## Known issues

- **Videos won't embed on Discord**: I know. This is because Discord developers make some really stupid decisions & only show embeds if the URL ends with `.mp4`. So the workaround: manually type "`.mp4`" after pasting your URL. This will be fixed in the future with a "Discord mode" for video uploads.
