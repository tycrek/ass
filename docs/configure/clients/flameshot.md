# Flameshot

The Flameshot script has been updated to be a lot more dynamic, including adding support for [cheek](https://github.com/tycrek/cheek#readme), my serverless ShareX upload server. To set cheek mode, edit the file [`flameshot-v2.sh`](https://github.com/tycrek/ass/blob/dev/0.15.0/flameshot-v2.sh) and set `MODE=0` to `MODE=1`.

To set your token (not in use yet, can be random) and domain for the script, create these directories with the following files:

- `~/.ass/` (or `~/.cheek/`)
- `~/.ass/.token`
- `~/.ass/.domain`

For `.domain`, you do **not** need to include `http(s)://`.
