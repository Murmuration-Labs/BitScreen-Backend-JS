#!/bin/sh

cp package.json package.json.backup
cp tsconfig.json tsconfig.json.backup

cp typeorm-package.json package.json
cp typeorm-tsconfig.json tsconfig.json

yarn run schema:sync

cp package.json.backup package.json
cp tsconfig.json.backup tsconfig.json

pm2-runtime "./build/index.js" --node-args="--experimental-modules --es-module-specifier-resolution=node --loader ts-node/esm"
