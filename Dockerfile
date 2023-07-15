# ass Dockerfile v0.3.1
# authors:
#  - tycrek <t@tycrek.com> (https://tycrek.com/)
#  - Zusier <zusier@pm.me> (https://github.com/Zusier)

# Node 18 image
FROM node:18.16.1

# Set working directory
WORKDIR /opt/ass-src/

# Copy directory files (config.json, source files etc.)
COPY . ./

# Install dependencies as rootless user
RUN npm i --save-dev && \
    npm run build

# Start ass
CMD npm start
