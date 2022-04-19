# ass Dockerfile v0.2.0
# authors:
#  - tycrek <t@tycrek.com> (https://tycrek.com/)
#  - Zusier <zusier@pm.me> (https://github.com/Zusier)

# Node 16 image
FROM node:16.14.0

# Set working directory
WORKDIR /opt/ass/

# Create rootless user with uid/gid as 1001
RUN addgroup -g 1001 ass && \
    adduser --disabled-password --gecos "" --home "/opt/ass" --no-create-home --uid 1001 --ingroup ass ass

# Set permissions for rootless user
RUN chown -R ass /opt/ass/ && chmod -R 774 /opt/ass/

# Ensure these directories & files exist for compose volumes
RUN mkdir -p /opt/ass/uploads/thumbnails/ && \
    mkdir -p /opt/ass/share/ && \
    touch /opt/ass/config.json && \
    touch /opt/ass/auth.json && \
    touch /opt/ass/data.json

# Copy directory files (config.json, source files etc.)
COPY . ./

# Update npm to at least npm 8, then install dependencies
RUN npm i -g npm@8 typescript && \
    npm i --save-dev && \
    npm run build && \
    chown -R ass /usr/local/bin/npm

USER ass

# Start ass
CMD npm start
