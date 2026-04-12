package com.graphify.graphify_system.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class GitHubService {

    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> getRepoData(String owner, String repo) {
        String url = "https://api.github.com/repos/" + owner + "/" + repo;
        return restTemplate.getForObject(url, Map.class);
    }
    public Map<String, Object> getRepoOverview(String owner, String repo) {
        String url = "https://api.github.com/repos/" + owner + "/" + repo;
        return restTemplate.getForObject(url, Map.class);
    }
    public List<Map<String, Object>> getCommits(String owner, String repo) {
        String url = "https://api.github.com/repos/" + owner + "/" + repo + "/commits";
        return restTemplate.getForObject(url, List.class);
    }
    public List<Map<String, Object>> getContributors(String owner, String repo) {
        String url = "https://api.github.com/repos/" + owner + "/" + repo + "/contributors";
        return restTemplate.getForObject(url, List.class);
    }
    public Map<String, Object> getLanguages(String owner, String repo) {
        String url = "https://api.github.com/repos/" + owner + "/" + repo + "/languages";
        return restTemplate.getForObject(url, Map.class);
    }
}