# 🚀 Graphify System – Enterprise-Grade Async GitHub Analyzer

## 🎯 Project Objective

Graphify is a **production-ready, full-stack asynchronous system** designed to analyze GitHub repositories at scale. It demonstrates expertise in **distributed systems architecture, cloud technologies, API integration, and modern software engineering practices**.

---

## ✨ Core Features

### 🔄 **Asynchronous Job Processing**
- Non-blocking REST API for immediate user feedback
- Redis-powered job queue for reliable task distribution
- Background workers with automatic retry mechanisms
- Real-time job status tracking via polling endpoints

### 📊 **Comprehensive Repository Analysis**
- **Repository Metrics**: Stars, forks, repository size, primary language
- **Codebase Analysis**: Language composition with percentage breakdown
- **Activity Insights**: Total commits, commit frequency classification, last update time
- **Contributor Statistics**: Top contributors, contribution patterns
- **AI-Powered Summaries**: Groq API integration for intelligent repo descriptions

### 💾 **Persistent Data Management**
- PostgreSQL database for reliable data storage
- Transaction-safe job processing
- Complete audit trail with timestamps and status history

### 🎨 **Interactive Dashboard**
- Real-time React 18 frontend with modern UI
- Data visualization with Recharts (pie charts, progress bars)
- Responsive design with glassmorphism styling
- Animated metrics with CountUp library

---

## 🏗️ Architecture

### **System Diagram**
```
┌─────────────┐      ┌──────────────┐      ┌───────────────┐
│   React UI  │─────▶│ Spring Boot  │─────▶│ Redis Queue   │
│  (Port 3000)│      │  REST API    │      │  (Upstash)    │
└─────────────┘      └──────────────┘      └───────────────┘
                            ▲                       │
                            │                       ▼
                     ┌──────────────┐      ┌───────────────┐
                     │ PostgreSQL   │◀─────│ Queue Worker  │
                     │   (Neon)     │      │  (Background) │
                     └──────────────┘      └───────────────┘
                            ▲                       │
                            └───────────────────────┘
                                GitHub API
                                Groq AI API
```

### **Request Flow**
1. **User submits repository URL** → Frontend sends POST request
2. **API validates & creates job** → Job persisted in database
3. **Job queued in Redis** → Returns job ID immediately
4. **Worker picks job from queue** → Processes asynchronously
5. **GitHub API called** → Fetches repository data
6. **Analysis performed** → Language normalization, metrics computation
7. **AI Summary generated** → Groq API integration
8. **Results stored in DB** → Job marked as SUCCESS
9. **Frontend polls for status** → Fetches complete analysis

---

## 🛠️ Tech Stack

### **Backend**
- **Runtime**: Java 17
- **Framework**: Spring Boot 4.0.5
- **Web**: Spring WebMVC + WebFlux
- **Data**: Spring Data JPA + Hibernate
- **Message Queue**: Redis (Spring Data Redis)
- **Database**: PostgreSQL 
- **ORM**: Lombok for boilerplate reduction

### **Frontend**
- **Library**: React 18
- **HTTP Client**: Axios
- **Charting**: Recharts
- **Build Tool**: Create React App
- **Styling**: CSS3 with gradient backgrounds

### **Cloud Services**
- **Database**: Neon (PostgreSQL managed)
- **Message Queue**: Upstash (Redis managed)
- **AI Service**: Groq API (LLaMA 3.1 8B model)
- **SCM**: GitHub REST API

---

## 📡 API Endpoints

### **Analyze Repository**
```http
POST /repo/analyze?repoUrl=https://github.com/owner/repo
```

**Response:**
```json
{
  "id": 42,
  "status": "CREATED",
  "message": "Analysis job created successfully",
  "jobId": 42
}
```

### **Get Job Status & Results**
```http
GET /repo/status/{jobId}
```

**Response:**
```json
{
  "id": 42,
  "status": "SUCCESS",
  "repoUrl": "https://github.com/facebook/react",
  "createdAt": "2026-04-16T10:30:00Z",
  "analysisResult": {
    "name": "react",
    "overview": {
      "stars": 215000,
      "forks": 44000,
      "size": 125000
    },
    "codebase": {
      "languages": {
        "JavaScript": 89.5,
        "TypeScript": 8.2,
        "Other": 2.3
      }
    },
    "activity": {
      "totalCommits": 25000,
      "commitFrequency": "High",
      "lastUpdated": "2026-04-16T15:22:00Z"
    }
  },
  "summary": "React is a widely-used JavaScript library for building user interfaces with component-based architecture..."
}
```

