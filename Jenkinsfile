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
                git branch: 'main', url: 'https://github.com/akaspatranobis/Devops-Masterclass.git'
            }
        }

        stage('Secrets Scan using GitLeaks') {
            steps {
                sh '''
                echo "🔍 Running GitLeaks scan..."
                docker run --rm -v $(pwd):/code zricethezav/gitleaks:latest detect \
                    --source=/code || true
                '''
            }
        }

        stage("Sonarqube Code Analysis "){
            steps{
                withSonarQubeEnv('sonar-server') {
                    sh ''' $SCANNER_HOME/bin/sonar-scanner -Dsonar.projectName=UI-App \
                    -Dsonar.projectKey=UI-App'''
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
                docker run --rm -v $(pwd):/project aquasec/trivy fs /project \
                    --format template --template "@contrib/html.tpl" \
                    -o /project/trivy-reports/trivy-sast.html
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
                       sh "docker build -t uiapp ."
                       sh "docker tag uiapp apatranobis59/uiapp:latest "
                       sh "docker push apatranobis59/uiapp:latest"
                    }
                }
            }
        }
        stage("Vulnerability SCAN"){
            steps{
                sh '''
                mkdir -p trivy-reports
                docker run --rm -v $(pwd):/project aquasec/trivy image apatranobis59/uiapp:latest \
                    --format template --template "@contrib/html.tpl" \
                    -o /project/trivy-reports/trivy-image.html
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
                                echo "🔧 Ensuring namespace 'app' exists..."
                                sh 'kubectl get ns app || kubectl create ns app'

                                echo "Applying Kubernetes Deployment..."
                                sh 'kubectl apply -f deployment.yml'

                                echo "Checking if service uiapp-service already exists..."
                                def serviceExists = sh(
                                    script: "kubectl get svc uiapp-service -n app > /dev/null 2>&1",
                                    returnStatus: true
                                ) == 0

                                if (!serviceExists) {
                                    echo "✅ Service does not exist. Creating service from service.yml..."
                                    sh 'kubectl apply -n app -f service.yml'
                                } else {
                                    echo "⚠️ Service uiapp-service already exists. Skipping service apply."
                                }

                                echo "Waiting for pods to stabilize..."
                                sh 'sleep 30'

                                echo "Getting deployed resources..."
                                sh 'kubectl get all -n app'
                                
                        }
                    }
                }
            }
        }
        
        
    }

    post {
        always {
            script {
                echo "📤 Sending Kubernetes deployment status email..."

                def kubeOutput = ""

                dir('K8S') {
                        withKubeConfig(caCertificate: '', clusterName: '', contextName: '', credentialsId: 'k8s', namespace: '', restrictKubeConfigAccess: false, serverUrl: '') {
                            kubeOutput = sh(
                                script: "kubectl get all -n app",
                                returnStdout: true
                            ).trim()
                        }
                }    

                emailext (
                    to: 'akaspatranobis@gmail.com',
                    subject: "Jenkins Pipeline: Kubernetes Deployment Status",
                    body: """
                    <h3>✅ DevSecOps CI/CD Pipeline Execution Completed</h3>
                    <p>Here is the list of Kubernetes resources currently running in <b>app</b> namespace:</p>
                    <pre>${kubeOutput}</pre>
                    <br/>
                    <p>🔁 Build Status: ${currentBuild.currentResult}</p>
                    <p>👨‍💻 Jenkins Job: ${env.JOB_NAME} #${env.BUILD_NUMBER}</p>
                    <p>🔗 View it: <a href="${env.BUILD_URL}">${env.BUILD_URL}</a></p>
                    """,
                    mimeType: 'text/html'
                )
            }
        }
    }

}
