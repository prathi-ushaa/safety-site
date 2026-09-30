FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
ENV PORT=5000 DATA_DIR=/data
VOLUME /data
EXPOSE 5000
CMD ["node", "src/server.js"]
