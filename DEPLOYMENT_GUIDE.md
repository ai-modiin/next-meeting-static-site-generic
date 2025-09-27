# 🚀 Deployment Guide for Next Meeting Site

This guide explains how to deploy the Next Meeting static site to **Fly.io** (recommended) or **Azure Static Web Apps**.

## 📋 Overview

Originally built for AWS (S3 + Lambda + CloudFront), this site has been adapted to work with modern, simpler hosting platforms that offer free tiers.

### What Changed?
- **No AWS Lambda Required**: The schedule JSON is now built directly into the static site during build time
- **Simplified Build Process**: New `gulpfile.standalone.js` generates a complete static site
- **Demo Data**: Automatically generates sample meeting data for testing
- **Multiple Deployment Options**: Choose between Fly.io or Azure

## 🎯 Quick Start (5 minutes)

### Option 1: Deploy to Fly.io (Recommended - Fastest)

**Why Fly.io?**
- ✅ Free tier available (3 VMs with 256MB RAM)
- ✅ Built-in global CDN
- ✅ Simple CLI deployment
- ✅ Automatic SSL certificates
- ✅ No credit card required for free tier

**Steps:**

1. **Install Fly CLI:**
   ```bash
   # macOS
   brew install flyctl
   
   # Linux/WSL
   curl -L https://fly.io/install.sh | sh
   
   # Windows
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Sign up for Fly.io:**
   ```bash
   flyctl auth signup
   # Or login if you have an account
   flyctl auth login
   ```

3. **Configure your site:**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit configs/demo.js with your site details
   # (Optional - the default config works for demo)
   ```

4. **Deploy:**
   ```bash
   # One-command deployment
   npm run deploy:fly
   
   # Or manually:
   npm install
   npm run build:standalone
   flyctl launch --name your-app-name
   flyctl deploy
   ```

5. **Your site is live!** 🎉
   Visit: `https://your-app-name.fly.dev`

### Option 2: Deploy to Azure Static Web Apps

**Why Azure?**
- ✅ Free tier with 100GB bandwidth/month
- ✅ GitHub Actions integration
- ✅ Automatic preview environments
- ✅ Built-in authentication options

**Steps:**

1. **Prerequisites:**
   - Azure account (free tier available)
   - GitHub repository

2. **Push code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

3. **Create Azure Static Web App:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Create new "Static Web App" resource
   - Connect your GitHub repository
   - Select branch: `main`
   - Build Preset: Custom
   - App location: `/`
   - Api location: (leave empty)
   - Output location: `dist`

4. **Configure GitHub Secret:**
   - Azure will automatically create a GitHub Action workflow
   - The deployment token is added to your repo secrets automatically

5. **Deploy:**
   - Push any change to trigger deployment
   - Or manually trigger the GitHub Action

6. **Your site is live!** 🎉
   Visit the URL provided in Azure Portal

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Create your config (if not using demo)
cp .env.example .env
# Edit configs/demo.js

# Build and serve locally
npm run dev
# Visit http://localhost:8080
```

## 📝 Configuration

### Site Configuration

Edit `configs/demo.js` (or create your own config file):

```javascript
exports.default = {
  $SITE_TITLE: 'Your Meeting Site',
  $SITE_DESCRIPTION: 'Your description',
  $FELLOWSHIP: 'Your Organization',
  $THEME_LIGHT: 'theme-purple-light',
  $THEME_DARK: 'theme-purple-dark',
  // ... more options
}
```

### Available Themes
- `theme-purple-light` / `theme-purple-dark`
- `theme-forest-light` / `theme-forest-dark`
- `theme-tabasco-light` / `theme-tabasco-dark`
- `theme-neptune-light` / `theme-neptune-dark`

### Meeting Data

The standalone build generates demo data automatically. To use real data:

1. Modify `gulpfile.standalone.js` function `generateDemoSchedule()`
2. Replace with your actual meeting data source
3. Or manually edit the generated JSON

## 🔄 Updating Your Site

### Fly.io
```bash
npm run build:standalone
flyctl deploy
```

### Azure
```bash
git add .
git commit -m "Update site"
git push
# GitHub Actions will auto-deploy
```

## 💰 Cost Comparison

| Platform | Free Tier | Paid Starting Price |
|----------|-----------|-------------------|
| **Fly.io** | 3 shared VMs, 3GB storage | $0.0000008/s ($2/month) |
| **Azure Static Web Apps** | 100GB bandwidth/month | $9/month |
| **AWS (Original)** | 1 year free tier | ~$5-10/month |

## 🚨 Troubleshooting

### Build Fails
- Ensure Node.js 18+ is installed
- Check `configs/demo.js` exists
- Run `npm install` first

### Fly.io Issues
- Check `flyctl status`
- View logs: `flyctl logs`
- Ensure port 8080 is used

### Azure Issues
- Check GitHub Actions tab for errors
- Ensure `staticwebapp.config.json` is present
- Verify Azure deployment token in GitHub secrets

## 📚 Additional Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Azure Static Web Apps Docs](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Original AWS Deployment](readme.md)

## 🎯 Next Steps

1. **Add Real Meeting Data**: Replace demo data with your actual meetings
2. **Customize Theme**: Modify colors in `src/styles.scss`
3. **Add Analytics**: Google Analytics, Plausible, etc.
4. **Set up CI/CD**: Automate deployments with GitHub Actions
5. **Add Custom Domain**: Both platforms support custom domains

---

**Need Help?** 
- Fly.io: Run `flyctl doctor` for diagnostics
- Azure: Check deployment logs in GitHub Actions
- File an issue in the repository for community support