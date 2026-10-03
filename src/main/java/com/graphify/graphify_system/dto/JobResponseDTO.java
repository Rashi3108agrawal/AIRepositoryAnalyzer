package com.graphify.graphify_system.dto;

import com.graphify.graphify_system.model.RepoJob;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobResponseDTO {
    private Long id;
    private String repoUrl;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private String analysisResult;
    private String summary;
    private String errorMessage;
    private int retryCount;
    private int maxRetries;

    public static JobResponseDTO fromEntity(RepoJob job) {
        JobResponseDTO dto = new JobResponseDTO();
        dto.setId(job.getId());
        dto.setRepoUrl(job.getRepoUrl());
        dto.setStatus(job.getStatus() != null ? job.getStatus().name() : null);
        dto.setCreatedAt(job.getCreatedAt());
        dto.setCompletedAt(job.getCompletedAt());
        dto.setAnalysisResult(job.getAnalysisResult());
        dto.setSummary(job.getSummary());
        dto.setErrorMessage(job.getErrorMessage());
        dto.setRetryCount(job.getRetryCount());
        dto.setMaxRetries(job.getMaxRetries());
        return dto;
    }
}