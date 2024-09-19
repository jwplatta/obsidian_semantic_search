FROM node:18-slim

WORKDIR /usr/src

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3003

CMD ["npm", "run", "prod"]