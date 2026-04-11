# 🚀 Graphify System – Async GitHub Analyzer

## 📌 Overview

Graphify is a backend system that asynchronously analyzes GitHub repositories and generates structured insights.

Instead of processing requests synchronously, it uses a **queue-based architecture** to handle heavy workloads efficiently and reliably.

---

## 🧠 Key Features

* 🔄 Asynchronous job processing using Redis
* ⚙️ Background worker with retry mechanism
* 📊 GitHub repository analysis (stars, forks, language)
* 🧮 Custom scoring system for repository evaluation
* 💾 Persistent storage using PostgreSQL
* 🔍 Job status tracking via REST APIs

---

## 🏗️ Architecture

Client → REST API → Job Queue (Redis) → Worker → GitHub API → PostgreSQL

---

## 🛠️ Tech Stack

* **Backend:** Spring Boot (Java)
* **Database:** PostgreSQL (Neon)
* **Queue:** Redis (Upstash)
* **API Integration:** GitHub REST API
* **Serialization:** Jackson (JSON)

---

## ⚙️ How It Works

1. User submits a GitHub repo URL
2. API creates a job and pushes it to Redis queue
3. Worker picks job asynchronously
4. Fetches data from GitHub API
5. Extracts key metrics and computes score
6. Stores result in database
7. User fetches result using job ID

---

## 📡 API Endpoints

### 🔹 Analyze Repository

POST `/repo/analyze?repoUrl={url}`

---

### 🔹 Get Job Status

GET `/repo/status/{id}`

---

## 📊 Sample Output

```json
{
  "name": "graphify",
  "stars": 10,
  "forks": 2,
  "language": "Java",
  "score": 11.0
}
```

---

## 🚀 Key Learnings

* Designed asynchronous systems using producer-consumer pattern
* Implemented retry and fault-tolerant processing
* Worked with external APIs and handled failures
* Built clean and scalable backend architecture

---

## 🔮 Future Improvements

* Add AI-based repository summarization
* Implement rate limiting for GitHub API
* Add distributed workers for scalability
* Build frontend dashboard for visualization

---

## 👨‍💻 Author

Rashika Agrawal
