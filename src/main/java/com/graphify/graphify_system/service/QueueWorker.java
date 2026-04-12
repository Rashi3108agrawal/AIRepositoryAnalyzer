package com.graphify.graphify_system.service;

import com.graphify.graphify_system.dto.FullRepoAnalysis;
import com.graphify.graphify_system.dto.RepoAnalysisResult;
import com.graphify.graphify_system.model.RepoJob;
import com.graphify.graphify_system.repository.RepoJobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Async;
import tools.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class QueueWorker {

    @Autowired
    private AIService aiService;
    private final QueueService queueService;
    private final RepoJobRepository repoJobRepository;
    private final GitHubService gitHubService;

    public QueueWorker(QueueService queueService,
                       RepoJobRepository repoJobRepository, GitHubService gitHubService) {
        this.queueService = queueService;
        this.repoJobRepository = repoJobRepository;
        this.gitHubService = gitHubService;
    }

    @Scheduled(fixedDelay = 2000)
    public void processQueue() {
        for (int i = 0; i < 5; i++) {  // 🔥 process multiple jobs
            String jobId = queueService.popJob();
            if (jobId == null) return;

            processJobAsync(jobId);
        }
    }

    private void processJob(String jobId) {

        RepoJob job = repoJobRepository
                .findById(Long.parseLong(jobId))
                .orElse(null);

        if (job == null) return;

        try {
            job.setStatus("PROCESSING");
            repoJobRepository.save(job);

            String[] repoParts = extractRepo(job.getRepoUrl());

// Fetch data
            Map<String, Object> overview = gitHubService.getRepoOverview(repoParts[0], repoParts[1]);
            Map<String, Object> languages = gitHubService.getLanguages(repoParts[0], repoParts[1]);

            Map<String, Double> normalizedLanguages = new HashMap<>();

            double total = 0;

// Calculate total bytes
            for (Object value : languages.values()) {
                total += ((Number) value).doubleValue();
            }

// Convert to percentage
            for (Map.Entry<String, Object> entry : languages.entrySet()) {
                double percent = (((Number) entry.getValue()).doubleValue() / total) * 100;
                normalizedLanguages.put(entry.getKey(), Math.round(percent * 10.0) / 10.0);
            }

            List<Map<String, Object>> contributors = gitHubService.getContributors(repoParts[0], repoParts[1]);
            List<Map<String, Object>> commits = gitHubService.getCommits(repoParts[0], repoParts[1]);

// Codebase
            Map<String, Object> codebase = new HashMap<>();
            codebase.put("languages", normalizedLanguages);
            codebase.put("primaryLanguage", overview.get("language"));
            codebase.put("repoSize", overview.get("size"));

// Activity
            Map<String, Object> activity = new HashMap<>();
            int commitCount = commits.size();

            activity.put("totalCommits", commitCount);

            if (commitCount > 100) {
                activity.put("commitFrequency", "High");
            } else if (commitCount > 20) {
                activity.put("commitFrequency", "Medium");
            } else {
                activity.put("commitFrequency", "Low");
            }
            activity.put("lastUpdated", overview.get("updated_at"));

// Contributors
            Map<String, Object> contributorData = new HashMap<>();
            contributorData.put("totalContributors", contributors.size());

            if (!contributors.isEmpty()) {
                contributorData.put("topContributor", contributors.get(0).get("login"));
            }

// Insights
            Map<String, Object> insights = new HashMap<>();

            Integer stars = (Integer) overview.get("stargazers_count");
            Integer forks = (Integer) overview.get("forks_count");
            int contributorCount = contributors.size();

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
                contributorData.put("busFactor", Math.min(2, contributors.size()));
            }

            if (contributorCount <= 2) {
                insights.put("riskLevel", "High (Low contributor count)");
            } else {
                insights.put("riskLevel", "Low");
            }

// Project Type Guess
            String primaryLang = (String) overview.get("language");

            if ("Java".equals(primaryLang)) {
                insights.put("projectType", "Backend System");
            } else if ("JavaScript".equals(primaryLang)) {
                insights.put("projectType", "Frontend/Web App");
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
            ObjectMapper mapper = new ObjectMapper();
            String json = mapper.writeValueAsString(analysis);
            try {
                job.setStatus("PROCESSING");
                System.out.println("Calling AI...");
                String aiSummary = aiService.generateSummary(json);
                analysis.getInsights().put("aiSummary", aiSummary);
                System.out.println("AI Done");
            } catch (Exception e) {
                System.out.println("AI FAILED: " + e.getMessage());
                analysis.getInsights().put("aiSummary", "AI failed");
            }
            json = mapper.writeValueAsString(analysis);

            job.setAnalysisResult(json);
            job.setStatus("COMPLETED");

            repoJobRepository.save(job);

        } catch (Exception e) {

        }
    }
    @Async
    public void processJobAsync(String jobId) {
        processJob(jobId);
    }

    public static String[] extractRepo(String url) {

        if (url == null || !url.contains("github.com")) {
            throw new RuntimeException("Invalid GitHub URL");
        }

        String cleaned = url.replace("https://github.com/", "");

        String[] parts = cleaned.split("/");

        if (parts.length < 2) {
            throw new RuntimeException("Invalid GitHub repo format");
        }

        return new String[]{parts[0], parts[1]};
    }
}