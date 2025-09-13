# GitHub Pages Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Create GitHub Repository
1. Go to [GitHub.com](https://github.com)
2. Click "New repository"
3. Name: `naijaloyal-ido-frontend`
4. Make it **Public**
5. Don't initialize with README

### 2. Upload Files
1. Clone the repository locally:
   ```bash
   git clone https://github.com/yourusername/naijaloyal-ido-frontend.git
   cd naijaloyal-ido-frontend
   ```

2. Copy all frontend files to the repository:
   - `index.html`
   - `app.js`
   - `README.md`
   - `.gitignore`

3. Commit and push:
   ```bash
   git add .
   git commit -m "Initial commit: NaijaLoyal IDO Frontend"
   git push origin main
   ```

### 3. Enable GitHub Pages
1. Go to your repository on GitHub
2. Click "Settings" tab
3. Scroll down to "Pages" section
4. Under "Source", select "Deploy from a branch"
5. Select "main" branch and "/ (root)" folder
6. Click "Save"

### 4. Access Your Site
- Your site will be available at: `https://yourusername.github.io/naijaloyal-ido-frontend`
- It may take 5-10 minutes to deploy initially

## �� Custom Domain (Optional)

If you want to use a custom domain:

1. Add your domain to `CNAME` file
2. Configure DNS settings with your domain provider
3. Enable HTTPS in GitHub Pages settings

## 📱 Testing

After deployment:
1. Open the live URL
2. Connect MetaMask
3. Switch to Sepolia testnet
4. Test token purchase functionality

## �� Updates

To update the site:
1. Make changes to your files
2. Commit and push:
   ```bash
   git add .
   git commit -m "Update: description of changes"
   git push origin main
   ```
3. Changes will be live in 1-2 minutes

## 🛠️ Troubleshooting

### Common Issues:

1. **Site not loading**: Check if repository is public
2. **MetaMask not connecting**: Ensure you're on the correct network
3. **Contract errors**: Verify contract addresses are correct
4. **404 errors**: Check file paths and names

### Support:
- Check GitHub Pages documentation
- Open an issue in this repository
