# Environment Setup Guide

## 🏗️ Environment Configuration

This project supports multiple environments: **Development**, **Staging**, and **Production**.

## 📁 Environment Files

### Backend Environment Files
- `backend/env.development` - Development configuration
- `backend/env.staging` - Staging configuration  
- `backend/env.production` - Production configuration
- `backend/env.example` - Template for new environments

### Frontend Environment Files
- `frontend/env.development` - Development configuration
- `frontend/env.staging` - Staging configuration
- `frontend/env.production` - Production configuration

## 🚀 Quick Start

### Development Environment
```bash
# Backend
cd backend
npm run dev

# Frontend (in another terminal)
cd frontend
npm start
```

### Production Environment
```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm run build
```

## 🔧 Environment Variables

### Backend Variables

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `NODE_ENV` | development | staging | production |
| `PORT` | 5000 | 5000 | 5000 |
| `MONGODB_URI` | localhost | staging DB | production DB |
| `JWT_SECRET` | dev secret | staging secret | secure secret |
| `GEMINI_API_KEY` | your key | your key | your key |
| `CORS_ORIGIN` | http://localhost:3000 | staging domain | production domain |
| `LOG_LEVEL` | debug | info | error |
| `CRON_ENABLED` | true | true | true |

### Frontend Variables

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `REACT_APP_API_URL` | http://localhost:5000 | staging API | production API |
| `REACT_APP_ENVIRONMENT` | development | staging | production |
| `REACT_APP_DEBUG` | true | true | false |

## 🛠️ Setup Instructions

### 1. Development Setup

1. **Install dependencies:**
   ```bash
   npm run install-all
   ```

2. **Start MongoDB locally:**
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   ```

3. **Start development servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

### 2. Production Setup

#### Railway Deployment (Backend)

1. **Connect to Railway:**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repository
   - Set root directory to `backend`

2. **Set environment variables in Railway:**
   ```
   NODE_ENV=production
   MONGODB_URI=your_production_mongodb_uri
   JWT_SECRET=your_secure_jwt_secret
   GEMINI_API_KEY=your_gemini_api_key
   CORS_ORIGIN=https://your-frontend-domain.com
   ```

3. **Deploy:**
   - Railway will automatically deploy when you push to main branch

#### Vercel Deployment (Frontend)

1. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Connect your GitHub repository
   - Set build command: `cd frontend && npm run build`
   - Set output directory: `frontend/build`

2. **Set environment variables:**
   ```
   REACT_APP_API_URL=https://your-backend.railway.app
   REACT_APP_ENVIRONMENT=production
   ```

3. **Deploy:**
   - Vercel will automatically deploy when you push to main branch

## 🔍 Environment Detection

The application automatically detects the environment based on `NODE_ENV`:

```javascript
// Backend - server.js
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : process.env.NODE_ENV === 'staging' 
  ? '.env.staging' 
  : '.env.development';
```

## 🛡️ Security Features

### Production Security
- **Helmet.js** - Security headers
- **Rate limiting** - API request limiting
- **CORS** - Restricted origins
- **Trust proxy** - For load balancers
- **Secure JWT secrets** - Environment-specific secrets

### Development Security
- **Relaxed CORS** - Allows localhost
- **Debug logging** - Detailed error messages
- **No rate limiting** - For development ease

## 📊 Monitoring & Health Checks

### Health Check Endpoint
```
GET /health
```

Response:
```json
{
  "status": "OK",
  "environment": "production",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

### Logging Levels
- **Development**: `debug` - All logs
- **Staging**: `info` - Important logs
- **Production**: `error` - Error logs only

## 🔄 Cron Jobs

### Tweet Scheduling
- **Development**: Enabled (for testing)
- **Staging**: Enabled (for testing)
- **Production**: Enabled (live scheduling)

### Configuration
```javascript
CRON_ENABLED=true
CRON_TIMEZONE=UTC
```

## 🚨 Troubleshooting

### Common Issues

1. **Environment variables not loading:**
   - Check file names match exactly
   - Ensure NODE_ENV is set correctly
   - Verify file paths

2. **CORS errors:**
   - Check CORS_ORIGIN setting
   - Ensure frontend URL matches

3. **Database connection issues:**
   - Verify MONGODB_URI format
   - Check network access
   - Ensure database exists

4. **Build failures:**
   - Check Node.js version compatibility
   - Verify all dependencies installed
   - Check environment variable syntax

### Debug Commands

```bash
# Check environment
echo $NODE_ENV

# Test database connection
node -e "console.log(process.env.MONGODB_URI)"

# Check health endpoint
curl http://localhost:5000/health
```

## 📝 Environment Checklist

### Development
- [ ] MongoDB running locally
- [ ] Environment variables set
- [ ] Dependencies installed
- [ ] Both servers running
- [ ] Health check responding

### Production
- [ ] Environment variables configured
- [ ] Database accessible
- [ ] CORS configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Health check responding
- [ ] Cron jobs enabled

## 🔗 Useful Links

- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [Google Gemini API](https://ai.google.dev)
