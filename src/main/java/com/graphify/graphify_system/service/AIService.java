package com.graphify.graphify_system.service;

import com.graphify.graphify_system.config.WebClientConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AIService {

    @Autowired
    private WebClient webClient;

    @Value("${groq.api.key}")
    private String apiKey;

    public String generateSummary(String analysisJson) {

        String prompt = "Summarize this repository in 3 lines:\n"
                + analysisJson.substring(0, Math.min(1500, analysisJson.length()));

        Map<String, Object> requestBody = new HashMap<>();

        requestBody.put("model", "llama3-8b-8192");

// messages
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of(
                "role", "user",
                "content", prompt
        ));

        requestBody.put("messages", messages);

// ADD THESE (🔥 VERY IMPORTANT)
        requestBody.put("temperature", 0.7);
        requestBody.put("max_tokens", 300);   // ⚠️ REQUIRED in many cases

        Map response = webClient
                .post()
                .uri("/openai/v1/chat/completions")
                .headers(headers -> {
                    headers.setBearerAuth(apiKey);
                    headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
                })
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(java.time.Duration.ofSeconds(20))
                .block();

        try {
            try {
                java.util.List choices = (java.util.List) response.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map choice = (Map) choices.get(0);
                    Map message = (Map) choice.get("message");
                    return (String) message.get("content");
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            return "AI parsing failed";
        } catch (Exception e) {
            e.printStackTrace();   // 🔥 ADD THIS
            return "AI summary not available";
        }
    }
}