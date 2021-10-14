# ass Dockerfile v0.2.0
# authors:
#  - tycrek <t@tycrek.com> (https://tycrek.com/)
#  - Zusier <zusier@pm.me> (https://github.com/Zusier)

# Node 14 image
FROM node:14.17.3

# Set working directory
WORKDIR /opt/ass/

# Copy directory files (config.json, source files etc.)
COPY . ./

# Update npm to at least v7.x.x,
# then install dependencies
RUN npm i -g npm@>=7 typescript && \
    npm i --save-dev && \
    npm run build

# Ensure these directories & files exist for compose volumes
RUN mkdir -p /opt/ass/uploads/thumbnails/ && \
    mkdir -p /opt/ass/share/ && \
    touch /opt/ass/config.json && \
    touch /opt/ass/auth.json && \
    touch /opt/ass/data.json

# Start ass
CMD npm start
