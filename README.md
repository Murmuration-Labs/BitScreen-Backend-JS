# BitScreen API

API Documentation: [here](DOCUMENTATION.md)

## Steps to run this project:
1. Clone project
2. Switch to branch development
3. `yarn install`
4. Create new file `ormconfig.json` with the content found in `ormconfig.json.example` file
5. Install PostgreSQL (or run from docker image, see the section below on Running with docker)
6. Create database bitscreen
7. Create user `bitscreen` with password `bitscreen` & grant all privileges
8. Execute sync command: `yarn schema:sync`
9. Insert entry into provider table with random created & updated timestamps and id = 0 and anonymous value to all other custom columns
10. Run -> `export JWT_SECRET=localDev` 
11. Run server -> `yarn start`


## Detailed steps (with commands) to run this project (Ubuntu 20.04):
1. Clone project
2. Switch to branch development
3. `yarn install`
4. Create new file `ormconfig.json` with the content found in `ormconfig.json.example` file
5. Install PostgreSQL -> https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-20-04
6. Access PostgreSQL -> `sudo -u PostgreSQL psql`
7. Create database called bitscreen -> `create database bitscreen;`
8. Create user called bitscreen_api with password `bitscreen` -> `create user bitscreen with encrypted password 'bitscreen';`
9. Grant privileges to user on database bitscreen -> `grant all privileges on database bitscreen to bitscreen;`
10. Execute sync command -> `yarn typeorm schema:sync`
11. From terminal connect to bitscreen database -> `\c bitscreen` (or if you aren't already in postgres interface -> `sudo -u postgres psql -d bitscreen`)
12. Insert entry into provider table with random created & updated timestamps and id = 0 and anonymous value to all other custom columns -> 
`INSERT INTO provider(created, updated, id, "walletAddressHashed", country, "businessName", website, email, "contactPerson", address) VALUES('2021-07-16 10:23:54', '2021-07-16 10:24:54', '0', 'anonymous', 'anonymous', 'anonymous', 'anonymous', 'anonymous', 'anonymous', 'anonymous');`
12. Run server -> `yarn start`

## Using TypeORM
- Run `yarn typeorm` to see a complete list of available commands.
examples: schema:sync, schema:log, query [query]

### Seeding the db
- Remove `"type": "module"` from `package.json`
- Set `"module": "CommonJS"` in `tsconfig.json`
- Run `yarn seed:config` and `yarn seed:run`

## Running in dev mode
* `yarn start` uses nodemon 
* You can run the server using the docker image or using `docker-compose up`
* When using docker-compose, update the image key to point to a local built image if you want to iterate with docker
* The fastest way to iterate in dev mode:
  * Run the postgres db in docker (use docker-compose but comment out the `bitscreen-api:` part) or use the system postgres db instance 
  * Run the server in terminal using `yarn start`
    but don't forget to run `yarn schema:sync` the first time and everytime there is a change to the schema under `src/entity`

## Running with docker
Using docker-compose will start the postgres database and the bitscreen server
```bash
docker-compose up
```

The above will use the bitscreen server (bitscreen-backend) `latest` docker image (murmurationlabs/bitscreen-backend).
You can build local image like this:
`docker build -t murmurationlabs/bitscreen-backend:local .`
Use a different tag if you don't want it to overwrite the `latest` tag

To connect directly to the db we just started
```bash
psql -h localhost -p 5432 -d bitscreen -U bitscreen
# then type the password bitscreen 
# now you should be in the plsql `bitscreen=#` prompt so you can issue commands

```

## Production deployment
The main deployment is in EKS:
* Uses the docker image `murmurationlabs/bitscreen-backend:latest` hosted in docker hub
  This docker image is updated in docker hub on every push to the master branch
* Postgres database is deployed using bitnami helm chart
* 

## Notes
* All node.js commands use the options `--experimental-modules --es-module-specifier-resolution=node --loader ts-node/esm` to allow 
running typeorm with the current version of typescript
