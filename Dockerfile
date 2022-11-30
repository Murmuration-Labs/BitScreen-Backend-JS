FROM node:16.17.0-bullseye-slim

# Create app directory
WORKDIR /server
# Install app dependencies
COPY . .
RUN yarn
RUN yarn global add pm2 typescript

# Bundle app source
RUN yarn build
COPY ormconfig.ts.docker ormconfig.ts

# Expose listen port
EXPOSE 3030

ENTRYPOINT ["/server/entrypoint.sh"]
