FROM node:bullseye-slim

WORKDIR /usr/src/app

COPY ./package*.json ./
RUN npm install
RUN npm install -g nodemon
COPY . .
