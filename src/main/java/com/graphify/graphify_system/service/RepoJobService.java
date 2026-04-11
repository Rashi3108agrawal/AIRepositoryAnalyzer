package com.graphify.graphify_system.service;
import com.graphify.graphify_system.model.RepoJob;
import com.graphify.graphify_system.repository.RepoJobRepository;
import com.graphify.graphify_system.service.JobWorkerService;
import org.antlr.v4.runtime.misc.LogManager;
import org.springframework.stereotype.Service;

@Service
public class RepoJobService {

    private final JobWorkerService jobWorkerService;
    private final RepoJobRepository repoJobRepository;
    private final QueueService queueService;

    public RepoJobService(RepoJobRepository repoJobRepository,
                          JobWorkerService jobWorkerService, QueueService queueService) {
        this.repoJobRepository = repoJobRepository;
        this.jobWorkerService = jobWorkerService;
        this.queueService = queueService;
    }

    public RepoJob createJob(String repoUrl) {

        if (!repoUrl.startsWith("https://github.com/")) {
            throw new RuntimeException("Invalid GitHub URL");
        }

        if (!queueService.allowRequest()) {
            throw new RuntimeException("Too many requests. Try later.");
        }

        RepoJob job = new RepoJob();
        job.setRepoUrl(repoUrl);
        job.setStatus("PENDING");
        job.setRetryCount(0);

        RepoJob savedJob = repoJobRepository.save(job);

        try {
            queueService.pushJob(savedJob.getId().toString());
        } catch (Exception e) {
            System.out.println("Queue push failed: " + e.getMessage());
        }

        return savedJob;
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
