package com.graphify.graphify_system.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class GitHubService {

    private static final Logger logger = LoggerFactory.getLogger(GitHubService.class);

    private final RestTemplate restTemplate;
    private final String githubToken;

    public GitHubService() {
        this.restTemplate = new RestTemplate();
        // Set timeouts
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000); // 10 seconds
        factory.setReadTimeout(15000); // 15 seconds
        restTemplate.setRequestFactory(factory);

        this.githubToken = System.getenv("GITHUB_TOKEN");
    }

    public Map<String, Object> getRepoData(String owner, String repo) {
        validateParams(owner, repo);
        String url = "https://api.github.com/repos/" + owner + "/" + repo;
        return executeGetRequest(url);
    }

    public Map<String, Object> getRepoOverview(String owner, String repo) {
        validateParams(owner, repo);
        String url = "https://api.github.com/repos/" + owner + "/" + repo;
        return executeGetRequest(url);
    }

    public List<Map<String, Object>> getCommits(String owner, String repo) {
        validateParams(owner, repo);
        String url = "https://api.github.com/repos/" + owner + "/" + repo + "/commits";
        return executeGetRequestForList(url);
    }

    public List<Map<String, Object>> getContributors(String owner, String repo) {
        validateParams(owner, repo);
        String url = "https://api.github.com/repos/" + owner + "/" + repo + "/contributors";
        return executeGetRequestForList(url);
    }

    public Map<String, Object> getLanguages(String owner, String repo) {
        validateParams(owner, repo);
        String url = "https://api.github.com/repos/" + owner + "/" + repo + "/languages";
        return executeGetRequest(url);
    }

    private void validateParams(String owner, String repo) {
        if (owner == null || owner.isBlank() || repo == null || repo.isBlank()) {
            throw new IllegalArgumentException("Owner and repo must be non-blank");
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> executeGetRequest(String url) {
        try {
            logger.debug("Making GET request to GitHub API: {}", url);

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class,
                    createHeaders());

            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> body = response.getBody();
                logger.debug("GitHub API request successful: {}", url);
                return body != null ? body : Collections.emptyMap();
            } else {
                handleGitHubError(response.getStatusCode(), url);
                return Collections.emptyMap();
            }
        } catch (HttpClientErrorException ex) {
            handleGitHubError(ex.getStatusCode(), url);
            return Collections.emptyMap();
        } catch (HttpServerErrorException ex) {
            handleGitHubError(ex.getStatusCode(), url);
            return Collections.emptyMap();
        } catch (ResourceAccessException ex) {
            logger.error("Network error accessing GitHub API {}: {}", url, ex.getMessage());
            throw new RuntimeException("Network error accessing GitHub API: " + ex.getMessage(), ex);
        } catch (Exception ex) {
            logger.error("Unexpected error accessing GitHub API {}: {}", url, ex.getMessage());
            throw new RuntimeException("Error accessing GitHub API: " + ex.getMessage(), ex);
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> executeGetRequestForList(String url) {
        try {
            logger.debug("Making GET request to GitHub API (list): {}", url);

            ResponseEntity<List> response = restTemplate.getForEntity(url, List.class,
                    createHeaders());

            if (response.getStatusCode().is2xxSuccessful()) {
                List<Map<String, Object>> body = response.getBody();
                logger.debug("GitHub API list request successful: {}", url);
                return body != null ? body : Collections.emptyList();
            } else {
                handleGitHubError(response.getStatusCode(), url);
                return Collections.emptyList();
            }
        } catch (HttpClientErrorException ex) {
            handleGitHubError(ex.getStatusCode(), url);
            return Collections.emptyList();
        } catch (HttpServerErrorException ex) {
            handleGitHubError(ex.getStatusCode(), url);
            return Collections.emptyList();
        } catch (ResourceAccessException ex) {
            logger.error("Network error accessing GitHub API {}: {}", url, ex.getMessage());
            throw new RuntimeException("Network error accessing GitHub API: " + ex.getMessage(), ex);
        } catch (Exception ex) {
            logger.error("Unexpected error accessing GitHub API {}: {}", url, ex.getMessage());
            throw new RuntimeException("Error accessing GitHub API: " + ex.getMessage(), ex);
        }
    }

    private void handleGitHubError(org.springframework.http.HttpStatusCode statusCode, String url) {
        logger.error("GitHub API error {} for {}: {}", statusCode.value(), url,
                org.springframework.http.HttpStatus.valueOf(statusCode.value()).getReasonPhrase());

        switch (statusCode.value()) {
            case 403:
                throw new RuntimeException("GitHub API rate limit exceeded or access forbidden. " +
                        "Please check your GitHub token permissions.");
            case 404:
                throw new RuntimeException("Repository not found. Please check the owner and repository name.");
            case 429:
                throw new RuntimeException("GitHub API rate limit exceeded. Please try again later.");
            default:
                throw new RuntimeException("GitHub API error: " + statusCode);
        }
    }

    private org.springframework.http.HttpHeaders createHeaders() {
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.set("Accept", "application/vnd.github.v3+json");
        headers.set("User-Agent", "GitHub-Repository-Analyzer/1.0");

        if (githubToken != null && !githubToken.isBlank()) {
            headers.setBearerAuth(githubToken);
            logger.debug("Using GitHub token for authentication");
        } else {
            logger.warn("No GitHub token configured - API requests will be rate limited");
        }

        return headers;
    }
}