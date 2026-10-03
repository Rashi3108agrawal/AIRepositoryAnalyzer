# AI Repository Analyzer - Quick Start

## Prerequisites
- Docker and Docker Compose installed
- GitHub Personal Access Token (optional but recommended for higher API rate limits)
- Groq API Key (required for AI summarization features)

## Quick Start

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/Rashi3108agrawal/AIRepositoryAnalyzer.git
   cd AIRepositoryAnalyzer
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your GitHub token and Groq API key if desired
   # The default values work for local development with Docker
   ```

3. **Start all services**:
   ```bash
   docker-compose up -d
   ```

4. **Wait for services to be healthy**:
   ```bash
   docker-compose ps
   ```
   Look for "healthy" in the State column for all services.

5. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080/api
   - API Documentation: http://localhost:8080/api/swagger-ui.html (if enabled)
   - Health Check: http://localhost:8080/api/actuator/health

## Service Details

- **Frontend**: React application running on port 3000
- **Backend**: Spring Boot API running on port 8080
- **Database**: PostgreSQL running on port 5432
- **Cache/Queue**: Redis running on port 6379

## Environment Variables

The application can be configured using environment variables:

### Backend (.env file)
- `DATABASE_URL`: PostgreSQL connection URL
- `DATABASE_USERNAME`: PostgreSQL username
- `DATABASE_PASSWORD`: PostgreSQL password
- `REDIS_HOST`: Redis host (service name in compose: "redis")
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (if enabled)
- `GITHUB_TOKEN`: GitHub Personal Access Token
- `GROQ_API_KEY`: Groq API Key for AI summarization
- `FRONTEND_URL`: Frontend URL for CORS and redirects
- `PORT`: Backend server port (default: 8080)

### Frontend
- `REACT_APP_API_BASE_URL`: Base URL for API requests (automatically set in compose)

## Troubleshooting

### Common Issues

1. **Redis Connection Errors**:
   - Ensure the backend container has the correct environment variables:
     - `SPRING_REDIS_HOST=redis`
     - `SPRING_REDIS_PORT=6379`
   - Check that the redis service is healthy: `docker-compose ps redis`

2. **PostgreSQL Connection Errors**:
   - Check that the postgres service is healthy: `docker-compose ps postgres`
   - Verify the DATABASE_URL in .env matches the service configuration

3. **Frontend Cannot Connect to Backend**:
   - Verify the backend service is healthy: `docker-compose ps backend`
   - Check that REACT_APP_API_BASE_URL is correctly set to "http://backend/api"

4. **Services Not Starting**:
   - Check logs: `docker-compose logs [service-name]`
   - Ensure sufficient system resources (memory, CPU)

## Manual Service Control

- View logs: `docker-compose logs -f [service-name]`
- Restart service: `docker-compose restart [service-name]`
- Stop all services: `docker-compose down`
- View service status: `docker-compose ps`

## Development Mode

The current configuration is optimized for development with:
- Volume mounts for live code changes (backend)
- Development profile active (backend)
- No minification of frontend assets during build (for easier debugging)

For production, consider:
- Removing development volume mounts
- Using a production Spring Boot profile
- Enabling frontend build optimizations