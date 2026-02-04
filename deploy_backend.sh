#!/bin/bash

# Cloud Run Deployment Helper Script

echo "🚀 Starting Google Cloud Run Deployment..."
echo "Make sure you have installed the gcloud CLI and logged in ('gcloud auth login')"

# Prompt for Project ID
read -p "Enter your Google Cloud Project ID (e.g. rolefit-12345): " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID is required."
    exit 1
fi

echo "✅ Using Project: $PROJECT_ID"

# 1. Build the container
echo "📦 Building container image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/rolefit-backend --project=$PROJECT_ID

# 2. Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy rolefit-backend \
  --image gcr.io/$PROJECT_ID/rolefit-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --project=$PROJECT_ID

echo "🎉 Deployment Complete!"
echo "NOTE: specific environment variables (API Keys) must be set in the Cloud Run Console UI."
