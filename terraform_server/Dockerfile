FROM hashicorp/terraform:1.10

RUN apk add --no-cache nodejs npm 
RUN npm install -g pnpm
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 3000

ENTRYPOINT ["sh","-c","pnpm start"]
