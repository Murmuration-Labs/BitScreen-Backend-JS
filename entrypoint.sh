#!/bin/sh

yarn run schema:synch

pm2-runtime "./build/index.js" --node-args="--experimental-modules --es-module-specifier-resolution=node --loader ts-node/esm"
