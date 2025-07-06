# DevSecOps CI/CD Pipeline with Jenkins for Node.js Microservice

Welcome to the DevSecOps CI/CD Pipeline project! This guide walks you step-by-step through configuring a secure, production-ready CI/CD pipeline for a Node.js microservice using **Jenkins**.

This guide is perfect for students and professionals looking to learn:

- Real-world Jenkins pipelines
- Security integrations
- Docker and Kubernetes deployments

---

## 🛠 Prerequisites

- Jenkins installed and running
- Required plugins installed (see below)
- Docker installed on Jenkins agent
- Access to AWS EKS or local Kubernetes
- GitHub repository access
- SonarQube, DockerHub, and Trivy access

### 📦 Jenkins Plugins Required

- Pipeline
- Git
- Docker, Docker Commons, Docker Pipeline
- OWASP Dependency-Check Plugin
- SonarQube Scanner Plugin
- Publish HTML Reports
- Kubernetes CLI Plugin

---

## 📂 Jenkins Pipeline Overview

This Jenkins pipeline performs the following steps:

1. **Clean Workspace**
2. **Checkout Code from GitHub**
3. **Secrets Scanning using GitLeaks**
4. **Static Code Analysis with SonarQube**
5. **Quality Gate Check**
6. **Install Node.js Dependencies**
7. **SAST Scan using Trivy**
8. **SCA Scan using OWASP Dependency-Check**
9. **Build & Push Docker Image to DockerHub**
10. **Vulnerability Scan on Docker Image using Trivy**
11. **Deploy to Kubernetes (AWS EKS)**

---

## 🔧 Step-by-Step Setup

### 1. Clean Workspace

Ensures previous build artifacts are deleted.

```groovy
cleanWs()
```

### 2. Checkout Code

Pulls the project code from GitHub.

```groovy
git branch: 'main', url: 'https://github.com/akaspatranobis/Devops-Masterclass.git'
```

### 3. GitLeaks Secrets Scan

Scans your codebase for hardcoded secrets using Dockerized GitLeaks.

```sh
docker run --rm -v $(pwd):/code zricethezav/gitleaks:latest detect --source=/code
```

### 4. SonarQube Code Analysis

Runs static code analysis using SonarQube.

```groovy
withSonarQubeEnv('sonar-server') {
    sh '$SCANNER_HOME/bin/sonar-scanner -Dsonar.projectName=UI-App -Dsonar.projectKey=UI-App'
}
```

### 5. Quality Gate Check

Ensures SonarQube quality standards are met.

```groovy
waitForQualityGate abortPipeline: false, credentialsId: 'sonar-token'
```

### 6. Install Node.js Dependencies

Installs all required npm packages.

```sh
npm install
```

### 7. TRIVY SAST Scan

Performs static application security testing.

```sh
docker run --rm -v $(pwd):/project aquasec/trivy fs /project --format template --template "@contrib/html.tpl" -o /project/trivy-reports/trivy-sast.html
```

Publishes HTML report to Jenkins.

### 8. OWASP Dependency-Check

Scans project dependencies for known vulnerabilities.

```groovy
dependencyCheck additionalArguments: '--scan ./ --disableYarnAudit --disableNodeAudit', nvdCredentialsId: 'NVDkey', odcInstallation: 'DP-Check'
```

### 9. Docker Build & Push

Builds and pushes the image to DockerHub.

```sh
docker build -t uiapp .
docker tag uiapp apatranobis59/uiapp:latest
docker push apatranobis59/uiapp:latest
```

### 10. Trivy Image Vulnerability Scan

Scans the Docker image for OS and app-level vulnerabilities.

```sh
docker run --rm -v $(pwd):/project aquasec/trivy image apatranobis59/uiapp:latest --format template --template "@contrib/html.tpl" -o /project/trivy-reports/trivy-image.html
```

### 11. Deploy to Kubernetes

Applies Kubernetes manifests to your cluster using `kubectl`.

```sh
kubectl create ns app
kubectl apply -f deployment.yml
kubectl apply -f service.yml
sleep 30
kubectl get all -n app
```

> ⚠️ Make sure to configure Jenkins credentials for DockerHub, SonarQube, OWASP, and Kubernetes access.

---

## 📘 Additional Notes

- `tools { nodejs 'node16' }` refers to Node.js installation managed by Jenkins
- Use managed credentials (`docker`, `sonar-token`, `NVDkey`, `k8s`) securely
- All reports (Trivy, Dependency Check) are stored and published from Jenkins workspace

---

## 🌐 Visit Us

For more such hands-on projects, visit: [www.ec2tech.com](https://www.ec2tech.com)

---

Happy DevOps Learning! 🚀