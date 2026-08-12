# Deployment Guide - openDesk Edu Landscape

## Current Status

The `landscape.opendesk-edu.org` project has been created locally with all files, but the remote repositories don't exist yet. This guide explains how to deploy it.

## What's Been Created

✅ **8 files** committed to local git repository:
- `index.html` (Main page)
- `styles.css` (Styling)
- `script.js` (Interactive JavaScript with embedded data)
- `data/services.yaml` (YAML data source)
- `README.md` (Comprehensive documentation)
- `CNAME` (Custom domain: landscape.opendesk-edu.org)
- `package.json` (Project metadata)
- `.gitignore` (Standard ignore patterns)

**Total**: 1,640 lines of code

## Next Steps to Deploy

### Option 1: GitHub Pages (Recommended)

```bash
# 1. Create the GitHub repository
# Go to: https://github.com/organizations/opendesk-edu/repositories/new
# Repository name: landscape.opendesk-edu.org
# Make it public
# DO NOT initialize with README, .gitignore, or license

# 2. Push to GitHub
cd /home/weissto_local/git/opendesk_git/landscape.opendesk-edu.org
git remote add origin https://github.com/opendesk-edu/landscape.opendesk-edu.org.git
git push -u origin master

# 3. Enable GitHub Pages
# Go to: https://github.com/opendesk-edu/landscape.opendesk-edu.org/settings/pages
# Source: Deploy from a branch
# Branch: master
# Folder: / (root)
# Click Save

# 4. Configure Custom Domain
# In the same Settings > Pages section
# Custom domain: landscape.opendesk-edu.org
# Enforce HTTPS: ✅ (recommended)

# 5. Configure DNS
# Add a CNAME record:
# landscape.opendesk-edu.org → opendesk-edu.github.io
```

### Option 2: Codeberg Pages

```bash
# 1. Create the Codeberg repository
# Go to: https://codeberg.org/opendesk-edu/landscape.opendesk-edu.org
# (You may need to enable "Push to create" in organization settings)

# 2. Push to Codeberg
cd /home/weissto_local/git/opendesk_git/landscape.opendesk-edu.org
git remote add codeberg git@codeberg.org:opendesk-edu/landscape.opendesk-edu.org.git
git push -u codeberg master

# 3. Enable Codeberg Pages
# Go to: https://codeberg.org/opendesk-edu/landscape.opendesk-edu.org/settings/pages
# Enable Pages on the main branch
```

### Option 3: Any Static Hosting

The site is 100% static. You can deploy it to:
- **Netlify**: Drag and drop the folder
- **Vercel**: `vercel --prod`
- **Cloudflare Pages**: Connect git repository
- **AWS S3 + CloudFront**: Upload files to S3 bucket
- **GitLab Pages**: Push to GitLab repository

## Testing Locally

Before deploying, test the site locally:

```bash
cd /home/weissto_local/git/opendesk_git/landscape.opendesk-edu.org

# Option 1: Python HTTP server
python3 -m http.server 8000

# Option 2: Node.js
npx http-server -p 8000

# Option 3: PHP
php -S localhost:8000

# Then open http://localhost:8000 in your browser
```

## Features Implemented

✅ **Interactive Visualization**
- Browse services across 5 categories
- Hierarchical category → subcategory → service structure

✅ **Search Functionality**
- Real-time search across names, descriptions, tags
- Case-insensitive matching

✅ **Filtering**
- Filter by service tier (Critical, High, Standard, Low)
- Active filter button highlighting

✅ **Statistics Dashboard**
- License distribution
- Service tier breakdown
- Total counts and metrics

✅ **Direct Links**
- Click any service to visit its website
- Repository links in service cards

✅ **Responsive Design**
- Works on desktop, tablet, mobile
- Modern dark theme with gradients
- Smooth animations and transitions

✅ **Accessibility**
- Semantic HTML
- Keyboard navigation
- ARIA labels

## Customization

### Adding a New Service

Edit `data/services.yaml` (for future use) or `script.js` (currently embedded):

```yaml
- name: "Your Service"
  description: "Brief description"
  url: "https://example.com"
  repository: "https://github.com/org/repo"
  license: "Apache-2.0"
  category: "lms"
  subcategory: "LMS Platforms"
  tier: "high"
  maturity: "production"
  tags: ["tag1", "tag2"]
```

### Changing the Theme

Edit `styles.css` and modify the CSS custom properties:

```css
:root {
  --primary: #06ffa5;     /* Main accent color */
  --secondary: #00b894;   /* Secondary accent */
  --dark: #0a0e27;        /* Background */
  --light: #ffffff;       /* Text */
}
```

### Adding a New Category

Add a new category object to the `categories` array in `script.js`:

```javascript
{
  id: "new-category",
  name: "New Category",
  description: "Category description",
  color: "#FF6B6B",
  icon: "🆕",
  subcategories: [...]
}
```

## Repository Information

- **Repository Name**: `landscape.opendesk-edu.org`
- **Domain**: `landscape.opendesk-edu.org`
- **License**: Apache-2.0
- **Status**: Local development complete, ready for deployment
- **Last Updated**: 2026-06-27

## Support

If you need help with deployment:
- 📧 Email: tobias.weiss@opendesk-edu.org
- 🐛 Issues: Create an issue in the repository once created
- 📖 Documentation: See README.md in the repository

## Why This Name?

The repository is named `landscape.opendesk-edu.org` to:
1. **Match the domain name** for easy DNS configuration
2. **Follow the CNCF convention** (landscape.cncf.io, landscape.cncf.io)
3. **Self-documenting** - the repository name IS the URL
4. **Easy to remember** - clear connection between repo and site

This naming convention is common for sub-domain projects and makes the relationship between code and deployment explicit.
