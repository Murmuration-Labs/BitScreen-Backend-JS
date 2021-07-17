# Awesome Project Build with TypeORM

## Steps to run this project:
1. Clone project
2. Switch to branch development
3. `yarn install`
4. Create new file `ormconfig.json` with the content found in `ormconfig.json.example` file
5. Install PostgreSQL
6. Create database bitscreen
7. Create user bitscreen_api with password Admin12 & grant all privileges
8. Execute sync command: `yarn typeorm schema:sync`
9. Insert entry into provider table with random created & updated timestamps and id = 0 and anonymous value to all other custom columns 
10. Run server -> `yarn start`


## Detailed steps (with commands) to run this project (Ubuntu 20.04):
1. Clone project
2. Switch to branch development
3. `yarn install`
4. Create new file `ormconfig.json` with the content found in `ormconfig.json.example` file
5. Install PostgreSQL -> https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-20-04
6. Access PostgreSQL -> `sudo -u PostgreSQL psql`
7. Create database called bitscreen -> `create database bitscreen;`
8. Create user called bitscreen_api with password Admin12 -> `create user bitscreen_api with encrypted password 'Admin12';`
9. Grant privileges to user on database bitscreen -> `grant all privileges on database bitscreen to bitscreen_api;`
10. Execute sync command -> `yarn typeorm schema:sync`
11. From terminal connect to bitscreen database -> `\c bitscreen` (or if you aren't already in postgres interface -> `sudo -u postgres psql -d bitscreen`)
12. Insert entry into provider table with random created & updated timestamps and id = 0 and anonymous value to all other custom columns -> 
`INSERT INTO provider(created, updated, id, "walletAddressHashed", country, "businessName", website, email, "contactPerson", address) VALUES('2021-07-16 10:23:54', '2021-07-16 10:24:54', '0', 'anonymous', 'anonymous', 'anonymous', 'anonymous', 'anonymous', 'anonymous', 'anonymous');`
12. Run server -> `yarn start`

## Using TypeORM
- Run `yarn typeorm` to see a complete list of available commands.
