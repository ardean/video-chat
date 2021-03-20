FROM node:14

RUN mkdir -p /server

WORKDIR /server
COPY package.json .
COPY package-lock.json .

RUN npm install --production

WORKDIR /
COPY ./dist ./server
COPY ./public ./public

CMD ["node", "server"]