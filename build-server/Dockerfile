FROM ubuntu:focal

RUN apt-get update
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get upgrade -y
RUN apt-get install -y nodejs

RUN apt-get install git -y

WORKDIR /home/app

COPY entrypoint.sh entrypoint.sh
COPY server.js server.js
COPY package*.json .

RUN npm install

RUN chmod +x entrypoint.sh
RUN chmod +x server.js

ENTRYPOINT [ "/home/app/entrypoint.sh" ]