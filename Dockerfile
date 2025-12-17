# Build stage
FROM node:20-alpine as build
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Cloud Run typically deploys to 8080 by default.
# We configure Nginx to listen on 8080
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
