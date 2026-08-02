FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 4000
CMD ["npm", "run", "start"]
