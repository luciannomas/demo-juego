FROM node:21-slim

WORKDIR /app

# Copy repo content
COPY . .

# Install dependencies
RUN npm install

# Expose the port
EXPOSE 3000

# Start the app
CMD ["npm", "run", "dev"]
