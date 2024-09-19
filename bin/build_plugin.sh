#!/bin/bash

cd ../plugin

npm install
npm run build

cp ./main.js ../dist
cp ./manifest.json ../dist
cp ./styles.css ../dist