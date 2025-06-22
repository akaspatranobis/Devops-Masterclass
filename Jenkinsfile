pipeline{
    agent any
    tools{
        nodejs 'node16'
    }
    environment {
        SCANNER_HOME=tool 'sonar-scanner'
    }
    stages {
        stage('clean workspace'){
            steps{
                cleanWs()
            }
        }
        stage('Checkout from GitHub'){
            steps{
                git branch: 'main', url: 'https://github.com/akaspatranobis/hotstar-clone-app-ci-cd-k8.git'
            }
        }
        stage("Sonarqube Code Analysis "){
            steps{
                withSonarQubeEnv('sonar-server') {
                    sh ''' $SCANNER_HOME/bin/sonar-scanner -Dsonar.projectName=Hotstar \
                    -Dsonar.projectKey=Hotstar'''
                }
            }
        }
        stage("Quality Gates Check"){
           steps {
                script {
                    waitForQualityGate abortPipeline: false, credentialsId: 'sonar-token'
                }
            }
        }
        stage('Install Build Dependencies') {
            steps {
                sh "npm install"
            }
        }
        
        stage('TRIVY SAST SCAN') {
            steps {
                sh '''
                    mkdir -p trivy-reports
                    trivy fs . --format template --template "@/contrib/html.tpl" -o trivy-reports/trivy-sast.html
                '''
                publishHTML(target: [
                    reportName: 'Trivy SAST Report',
                    reportDir: 'trivy-reports',
                    reportFiles: 'trivy-sast.html',
                    keepAll: true,
                    allowMissing: false,
                    alwaysLinkToLastBuild: true
                ])
            }
        }

        stage('OWASP SCA SCAN') {
            steps {
                dependencyCheck additionalArguments: '--scan ./ --disableYarnAudit --disableNodeAudit', nvdCredentialsId: 'NVDkey', odcInstallation: 'DP-Check'
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
            }
        }

        stage("Docker Build & Push"){
            steps{
                script{
                   withDockerRegistry(credentialsId: 'docker', toolName: 'docker'){
                       sh "docker build -t hotstar ."
                       sh "docker tag hotstar apatranobis59/hotstar:latest "
                       sh "docker push apatranobis59/hotstar:latest"
                    }
                }
            }
        }
        stage("Vulnerability SCAN"){
            steps{
                sh '''
                mkdir -p trivy-reports
                trivy image apatranobis59/hotstar:latest --format template --template "@/contrib/html.tpl" -o trivy-reports/trivy-image.html
                '''
                publishHTML(target: [
                    reportName: 'Trivy Image Vulnerability Report',
                    reportDir: 'trivy-reports',
                    reportFiles: 'trivy-image.html',
                    keepAll: true,
                    allowMissing: false,
                    alwaysLinkToLastBuild: true
                ])
            }
        }
		
		stage('Deploy to Kubernetes (AWS EKS)'){
            steps{
                script{
                    dir('K8S') {
                        withKubeConfig(caCertificate: '', clusterName: '', contextName: '', credentialsId: 'k8s', namespace: '', restrictKubeConfigAccess: false, serverUrl: '') {
                                sh 'kubectl apply -f deployment.yml'
                                sh 'kubectl apply -f service.yml'
                        }
                    }
                }
            }
        }
        
        
    }
}
