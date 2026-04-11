package com.graphify.graphify_system.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class QueueService {

    private final StringRedisTemplate redisTemplate;

    public QueueService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void pushJob(String jobId) {
        redisTemplate.opsForList().rightPush("repoQueue", jobId);
    }

    public String popJob() {
        return redisTemplate.opsForList().leftPop("repoQueue");
    }
    public boolean allowRequest() {
        String key = "rate_limit";

        Long count = redisTemplate.opsForValue().increment(key);

        if (count == 1) {
            redisTemplate.expire(key, java.time.Duration.ofSeconds(1));
        }

        return count <= 5; // 🔥 allow only 5 requests/sec
    }
    public void pushToDLQ(String jobId) {
        redisTemplate.opsForList().rightPush("deadQueue", jobId);
    }
}