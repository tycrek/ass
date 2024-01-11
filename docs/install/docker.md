# Docker

The Docker method uses [Docker Compose][1] for a quick and easy installation. For a faster deployment, a pre-built image is pulled from [Docker Hub](https://hub.docker.com/r/tycrek/ass).

## Requirements

- Latest [Docker](https://docs.docker.com/engine/install/)
- [Docker Compose][1] v2 plugin

[1]: https://docs.docker.com/compose/

## Install

I provide a pre-made `compose.yaml` file that makes it easier to get started.

```bash
mkdir ass && cd ass/
curl -LO https://ass.tycrek.dev/compose.yaml
docker compose up -d
```

### View logs

Use the following command to view the container logs:

```bash
docker compose logs -n <lines> --follow
```

## Build local image

If you wish to build a Docker image locally for development, you can use the provided [docker-dev-container.sh](https://github.com/tycrek/ass/blob/dev/0.15.0/docker-dev-container.sh) script.
