# 🚀 Complete Deployment Guide - Next Meeting Site with Auto-Updates

This guide covers deploying the Next Meeting site with **automatic schedule updates** from Google Sheets or other data sources.

## 📋 Architecture Overview

The system consists of two components:
1. **Static Site**: The main website (HTML, CSS, JS)
2. **Schedule Updater**: Service that fetches fresh data and updates the site

### How It Works:
```
Google Sheets → Schedule Updater (runs hourly) → Updates Static HTML → Users see fresh data
```

## 🔑 Key Features by Platform

| Feature | AWS | Fly.io | Azure |
|---------|-----|--------|-------|
| **Static Hosting** | S3 | Nginx Container | Static Web Apps |
| **CDN** | CloudFront (Free tier: 1TB/month) | Built-in (global) | Built-in (global) |
| **Schedule Updates** | Lambda | Cron Service | Azure Function |
| **Cost** | ~$5-10/month after free tier | Free tier available | Free tier: 100GB/month |
| **Setup Complexity** | Medium | Easy | Easy |
| **Custom Domain** | ✅ | ✅ | ✅ |
| **SSL Certificate** | ✅ Free | ✅ Free | ✅ Free |

## 🌟 CloudFront Explanation (AWS)

**What is CloudFront?**
- Amazon's Content Delivery Network (CDN)
- Caches your site at 400+ edge locations worldwide
- Makes your site load faster globally
- Provides DDoS protection

**CloudFront Free Tier:**
- 1 TB data transfer out per month
- 10,000,000 HTTP/HTTPS requests per month
- 2,000,000 CloudFront Function invocations per month
- **Free for 12 months** for new AWS accounts

**Why Keep CloudFront?**
- ✅ Significantly faster load times (serves from nearest edge location)
- ✅ Reduces S3 bandwidth costs
- ✅ Automatic HTTPS
- ✅ Better reliability and uptime
- ✅ Free tier is generous for most small sites

---

## 🚀 Option 1: Fly.io Deployment (Recommended for Quick Setup)

### Prerequisites
- Fly.io account (free)
- Node.js 18+

### Complete Setup (5 minutes)

1. **Install Fly CLI:**
```bash
curl -L https://fly.io/install.sh | sh
flyctl auth signup  # or login
```

2. **Configure Environment:**
```bash
cp .env.fly .env
# Edit .env to add Google Sheets credentials (optional)
```

3. **Deploy Everything:**
```bash
# This script handles everything!
./deploy-fly-complete.sh
```

That's it! Your site is live with automatic hourly updates.

### What Gets Deployed:
- **Main Site**: `https://your-app.fly.dev`
- **Updater Service**: Runs every hour in background
- **Persistent Storage**: For template and updated HTML

### Manual Update Trigger:
```bash
flyctl ssh console --app next-meeting-updater -C 'node update-schedule.js'
```

### Monitoring:
```bash
# View site logs
flyctl logs --app next-meeting-site

# View updater logs  
flyctl logs --app next-meeting-updater

# Check status
flyctl status --app next-meeting-site
```

---

## ☁️ Option 2: Azure Deployment

### Prerequisites
- Azure account (free tier available)
- Azure CLI installed
- GitHub repository

### Setup Steps

1. **Create Azure Static Web App:**
```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login

# Create resource group
az group create --name NextMeetingRG --location eastus

# Create static web app
az staticwebapp create \
  --name next-meeting-site \
  --resource-group NextMeetingRG \
  --source https://github.com/yourusername/your-repo \
  --location eastus \
  --branch main \
  --app-location "/" \
  --output-location "dist" \
  --login-with-github
```

2. **Create Azure Function for Updates:**
```bash
# Create function app
az functionapp create \
  --resource-group NextMeetingRG \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name next-meeting-updater \
  --storage-account nextmeetingstorage

# Deploy function code
cd azure-function
func azure functionapp publish next-meeting-updater
```

3. **Configure Environment:**
```bash
# Set function app settings
az functionapp config appsettings set \
  --name next-meeting-updater \
  --resource-group NextMeetingRG \
  --settings \
    "DEPLOYMENT_PLATFORM=azure" \
    "GOOGLE_SHEET_ID=your-sheet-id" \
    "GOOGLE_API_KEY=your-api-key" \
    "AZURE_STORAGE_CONNECTION_STRING=your-connection-string"
```

4. **Deploy:**
```bash
git push origin main
# GitHub Actions will auto-deploy
```

---

## 🔶 Option 3: AWS Deployment (Original)

### Why Use AWS?
- ✅ **CloudFront CDN**: Superior global performance
- ✅ **S3 Reliability**: 99.999999999% durability
- ✅ **Lambda**: Serverless updates (pay only when running)
- ✅ **Mature Ecosystem**: Battle-tested at scale

### Prerequisites
- AWS account
- AWS CLI configured
- Node.js 18+

### Setup Steps

1. **Configure AWS:**
```bash
cp .env.aws .env
# Edit .env with your AWS credentials

# Configure AWS CLI
aws configure
```

