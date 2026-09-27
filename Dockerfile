# Stage 1: Build the React frontend
FROM node:20-slim AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Accept Firebase config as build arguments
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID

# Set them as environment variables for the build step
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID
RUN npm run build

# Stage 2: Final image with Python and built frontend
FROM python:3.9-slim
WORKDIR /app

# Use the same Firestore project as the frontend built into this image.
# Cloud Run may still override FIRESTORE_PROJECT_ID at runtime.
ARG VITE_FIREBASE_PROJECT_ID
ENV FIRESTORE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID

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
