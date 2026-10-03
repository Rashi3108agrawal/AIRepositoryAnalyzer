package com.graphify.graphify_system.config;

import org.springframework.context.annotation.Configuration;

// This class is just to document that we're using Actuator for health checks
// The actual configuration is in application.properties
@Configuration
public class HealthCheckConfig {
    // Health check endpoint will be available at /actuator/health
    // We can customize it further if needed
}