package com.graphify.graphify_system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class AnalyzeRequestDTO {
    @NotBlank(message = "Repository URL is required")
    @Pattern(regexp = "^https://github.com/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+/?$",
             message = "Please provide a valid GitHub repository URL (e.g., https://github.com/owner/repo)")
    private String repoUrl;
}