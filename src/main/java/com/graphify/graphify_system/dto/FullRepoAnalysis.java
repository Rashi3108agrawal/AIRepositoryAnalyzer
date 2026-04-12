package com.graphify.graphify_system.dto;

import lombok.Data;

import java.util.Map;

@Data
public class FullRepoAnalysis {

    private Map<String, Object> overview;
    private Map<String, Object> codebase;
    private Map<String, Object> activity;
    private Map<String, Object> contributors;
    private Map<String, Object> insights;

    public Map<String, Object> getOverview() {
        return overview;
    }

    public void setOverview(Map<String, Object> overview) {
        this.overview = overview;
    }

    public Map<String, Object> getCodebase() {
        return codebase;
    }

    public void setCodebase(Map<String, Object> codebase) {
        this.codebase = codebase;
    }

    public Map<String, Object> getActivity() {
        return activity;
    }

    public void setActivity(Map<String, Object> activity) {
        this.activity = activity;
    }

    public Map<String, Object> getContributors() {
        return contributors;
    }

    public void setContributors(Map<String, Object> contributors) {
        this.contributors = contributors;
    }

    public Map<String, Object> getInsights() {
        return insights;
    }

    public void setInsights(Map<String, Object> insights) {
        this.insights = insights;
    }
}