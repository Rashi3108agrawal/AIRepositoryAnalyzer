package com.graphify.graphify_system.controller;

import com.graphify.graphify_system.model.RepoJob;
import com.graphify.graphify_system.repository.RepoJobRepository;
import com.graphify.graphify_system.service.RepoJobService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/repo")
@CrossOrigin(origins = "*", maxAge = 3600)
public class RepoController {

    private final RepoJobService repoJobService;
    private final RepoJobRepository repoJobRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RepoController(RepoJobService repoJobService, RepoJobRepository repoJobRepository) {
        this.repoJobService = repoJobService;
        this.repoJobRepository = repoJobRepository;
    }

    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeRepo(@RequestParam String repoUrl) {
        try {
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Repository URL is required"));
            }

            RepoJob job = repoJobService.createJob(repoUrl);

            Map<String, Object> response = new HashMap<>();
            response.put("id", job.getId());
            response.put("status", "CREATED");
            response.put("message", "Analysis job created successfully");
            response.put("jobId", job.getId());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of(
                        "error", "Failed to create analysis job",
                        "message", e.getMessage()
                    ));
        }
    }

    @GetMapping("/status/{id}")
    public ResponseEntity<Object> getStatus(@PathVariable Long id) {
        try {
            RepoJob job = repoJobRepository.findById(id).orElse(null);

            if (job == null) {
                return ResponseEntity.notFound().build();
            }

            Map<String, Object> response = new HashMap<>();
            response.put("id", job.getId());
            response.put("status", job.getStatus());
            response.put("repoUrl", job.getRepoUrl());
            response.put("createdAt", job.getCreatedAt());

            if (job.getAnalysisResult() != null) {
                try {
                    Object analysisData = objectMapper.readValue(job.getAnalysisResult(), Object.class);
                    response.put("analysisResult", analysisData);
                } catch (Exception e) {
                    response.put("analysisResult", job.getAnalysisResult());
                }
            }

            if (job.getSummary() != null) {
                response.put("summary", job.getSummary());
            }

            if (job.getErrorMessage() != null) {
                response.put("errorMessage", job.getErrorMessage());
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of(
                        "error", "Failed to fetch status",
                        "message", e.getMessage()
                    ));
        }
    }

    @GetMapping("/jobs")
    public ResponseEntity<Map<String, Object>> getAllJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            Map<String, Object> response = new HashMap<>();
            response.put("jobs", repoJobRepository.findAll());
            response.put("total", repoJobRepository.count());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}