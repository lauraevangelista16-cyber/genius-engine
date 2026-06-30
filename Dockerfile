FROM mcr.microsoft.com/playwright:v1.48.2-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 80

CMD ["node", "server.js"]