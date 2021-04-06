# anssxustawai
A Not Shitty ShareX Upload Server That Actually Works As Intended (Pronounced "an-zoo-sta-why")

## Features

- [x] Token authorization via HTTP `Authorization` header
- [x] Upload images, videos, files
- [ ] Thumbnail support
- [x] Delete support
- [ ] Multiple database types (JSON, Mongo, MySQL, PostgreSQL, etc.)
- [ ] Multiple access types (original, mixed-case alphanumeric, [ZWS](https://zws.im), etc. Currently uses ZWS)

## Installation

1. First of all you must have Node.js 14 or later installed. It might work with Node.js 12 but just use 14.
2. Clone this repo using `git clone https://github.com/tycrek/anssxustawai.git && cd anssxustawai/`
3. Install the required dependencies using `npm i`
4. Configure `.env.example` *before* running if you wish to
5. Run `npm start` to start. This will:
   - Automatically copy `.env.example` to `.env`
   - Creates `data.json` & `auth.json`
   - Generates your first authorization token & saves it to `auth.json`

## Configure ShareX

1. Add a new Custom Uploader in ShareX by going to `Destinations > Custom uploader settings...`
2. Under **Uploaders**, click **New** & name it whatever you like.
3. Set **Destination type** to `Image`, `Text`, & `File`
4. **Request** tab:
   - Method: `POST`
   - URL: `https://your.domain.name.here/`
   - Body: `Form data (multipart/form-data)`
   - File from name: `file`
   - Headers:
      - Name: `Authorization`
	  - Value: (the value provided by `npm start` on first run)
5. **Response** tab:
   - URL: `$json:.resource$`
   - Deletion URL: `$json:.delete$`
6. The file `sample_config.sxcu` can also be modified and imported to suit your needs
