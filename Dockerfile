FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY config.mjs server.mjs start.mjs ./
COPY public ./public
ENV PORT=5174
EXPOSE 5174
USER node
CMD ["node", "start.mjs"]
