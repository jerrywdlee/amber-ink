# Node.js 20 base image
FROM node:20-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json and package-lock.json are copied.
COPY package*.json ./

# Install dependencies.
RUN npm install --only=production

# Copy local code to the container image.
COPY . .

# Pass the function to run via an environment variable.
# Default to onboardingAgent.
ENV FUNCTION_TARGET=onboardingAgent

# Run the web service on container startup.
# The functions-framework listens on port 8080 by default.
CMD exec npx @google-cloud/functions-framework --target=$FUNCTION_TARGET
