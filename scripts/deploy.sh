#!/bin/bash
# Deployment script for IoT Listrik Dashboard

echo "🚀 Starting deployment..."

# Deploy Firebase Hosting
echo "📦 Deploying to Firebase Hosting..."
npx -y firebase-tools@latest deploy --only hosting

# Deploy Firebase Functions (if needed)
# echo "⚙️ Deploying Firebase Functions..."
# npx -y firebase-tools@latest deploy --only functions

echo "✅ Deployment complete!"