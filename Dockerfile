# ass Dockerfile v0.3.0
# authors:
#  - tycrek <t@tycrek.com> (https://tycrek.com/)
#  - Zusier <zusier@pm.me> (https://github.com/Zusier)
#  - Zyztem <hello@zyztem.xyz (https://zyztem.xyz)
#
# This file is designed to follow the latest Compose specification, defined here: https://github.com/compose-spec/compose-spec/blob/master/spec.md
# Specific thing(s) to note:
# - The filename, `compose.yaml`: "The default path for a Compose file is compose.yaml (preferred)" (https://github.com/compose-spec/compose-spec/blob/master/spec.md#compose-file)

# The builder
FROM node:16-alpine AS BUILD
WORKDIR /build
COPY . .
RUN apk add --no-progress --no-cache --virtual .build-deps \
pkgconf python3 make g++
# Install ASS
RUN npm install --location=global npm && \
npm install --location=project --save-dev && npm run build
# Delete build deps.
RUN apk del .build-deps
# Delete unnsessasary files.
RUN rm -rf /build/Dockerfile /build/.git* /build/.github /build/sample_config.sxcu \
 /build/.deepsource.toml /build/LICENSE /build/flameshot_example.sh

# The runtime
FROM node:16-alpine AS RUNTIME
# Set Production
ENV NODE_ENV "production"
# Give Credit To The Maker
LABEL maintainer="tycrek" version="0.13.0" description="The superior self-hosted ShareX server"
# And Copy the build files.
WORKDIR /ass
COPY --from=BUILD /usr/local/bin /usr/local/bin 
COPY --from=BUILD /usr/bin /usr/bin 
COPY --from=BUILD /build/ .
# Make sure compose can bind the directorys
RUN mkdir -p /ass/uploads/thumbnails/ && \
    mkdir -p /ass/share/ && \
    touch /ass/config.json && \
    touch /ass/auth.json && \
    touch /ass/data.json
# Purge Temp Files.
RUN rm -rf /tmp/* || true
# And delete yarn, since it isnt needed
RUN rm /usr/local/bin/yarn*

# AND START 
ENTRYPOINT ["npm", "run", "start"]
