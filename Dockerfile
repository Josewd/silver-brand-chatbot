# Use Node.js 18
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend dependencies
RUN cd backend && npm install

# Copy backend source code
COPY backend/ ./backend/

# Expose port
EXPOSE 3002

# Start the backend server
CMD ["npm", "start", "--prefix", "backend"]