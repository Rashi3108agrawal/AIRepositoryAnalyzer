# Multi-stage Docker build for Spring Boot application

# ----------------------------
# Stage 1: Build with Maven
# ----------------------------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy Maven wrapper and pom.xml
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw

# Download dependencies
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY src/ src/

# Build the application
RUN ./mvnw clean package -DskipTests

# ----------------------------
# Stage 2: Run with JRE
# ----------------------------
FROM eclipse-temurin:17-jre
WORKDIR /app

# Install netcat for reliable TCP checking
RUN apt-get update && apt-get install -y --no-install-recommends netcat-openbsd && rm -rf /var/lib/apt/lists/*

# Copy the built jar from the build stage
COPY --from=build /app/target/graphify-system-0.0.1-SNAPSHOT.jar app.jar

# -------------------------------------------------
# Create a self‑contained wait script using a heredoc
# -------------------------------------------------
RUN cat <<'EOF' > /wait-for-services.sh
#!/bin/sh
set -e

wait_for() {
  host=$1
  port=$2
  timeout=${3:-60}
  echo -n "Waiting for $host:$port..."
  for i in $(seq 1 $timeout); do
    if nc -z $host $port >/dev/null 2>&1; then
      echo " done"
      return 0
    fi
    echo -n "."
    sleep 1
  done
  echo
  echo "Timeout: $host:$port not reachable after ${timeout}s" >&2
  return 1
}

echo "Waiting for PostgreSQL (postgres:5432)..."
wait_for postgres 5432 60

echo "Waiting for Redis (redis:6379)..."
wait_for redis 6379 60

echo -n "Verifying Redis is ready to accept commands..."
for i in $(seq 1 30); do
  if printf "PING\r\n" | nc redis 6379 | head -n1 | grep -q "^+PONG"; then
    echo " done"
    break
  fi
  echo -n "."
  sleep 1
done

echo "All dependencies ready. Starting Spring Boot application..."
exec "$@"
EOF

# Make the script executable
RUN chmod +x /wait-for-services.sh

# Use the script as the entrypoint
ENTRYPOINT ["/wait-for-services.sh", "java", "-jar", "/app/app.jar"]
