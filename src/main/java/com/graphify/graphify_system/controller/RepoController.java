package com.graphify.graphify_system.controller;

import com.graphify.graphify_system.model.RepoJob;
import com.graphify.graphify_system.repository.RepoJobRepository;
import com.graphify.graphify_system.service.RepoJobService;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/repo")   // ✅ IMPORTANT
public class RepoController {

    private final RepoJobService repoJobService;
    private final RepoJobRepository repoJobRepository;

    public RepoController(RepoJobService repoJobService, RepoJobRepository repoJobRepository) {
        this.repoJobService = repoJobService;
        this.repoJobRepository = repoJobRepository;
    }

    @PostMapping("/analyze")   // ✅ IMPORTANT
    public RepoJob analyzeRepo(@RequestParam String repoUrl) {
        return repoJobService.createJob(repoUrl);
    }
    @GetMapping("/status/{id}")
    public Object getStatus(@PathVariable Long id) throws Exception {
        RepoJob job = repoJobRepository.findById(id).orElse(null);

        if (job == null) return null;

        if (job.getAnalysisResult() != null) {
            ObjectMapper mapper = new ObjectMapper();
            Object json = mapper.readValue(job.getAnalysisResult(), Object.class);

            return json;
        }

        return job;
    }
}