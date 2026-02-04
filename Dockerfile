# Stage 1: Build the React frontend
FROM node:20-slim AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Final image with Python and built frontend
FROM python:3.9-slim
WORKDIR /app

# Copy built frontend from Stage 1
COPY --from=build-stage /app/dist ./dist

# Copy requirement file first for caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY backend/ .

# Cloud Run expects the app to listen on PORT environment variable, defaulting to 8080
ENV PORT=8080

# Command to run the application
# We serve the 'dist' folder via main:app as configured in main.py
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT}
