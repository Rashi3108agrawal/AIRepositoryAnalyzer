package com.graphify.graphify_system.controller;

import com.graphify.graphify_system.dto.AnalyzeRequestDTO;
import com.graphify.graphify_system.dto.JobResponseDTO;
import com.graphify.graphify_system.service.RepoJobService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analyze")
public class RepoController {

    private final RepoJobService repoJobService;

    public RepoController(RepoJobService repoJobService) {
        this.repoJobService = repoJobService;
    }

    @PostMapping
    public ResponseEntity<JobResponseDTO> analyzeRepository(@Valid @RequestBody AnalyzeRequestDTO request) {
        JobResponseDTO jobResponse = repoJobService.createJob(request);
        // Return 200 OK for synchronous processing (was 202 Accepted for asynchronous)
        return ResponseEntity.status(HttpStatus.OK).body(jobResponse);
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<JobResponseDTO> getJobStatus(@PathVariable Long jobId) {
        JobResponseDTO jobResponse = repoJobService.getJobById(jobId);
        return ResponseEntity.ok(jobResponse);
    }
}