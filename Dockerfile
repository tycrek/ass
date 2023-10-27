# ass Dockerfile v0.3.3
# authors:
#  - tycrek <t@tycrek.com> (https://tycrek.com/)
#  - Zusier <zusier@pm.me> (https://github.com/Zusier)

FROM node:20.9.0-alpine
WORKDIR /opt/ass-src/
COPY . ./
RUN npm i -g pnpm
RUN pnpm i
RUN npm run build
CMD npm start