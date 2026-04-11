package com.graphify.graphify_system.dto;

public class RepoAnalysisResult {

    private String name;
    private Integer stars;
    private Integer forks;
    private String language;
    private Double score;

    // getters + setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getStars() { return stars; }
    public void setStars(Integer stars) { this.stars = stars; }

    public Integer getForks() { return forks; }
    public void setForks(Integer forks) { this.forks = forks; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }
}