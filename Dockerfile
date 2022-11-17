# ass Dockerfile v0.3.1
# authors:
#  - tycrek <t@tycrek.com> (https://tycrek.com/)
#  - Zusier <zusier@pm.me> (https://github.com/Zusier)

# Node 16 image
FROM node:16.14.0

# Set working directory
WORKDIR /opt/ass/

# Copy directory files (config.json, source files etc.)
COPY . ./

# Ensure these directories & files exist for compose volumes
RUN mkdir -p /opt/ass/uploads/thumbnails/ && \
    mkdir -p /opt/ass/share/ && \
    touch /opt/ass/config.json && \
    touch /opt/ass/auth.json && \
    touch /opt/ass/data.json

# Install dependencies as rootless user
RUN npm i --save-dev && \
    npm run build

# Start ass
CMD npm start
