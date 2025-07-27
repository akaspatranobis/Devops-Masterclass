pipeline{
    agent any
    tools{
        nodejs 'node16'
    }
    environment {
        SCANNER_HOME=tool 'sonar-scanner'
    }

    parameters {
        string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Docker image tag to use')
        choice(name: 'ENV', choices: ['dev', 'staging', 'prod'], defaultValue: 'dev', description: 'Target deployment environment')
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
                       sh "docker tag uiapp apatranobis59/uiapp:${params.IMAGE_TAG}"
                       sh "docker push apatranobis59/uiapp:${params.IMAGE_TAG}"
                    }
                }
            }
        }
        stage("Vulnerability SCAN"){
            steps{
                sh '''
                mkdir -p trivy-reports
                docker run --rm -v $(pwd):/project aquasec/trivy image apatranobis59/uiapp:${IMAGE_TAG} \
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
                                echo "🔧 Ensuring namespace '${params.ENV}' exists..."
                                sh "kubectl get ns ${params.ENV} || kubectl create ns ${params.ENV}"

                                echo "Update the Image Built in the Deployment File"
                                sh "sed -i 's/__IMAGE_TAG__/${params.IMAGE_TAG}/g' deployment.yml"

                                echo "Applying Kubernetes Deployment..."
                                sh "kubectl apply -n ${params.ENV} -f deployment.yml"

                                echo "Checking if service uiapp-service already exists..."
                                def serviceExists = sh(
                                    script: "kubectl get svc uiapp-service -n ${params.ENV} > /dev/null 2>&1",
                                    returnStatus: true
                                ) == 0

                                if (!serviceExists) {
                                    echo "✅ Service does not exist. Creating service from service.yml..."
                                    sh 'kubectl apply -n ${params.ENV} -f service.yml'
                                } else {
                                    echo "⚠️ Service uiapp-service already exists. Skipping service apply."
                                }

                                echo "⏳ Waiting for rollout to complete..."
                                sh "kubectl rollout status deployment/uiapp-deployment -n ${params.ENV} --timeout=90s"

                                echo "🔗 Getting final resources..."
                                sh "kubectl get all -n ${params.ENV}"
                                
                        }
                    }
                }
            }
        }
        
        
    }

    post {
        always {
 
            mail to: 'info.ec2tech@gmail.com',
                 subject: "Jenkins Build Notification: ${currentBuild.fullDisplayName}",
                 body: """\
                 Build Status: ${currentBuild.currentResult}
                 Project: ${env.JOB_NAME}
                 Build Number: ${env.BUILD_NUMBER}
                 Build URL: ${env.BUILD_URL}
                 """

        }
    }

}
