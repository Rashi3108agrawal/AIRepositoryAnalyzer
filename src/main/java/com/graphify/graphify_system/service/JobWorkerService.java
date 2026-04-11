package com.graphify.graphify_system.service;

import com.graphify.graphify_system.model.RepoJob;
import com.graphify.graphify_system.repository.RepoJobRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class JobWorkerService {

    private final RepoJobRepository repoJobRepository;

    public JobWorkerService(RepoJobRepository repoJobRepository) {
        this.repoJobRepository = repoJobRepository;
    }

    @Async
    public void processJob(RepoJob job) {
        try {
            job.setStatus("PROCESSING");
            repoJobRepository.save(job);

            // simulate work (later we will add graph logic here)
            Thread.sleep(5000);

            job.setStatus("COMPLETED");
            repoJobRepository.save(job);

        } catch (Exception e) {
            job.setStatus("FAILED");
            repoJobRepository.save(job);
        }
    }
}