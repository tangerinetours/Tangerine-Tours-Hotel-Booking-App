FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build-time env vars needed for NEXT_PUBLIC_ variables
ARG NEXT_PUBLIC_MPGS_MERCHANT_ID
ENV NEXT_PUBLIC_MPGS_MERCHANT_ID=$NEXT_PUBLIC_MPGS_MERCHANT_ID

RUN npm run build
EXPOSE 3080
ENV PORT=3080
CMD ["npm", "start"]