2. **Create S3 Bucket:**
```bash
# Create bucket
aws s3 mb s3://next-meeting-site-bucket

# Enable static website hosting
aws s3 website s3://next-meeting-site-bucket \
  --index-document index.html \
  --error-document error.html

# Set bucket policy for public access
aws s3api put-bucket-policy --bucket next-meeting-site-bucket \
  --policy file://s3-bucket-policy.json
```

3. **Setup CloudFront:**
```bash
# Create distribution
aws cloudfront create-distribution \
  --origin-domain-name next-meeting-site-bucket.s3-website-us-east-1.amazonaws.com \
  --default-root-object index.html

# Note the distribution ID for later use
```

4. **Deploy Lambda Function:**
```bash
# Package function
cd schedule-updater
zip -r function.zip .

# Create Lambda function
aws lambda create-function \
  --function-name next-meeting-updater \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-role \
  --handler update-schedule.handler \
  --zip-file fileb://function.zip \
  --environment Variables="{DEPLOYMENT_PLATFORM=aws,S3_BUCKET=next-meeting-site-bucket}"

# Create EventBridge rule for hourly execution
aws events put-rule \
  --name next-meeting-hourly \
  --schedule-expression "rate(1 hour)"

# Add Lambda permission
aws lambda add-permission \
  --function-name next-meeting-updater \
  --statement-id next-meeting-hourly \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:REGION:ACCOUNT:rule/next-meeting-hourly
```

5. **Deploy Site:**
```bash
# Build and deploy
npm run build
aws s3 sync ./dist s3://next-meeting-site-bucket

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

Your site is now live at the CloudFront URL!

---

## 📊 Connecting to Google Sheets

### 1. Enable Google Sheets API:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable "Google Sheets API"
4. Create credentials (API Key)

### 2. Prepare Your Sheet:
Structure your Google Sheet with these columns:
```
| Meeting Name | Day | Time | Timezone | Duration | Zoom URL | Passcode | Description | Tags |
```

### 3. Get Sheet ID:
- Open your Google Sheet
- Copy ID from URL: `docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

### 4. Configure Environment:
Add to your `.env` file:
```bash
GOOGLE_SHEET_ID=your-sheet-id-here
GOOGLE_API_KEY=your-api-key-here
```

---

## 🔄 Update Frequency

### Changing Update Schedule

**Fly.io:** Edit `fly.updater.toml`:
```toml
[env]
  CRON_SCHEDULE = "0 * * * *"  # Hourly
  # CRON_SCHEDULE = "*/30 * * * *"  # Every 30 minutes
  # CRON_SCHEDULE = "0 */6 * * *"  # Every 6 hours
```

**Azure:** Edit `azure-function/function.json`:
```json
{
  "schedule": "0 0 * * * *"  // Hourly
  // "schedule": "0 */30 * * * *"  // Every 30 minutes
}
```

**AWS:** Update EventBridge rule:
```bash
aws events put-rule \
  --name next-meeting-hourly \
  --schedule-expression "rate(30 minutes)"  # Change frequency
```

---

## 🎯 Quick Comparison for Your Use Case

### For Quick Demo (Today):
**✅ Use Fly.io**
- 5-minute setup
- Free tier
- No credit card
- Run: `./deploy-fly-complete.sh`

### For Production with High Traffic:
**✅ Use AWS with CloudFront**
- Best performance globally
- Most cost-effective at scale
- CloudFront free tier is generous

### For Enterprise/Corporate:
**✅ Use Azure**
- Integrates with Microsoft ecosystem
- Good compliance options
- GitHub Actions integration

---

## 💡 Tips & Best Practices

1. **Test Locally First:**
```bash
npm run dev
# Check http://localhost:8080
```

2. **Monitor Updates:**
- Set up alerts for failed updates
- Check logs regularly
- Test with sample data first

3. **Performance:**
- CloudFront/CDN caches for 5 minutes by default
- Adjust cache headers as needed
- Use compression for better performance

4. **Security:**
- Keep API keys in environment variables
- Use least-privilege IAM roles (AWS)
- Enable CORS appropriately

5. **Backup:**
- Keep template HTML in version control
- Export Google Sheets regularly
- Test disaster recovery process

---

## 🚨 Troubleshooting

### Schedule Not Updating:
1. Check updater logs
2. Verify Google Sheets API credentials
3. Ensure proper permissions
4. Check cron schedule syntax

### Site Not Loading:
1. Verify deployment completed
2. Check DNS/CDN propagation
3. Clear browser cache
4. Check for JavaScript errors

### High Costs (AWS):
1. Check CloudFront cache hit ratio
2. Verify S3 lifecycle policies
3. Monitor Lambda execution time
4. Use CloudWatch to identify issues

---

## 📞 Support

- **Fly.io:** [Community Forum](https://community.fly.io)
- **Azure:** [Azure Support](https://azure.microsoft.com/support)
- **AWS:** [AWS Support Center](https://console.aws.amazon.com/support)
- **This Project:** File an issue on GitHub

---

**Remember:** The free tiers are perfect for demos and small sites. You can always migrate later as your needs grow!