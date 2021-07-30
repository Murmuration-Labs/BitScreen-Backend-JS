FROM node:12-alpine
RUN apk add --no-cache --update \
  python \
  make \
  g++ \
  git \
  bash \
  curl

# Create app directory
WORKDIR /server
# Install app dependencies
COPY package*.json ./
RUN yarn install
# Bundle app source
COPY . /server
COPY ormconfig.ts.docker ormconfig.ts

# Expose listen port
EXPOSE 3030

ENTRYPOINT ["/server/entrypoint.sh"]
