# ass Dockerfile v0.1.0
# authors:
#  - tycrek <t@tycrek.com> (https://tycrek.com/)
#  - Zusier <zusier@pm.me> (https://github.com/Zusier)

# Node 14 image
FROM node:14.17.3

# Set working directory
WORKDIR /opt/ass/

# Copy directory files (config.json, source files etc.)
COPY . ./

# Update npm to at least v7.x.x
RUN npm i -g npm@>=7

# Install dependencies
RUN npm i

# Start ass
CMD npm start
