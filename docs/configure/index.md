# Configure

Most of the configuration is managed through the administrator dashboard.

## `server.json` overrides

The webserver in ass 15 is hosted independently of any user configuration. If you wish to set a specific server setting, you may do so with a `server.json` file. 

Place this file in `<root>/.ass-data/`.

| Property | Use | Default |
| -------- | --- | ------- |
| `host` | Local IP to bind to | `0.0.0.0` |
| `port` | Port to listen on | `40115` |
| `proxied` | If ass is behind a reverse proxy | `false`, unless `NODE_ENV=production` is specified, otherwise `true` |

**Example**

```json
{
    "host": "127.0.1.2",
    "port": 40200,
    "proxied": false
}
```
