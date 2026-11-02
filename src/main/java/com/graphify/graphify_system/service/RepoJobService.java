package com.graphify.graphify_system.service;

import com.graphify.graphify_system.dto.AnalyzeRequestDTO;
import com.graphify.graphify_system.dto.FullRepoAnalysis;
import com.graphify.graphify_system.dto.JobResponseDTO;
import com.graphify.graphify_system.model.RepoJob;
import com.graphify.graphify_system.model.RepoJob.JobStatus;
import com.graphify.graphify_system.repository.RepoJobRepository;
import com.graphify.graphify_system.service.AIService;
import com.graphify.graphify_system.service.GitHubService;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RepoJobService {

    private static final Logger logger = LoggerFactory.getLogger(RepoJobService.class);

    private final RepoJobRepository repoJobRepository;
    private final GitHubService gitHubService;
    private final AIService aiService;

    // Simple in-memory rate limiter: 5 requests per second
    private final AtomicLong requestCount = new AtomicLong(0);
    private final AtomicLong lastResetTime = new AtomicLong(System.currentTimeMillis());
    private static final long REQUEST_LIMIT = 5;
    private static final long RESET_INTERVAL_MS = 1000; // 1 second

    public RepoJobService(RepoJobRepository repoJobRepository,
                          GitHubService gitHubService, AIService aiService) {
        this.repoJobRepository = repoJobRepository;
        this.gitHubService = gitHubService;
        this.aiService = aiService;
    }

    @Transactional
    public JobResponseDTO createJob(@Valid AnalyzeRequestDTO request) {
        String repoUrl = request.getRepoUrl().trim();

        // Remove trailing slash if present
        if (repoUrl.endsWith("/")) {
            repoUrl = repoUrl.substring(0, repoUrl.length() - 1);
        }

        logger.info("Creating analysis job for repository: {}", repoUrl);

        // Validate GitHub URL format
        if (!repoUrl.startsWith("https://github.com/")) {
            throw new IllegalArgumentException("Invalid GitHub URL");
        }

        // Rate limiting check
        if (!allowRequest()) {
            throw new IllegalStateException("Too many requests. Please try again later.");
        }

        RepoJob job = new RepoJob();
        job.setRepoUrl(repoUrl);
        job.setStatus(JobStatus.PENDING);
        job.setRetryCount(0);

        RepoJob savedJob = repoJobRepository.save(job);
        logger.info("Job {} created for repository: {}", savedJob.getId(), repoUrl);

        try {
            // Process the job immediately (synchronous)
            processJob(savedJob);
            logger.info("Job {} completed successfully", savedJob.getId());
        } catch (Exception e) {
            logger.error("Error processing job {}: {}", savedJob.getId(), e.getMessage(), e);
            // Update job with error status
            savedJob.setStatus(JobStatus.FAILED);
            savedJob.setErrorMessage(e.getMessage());
            savedJob.setCompletedAt(LocalDateTime.now());
            savedJob = repoJobRepository.save(savedJob);
            // Still return the job response - client can check status
        }

        return repoJobRepository.findById(savedJob.getId())
                .map(JobResponseDTO::fromEntity)
                .orElse(JobResponseDTO.fromEntity(savedJob));
    }

    public JobResponseDTO getJobById(Long jobId) {
        RepoJob job = repoJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found with ID: " + jobId));
        return JobResponseDTO.fromEntity(job);
    }

    /**
     * Simple in-memory rate limiter: allows 5 requests per second.
     * @return true if request is allowed, false otherwise
     */
    private boolean allowRequest() {
        long now = System.currentTimeMillis();
        long lastReset = lastResetTime.get();

        // Reset counter if interval has passed
        if (now - lastReset >= RESET_INTERVAL_MS) {
            if (lastResetTime.compareAndSet(lastReset, now)) {
                requestCount.set(0);
            }
            // If another thread reset first, just use the new value
            lastReset = lastResetTime.get();
        }

        long currentCount = requestCount.incrementAndGet();
        return currentCount <= REQUEST_LIMIT;
    }

    /**
     * Process a job synchronously - contains the logic previously in QueueWorker
     */
    @Transactional
    private void processJob(RepoJob job) {
        String jobId = job.getId().toString();
        logger.info("Starting processing for job {} (repository: {})", jobId, job.getRepoUrl());

        try {
            // Update status to processing
            job.setStatus(JobStatus.PROCESSING);
            repoJobRepository.save(job);
            logger.debug("Job {} status updated to PROCESSING", jobId);

            String[] repoParts = extractRepo(job.getRepoUrl());
            if (repoParts == null || repoParts.length < 2) {
                throw new IllegalArgumentException("Invalid repository URL format");
            }

            logger.debug("Fetching data for repository {}/{}", repoParts[0], repoParts[1]);

            // Fetch data from GitHub with error handling
            Map<String, Object> overview = gitHubService.getRepoOverview(repoParts[0], repoParts[1]);
            if (overview == null) {
                throw new RuntimeException("Failed to fetch repository overview from GitHub");
            }

            Map<String, Object> languages = gitHubService.getLanguages(repoParts[0], repoParts[1]);
            if (languages == null) {
                throw new RuntimeException("Failed to fetch languages from GitHub");
            }

            // Calculate total bytes
            double totalBytes = 0;
            if (languages != null) {
                for (Object value : languages.values()) {
                    if (value instanceof Number) {
                        totalBytes += ((Number) value).doubleValue();
                    }
                }
            }

            // Convert to percentage
            Map<String, Double> normalizedLanguages = new HashMap<>();
            if (totalBytes > 0 && languages != null) {
                for (Map.Entry<String, Object> entry : languages.entrySet()) {
                    double percent = (((Number) entry.getValue()).doubleValue() / totalBytes) * 100;
                    normalizedLanguages.put(entry.getKey(), Math.round(percent * 10.0) / 10.0);
                }
            } else if (overview.get("language") != null) {
                normalizedLanguages.put(overview.get("language").toString(), 100.0);
            }

            List<Map<String, Object>> contributors = gitHubService.getContributors(repoParts[0], repoParts[1]);
            List<Map<String, Object>> commits = gitHubService.getCommits(repoParts[0], repoParts[1]);

            // Codebase metrics
            Map<String, Object> codebase = new HashMap<>();
            codebase.put("languages", normalizedLanguages);
            codebase.put("primaryLanguage", overview.get("language"));
            codebase.put("repoSize", overview.get("size"));

            // Activity metrics
            Map<String, Object> activity = new HashMap<>();
            int commitCount = commits == null ? 0 : commits.size();
            activity.put("totalCommits", commitCount);

            if (commitCount > 100) {
                activity.put("commitFrequency", "High");
            } else if (commitCount > 20) {
                activity.put("commitFrequency", "Medium");
            } else {
                activity.put("commitFrequency", "Low");
            }
            activity.put("lastUpdated", overview.get("updated_at"));

            // Contributor metrics
            Map<String, Object> contributorData = new HashMap<>();
            int contributorCount = contributors == null ? 0 : contributors.size();
            contributorData.put("totalContributors", contributorCount);

            if (!contributors.isEmpty()) {
                contributorData.put("topContributor", contributors.get(0).get("login"));
            }

            // Insights
            Map<String, Object> insights = new HashMap<>();

            Integer stars = overview == null ? null : (Integer) overview.get("stargazers_count");
            Integer forks = overview == null ? null : (Integer) overview.get("forks_count");

            // Popularity
            if (stars != null && stars > 100) {
                insights.put("popularity", "High");
            } else if (stars != null && stars > 20) {
                insights.put("popularity", "Medium");
            } else {
                insights.put("popularity", "Low");
            }

            // Risk
            if (!contributors.isEmpty()) {
                contributorData.put("busFactor", Math.min(2, contributorCount));
            }

            if (contributorCount <= 2) {
                insights.put("riskLevel", "High (Low contributor count)");
            } else {
                insights.put("riskLevel", "Low");
            }

            // Project Type Guess
            String primaryLang = overview == null ? null : (String) overview.get("language");

            if ("Java".equalsIgnoreCase(primaryLang)) {
                insights.put("projectType", "Backend System");
            } else if ("JavaScript".equalsIgnoreCase(primaryLang) ||
                       "TypeScript".equalsIgnoreCase(primaryLang)) {
                insights.put("projectType", "Frontend/Web App");
            } else if ("Python".equalsIgnoreCase(primaryLang)) {
                insights.put("projectType", "Data Science/Scripting");
            } else {
                insights.put("projectType", "General Software Project");
            }

            // Maintainability
            if (contributorCount > 3 && stars != null && stars > 50) {
                insights.put("maintainability", "Good");
            } else {
                insights.put("maintainability", "Moderate");
            }

            // Final Object
            FullRepoAnalysis analysis = new FullRepoAnalysis();
            analysis.setOverview(overview);
            analysis.setCodebase(codebase);
            analysis.setActivity(activity);
            analysis.setContributors(contributorData);
            analysis.setInsights(insights);

            // Convert to JSON
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            String json = mapper.writeValueAsString(analysis);

            // Generate AI summary with error handling
            logger.debug("Generating AI summary for job {}", jobId);
            try {
                String aiSummary = aiService.generateSummary(json);
                if (aiSummary != null && !aiSummary.isEmpty() && !aiSummary.contains("failed")) {
                    analysis.getInsights().put("aiSummary", aiSummary);
                    logger.debug("AI summary generated successfully for job {}", jobId);
                } else {
                    logger.warn("AI service returned empty or failed summary for job {}", jobId);
                    analysis.getInsights().put("aiSummary", "AI summary generation failed");
                }
            } catch (Exception aiException) {
                logger.error("Error generating AI summary for job {}: {}", jobId, aiException.getMessage());
                analysis.getInsights().put("aiSummary", "AI summary generation failed");
            }

            // Update job with results
            json = mapper.writeValueAsString(analysis);
            job.setAnalysisResult(json);
            job.setStatus(JobStatus.COMPLETED);
            job.setCompletedAt(LocalDateTime.now());

            repoJobRepository.save(job);
            logger.info("Job {} completed successfully", jobId);

        } catch (Exception e) {
            logger.error("Error processing job {}: {}", jobId, e.getMessage(), e);

            // Increment retry count and save error
            job.setRetryCount(job.getRetryCount() + 1);
            job.setErrorMessage(e.getMessage());

            // For synchronous processing, we don't retry - just mark as failed
            job.setStatus(JobStatus.FAILED);
            job.setCompletedAt(LocalDateTime.now());
            repoJobRepository.save(job);
        }
    }

    /**
     * Extracts owner and repo name from GitHub URL.
     *
     * @param url GitHub repository URL
     * @return String array [owner, repo] or null if invalid
     */
    private static String[] extractRepo(String url) {
        if (url == null || !url.contains("github.com")) {
            throw new IllegalArgumentException("Invalid GitHub URL");
        }

        String cleaned = url.replace("https://github.com/", "")
                           .replace("http://github.com/", "");

        // Remove trailing slash and any query parameters
        cleaned = cleaned.split("/")[0] + "/" + cleaned.split("/")[1];

        String[] parts = cleaned.split("/");

        if (parts.length < 2) {
            throw new IllegalArgumentException("Invalid GitHub repo format");
        }

        // Clean up any remaining query parameters or fragments
        parts[1] = parts[1].split("[?#]")[0];

        return new String[]{parts[0], parts[1]};
    }
}