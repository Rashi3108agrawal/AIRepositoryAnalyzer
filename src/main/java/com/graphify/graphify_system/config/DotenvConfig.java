package com.graphify.graphify_system.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;

/**
 * Configuration class to load .env file and make its values available as system properties.
 * This ensures that both System.getenv() and Spring's @Value annotations can access the values.
 */
@Configuration
public class DotenvConfig {

    /**
     * Loads .env file on application startup and adds all values to system properties.
     * This makes the values available to both System.getenv() (used by GitHubService)
     * and Spring's Environment (used by @Value annotations like in AIService).
     */
    @EventListener
    public void applicationReady(ApplicationReadyEvent event) {
        Dotenv dotenv = Dotenv.load();

        // Add all .env variables to system properties (overrides OS env if same name)
        dotenv.entries().forEach(entry ->
            System.setProperty(entry.getKey(), entry.getValue()));
    }
}