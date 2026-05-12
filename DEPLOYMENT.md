# Deployment Guide

## Local Development Setup

### 1. Prerequisites
- Node.js 18 or higher
- MongoDB instance (local or Atlas)
- Git
- Terminal/Command line access

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/temple-trust?retryWrites=true&w=majority"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-key-min-32-chars"
```

To generate a secure `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 3. Installation & Running

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm exec prisma generate

# Run development server
pnpm dev
```

Visit `http://localhost:3000` in your browser.

## Testing the Application

### Default User Accounts

For testing, create these accounts through the registration page:

1. **Admin Account**
   - Email: admin@temple.local
   - Password: Admin@123456
   - Role: ADMIN

2. **Accountant Account**
   - Email: accountant@temple.local
   - Password: Accountant@123456
   - Role: ACCOUNTANT

3. **Member Account**
   - Email: member@temple.local
   - Password: Member@123456
   - Role: MEMBER

### Testing Workflows

1. **Donation Collection**
   - Login as ACCOUNTANT
   - Navigate to Donations
   - Create a new donation collection
   - Add donation items
   - Verify the collection

2. **Cash Handover**
   - Login as ADMIN
   - Navigate to Cash Handovers
   - Create new handover
   - Approve the handover

3. **Payment Voucher**
   - Login as ACCOUNTANT
   - Navigate to Vouchers
   - Create new voucher
   - Admin approves it

4. **Bank Reconciliation**
   - Login as ACCOUNTANT
   - Navigate to Bank Reconciliation
   - Create new reconciliation
   - Admin approves

## Production Deployment

### Option 1: Vercel Deployment (Recommended)

#### Step 1: Prepare Repository
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

#### Step 2: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Connect your GitHub account
4. Select the temple-trust repository
5. Click "Import"

#### Step 3: Environment Variables
In the Vercel project settings, add environment variables:

```
DATABASE_URL = mongodb+srv://username:password@cluster.mongodb.net/temple-trust
NEXTAUTH_URL = https://your-domain.vercel.app
NEXTAUTH_SECRET = (generate with: openssl rand -base64 32)
```

#### Step 4: Deploy
Click "Deploy" - Vercel will automatically build and deploy your app.

### Option 2: Self-Hosted (VPS/Server)

#### Prerequisites
- Ubuntu 20.04+ or similar Linux
- Node.js 18+
- MongoDB
- Nginx or Apache
- SSL Certificate (Let's Encrypt)

#### Step 1: Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm
```

#### Step 2: Deploy Application
```bash
# Clone repository
git clone your-repo-url
cd temple-trust-management-system

# Install dependencies
pnpm install

# Build
pnpm build

# Create .env file
nano .env
# Add environment variables

# Start with PM2
npm install -g pm2
pm2 start "pnpm start" --name "temple-trust"
pm2 startup
pm2 save
```

#### Step 3: Configure Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable SSL with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 3: Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: mongodb+srv://user:pass@cluster.mongodb.net/temple-trust
      NEXTAUTH_URL: https://your-domain.com
      NEXTAUTH_SECRET: your-secret-key
    depends_on:
      - mongodb

  mongodb:
    image: mongo:5
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

Deploy with:
```bash
docker-compose up -d
```

## Database Setup

### MongoDB Atlas Cloud (Recommended for Production)

1. Create MongoDB Atlas account
2. Create a cluster
3. Create a database user
4. Whitelist IP addresses
5. Get connection string
6. Add to `DATABASE_URL` in `.env`

### Local MongoDB

```bash
# Install MongoDB Community Edition
# Then create database
mongosh
use temple-trust
```

## Monitoring & Maintenance

### Health Checks
- Monitor application logs: `pm2 logs temple-trust`
- Check database connection: `mongosh connection-string`
- Monitor CPU/Memory usage

### Backups

#### MongoDB Backup
```bash
mongodump --uri "mongodb+srv://user:pass@cluster.mongodb.net/temple-trust" --out ./backup
```

#### Restore from Backup
```bash
mongorestore --uri "mongodb+srv://user:pass@cluster.mongodb.net/temple-trust" ./backup
```

### Updates

```bash
# Update dependencies
pnpm update

# Rebuild after updates
pnpm build

# Restart service
pm2 restart temple-trust
```

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
- Check connection string
- Verify IP whitelist in MongoDB Atlas
- Ensure credentials are correct

**Authentication Issues**
- Verify NEXTAUTH_SECRET is set correctly
- Check NEXTAUTH_URL matches your domain
- Clear browser cookies

**Build Failures**
- Delete node_modules and pnpm-lock.yaml
- Run `pnpm install` again
- Check Node.js version compatibility

**Performance Issues**
- Enable MongoDB indexes
- Use connection pooling
- Implement caching strategies
- Monitor API response times

## Security Checklist

- [ ] Change default admin password
- [ ] Set strong NEXTAUTH_SECRET
- [ ] Enable HTTPS/SSL
- [ ] Configure MongoDB authentication
- [ ] Set up IP whitelisting
- [ ] Regular database backups
- [ ] Monitor access logs
- [ ] Keep dependencies updated
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting

## Performance Optimization

1. **Enable Compression**
```javascript
// next.config.mjs
export default {
  compress: true,
}
```

2. **Database Indexing**
```
db.donationcollections.createIndex({ collectionDate: -1 })
db.users.createIndex({ email: 1 })
```

3. **API Caching**
- Use SWR with cache validation
- Implement Redis for session storage

4. **CDN Configuration**
- Use Vercel's built-in CDN
- Or configure CloudFlare

## Support & Documentation

For detailed information, see:
- README.md - Project overview
- IMPLEMENTATION_SUMMARY.md - Architecture details

## Post-Deployment

1. Test all user workflows
2. Verify email notifications (if configured)
3. Set up monitoring and alerts
4. Create admin user for production
5. Configure backup schedule
6. Document deployment details