### **Get All Jobs**
```http
GET /repo/jobs?page=0&size=10
```

---

## 💡 Key Design Patterns

### **1. Producer-Consumer Architecture**
```java
// Producer: REST Controller
@PostMapping("/analyze")
public ResponseEntity analyzeRepo(@RequestParam String repoUrl) {
    RepoJob job = repoJobService.createJob(repoUrl);
    queueService.enqueue(job.getId());
    return ResponseEntity.ok(job.getId());
}

// Consumer: Background Worker
@Component
public class QueueWorker {
    @Scheduled(fixedDelay = 2000)
    public void processQueue() {
        String jobId = queueService.popJob(); // Non-blocking dequeue
        if (jobId != null) {
            processJobAsync(jobId);
        }
    }
}
```

### **2. Asynchronous Processing**
- API returns immediately without blocking
- Workers process jobs in background
- Frontend polls for status updates
- Improves user experience and system throughput

### **3. Fault Tolerance**
```java
public class RepoJob {
    private int retryCount;
    private int maxRetries = 3;  // Automatic retry
    // Job retries up to 3 times on failure
}
```

### **4. Data Transformation Pipeline**
- Normalize GitHub API responses
- Compute derived metrics (language percentages)
- Enrich with AI summaries
- Serialize to JSON for storage

---

## 🔧 Configuration

### **Environment Variables**
```properties
# Database
spring.datasource.url=jdbc:postgresql://host:port/db
spring.datasource.username=user
spring.datasource.password=pass

# Redis
spring.redis.host=host
spring.redis.port=6379

# GitHub API
github.api.token=ghp_xxxxx

# Groq AI
groq.api.key=gsk_xxxxx
```

---

## 📊 Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| **API Response Time** | <100ms | Immediate job creation |
| **Job Processing Time** | 2-5s | GitHub API calls + AI |
| **Worker Batch Size** | 5 jobs/cycle | Configurable |
| **Queue Poll Frequency** | 2s | Prevents CPU overload |
| **Database Queries** | Optimized with JPA | Connection pooling |
| **Concurrent Processing** | Horizontally scalable | Add more worker instances |

---

## 🚀 Future Enhancements

### **Short Term**
- [ ] Implement webhook notifications instead of polling
- [ ] Add caching layer for frequently analyzed repos
- [ ] Rate limiting for GitHub API
- [ ] Metrics dashboard (Prometheus + Grafana)

### **Medium Term**
- [ ] Multi-language repository comparison
- [ ] Contributor trend analysis
- [ ] Security vulnerability detection
- [ ] Technology stack recommendations

### **Long Term**
- [ ] Distributed worker cluster
- [ ] Machine learning for repo recommendations
- [ ] Integration with CI/CD pipelines
- [ ] Enterprise features (SSO, audit logs)

---

## 📈 What This Project Demonstrates

✅ **System Design**: Queue-based architecture for scalability  
✅ **Distributed Systems**: Asynchronous processing, fault tolerance  
✅ **API Integration**: GitHub REST API + Groq AI integration  
✅ **Database Design**: PostgreSQL with ORM best practices  
✅ **Backend Development**: Spring Boot microservices patterns  
✅ **Frontend Development**: React with real-time data  
✅ **Cloud Technologies**: Managed databases, message queues, APIs  
✅ **DevOps**: Containerization, cloud deployment ready  

---

## 🎓 Technologies Learned

- Spring Boot framework and Spring Data JPA
- Redis message queues and asynchronous processing
- PostgreSQL and relational database design
- React 18 with modern hooks patterns
- REST API design and HTTP protocols
- GitHub API integration and authentication
- Error handling and retry mechanisms
- Docker containerization (ready)
- CI/CD pipeline integration

---

## 📞 Contact & Support

**Author**: Rashika Agrawal  
**GitHub**: [Rashi3108agrawal](https://github.com/Rashi3108agrawal)  
**Project**: [repoAnalyzer](https://github.com/Rashi3108agrawal/repoAnalyzer)



## 👨‍💻 Author

Rashika Agrawal
