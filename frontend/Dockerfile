# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN ls /app/package.json

RUN npm install

COPY . .

# Build args to allow passing environment variables at build time
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# Production Stage
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/build ./build

EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]