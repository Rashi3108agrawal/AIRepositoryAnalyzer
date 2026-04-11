package com.graphify.graphify_system.service;

import com.graphify.graphify_system.dto.RepoAnalysisResult;
import com.graphify.graphify_system.model.RepoJob;
import com.graphify.graphify_system.repository.RepoJobRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Async;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

@Component
public class QueueWorker {

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

            // ✅ USE job HERE (valid scope)
            String[] repoParts = extractRepo(job.getRepoUrl());

            Map<String, Object> repoData =
                    gitHubService.getRepoData(repoParts[0], repoParts[1]);

            job.setStatus("COMPLETED");
            String name = (String) repoData.get("name");
            Integer stars = (Integer) repoData.get("stargazers_count");
            Integer forks = (Integer) repoData.get("forks_count");
            String language = (String) repoData.get("language");
            Boolean isPrivate = (Boolean) repoData.get("private");
            RepoAnalysisResult result = new RepoAnalysisResult();

            result.setName(name);
            result.setStars(stars);
            result.setForks(forks);
            result.setLanguage(language);

            double score = stars + (forks * 0.5);
            result.setScore(score);
            ObjectMapper mapper = new ObjectMapper();
            String jsonResult = mapper.writeValueAsString(result);

            job.setAnalysisResult(jsonResult);
            repoJobRepository.save(job);

        } catch (Exception e) {
            // retry logic
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