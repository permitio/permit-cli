# Stage 1: Build Stage
FROM node:lts-slim AS build

# Install libsecret for keytar
RUN apt-get update && apt-get install -y libsecret-1-0 && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json for caching npm install
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Stage 2: Runtime Stage
FROM node:lts-slim

# Install only necessary libraries for runtime
RUN apt-get update && apt-get install -y libsecret-1-0 && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r cli-group && useradd -r -g cli-group cli-user

# Set the working directory
WORKDIR /app

# Copy only the built files and necessary runtime files from the build stage
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/node_modules /app/node_modules

# Rebuild native dependencies for the current environment
RUN npm rebuild

# Switch to non-root user
USER cli-user

# Set the ENTRYPOINT to your CLI tool
ENTRYPOINT ["node", "/app/dist/cli.js"]

# Provide a default argument (like --help) which users can override
CMD ["--help"]
