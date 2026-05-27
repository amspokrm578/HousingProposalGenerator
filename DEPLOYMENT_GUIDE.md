# Deployment Guide: AWS EC2 + GitHub Actions + ArgoCD + CircleCI

This guide describes how to deploy the Housing Proposal Generator as a public portfolio project on AWS EC2 while using:

- GitHub Actions for primary CI, Docker image builds, and GitOps manifest updates.
- ArgoCD for deployment automation.
- CircleCI for secondary checks such as nightly integration tests and security scans.
- k3s on EC2 as a lightweight Kubernetes runtime.

The recommended production path is:

```text
GitHub pull request
  -> GitHub Actions runs backend/frontend checks

Merge to main
  -> GitHub Actions builds Docker images
  -> GitHub Actions pushes images to GHCR or ECR
  -> GitHub Actions updates Kubernetes image tags in Git
  -> ArgoCD detects Git changes
  -> ArgoCD syncs the EC2 k3s cluster
  -> App is available at https://your-domain.com

CircleCI
  -> Runs scheduled/secondary checks without directly deploying
```

## 1. Target Architecture

```text
Public Internet
  |
  v
Route 53 / DNS A record
  |
  v
AWS Elastic IP
  |
  v
EC2 Ubuntu instance
  |
  v
k3s Kubernetes
  |
  +-- Nginx Ingress Controller
  +-- cert-manager
  +-- ArgoCD
  +-- frontend deployment
  +-- backend deployment
  +-- celery worker deployment
  +-- celery beat deployment
  +-- redis deployment
```

Recommended EC2 size:

```text
Minimum:     t3.small, 2 GB RAM
Recommended: t3.medium, 4 GB RAM
Storage:     30 GB gp3
OS:          Ubuntu 22.04 LTS or 24.04 LTS
```

For a portfolio project, use one EC2 instance running k3s. This is simpler and cheaper than EKS while still demonstrating Kubernetes, GitOps, CI, CD, and production-style deployment practices.

## 2. Important Project Notes

This project currently has:

- Django backend in `backend/`
- Vite/React frontend in `frontend/`
- Celery worker and beat processes using the backend codebase
- Redis for Celery/cache
- SQLite by default unless `USE_MSSQL=1` is set
- Optional SQL Server support via `mssql-django`

For the first public portfolio deployment, the simplest database option is SQLite with a persistent volume. For a more production-like deployment, use PostgreSQL or an external managed database. SQL Server is possible, but it is heavier for a small EC2 portfolio deployment.

This guide assumes:

- Backend image name: `housing-proposal-backend`
- Frontend image name: `housing-proposal-frontend`
- Container registry: GitHub Container Registry, also called GHCR
- Domain: `your-domain.com`
- Kubernetes namespace: `housing-proposal`

Replace those values with your real names.

## 3. Local Machine Prerequisites

Install these tools on your local machine:

```bash
git --version
docker --version
aws --version
kubectl version --client
```

Recommended optional tools:

```bash
helm version
argocd version --client
```

You also need:

- A GitHub repository for this project.
- An AWS account.
- An EC2 key pair.
- A domain name if you want a clean public HTTPS URL.

## 4. Prepare the Repository

Create these directories:

```bash
mkdir -p .github/workflows
mkdir -p .circleci
mkdir -p deploy/base
mkdir -p deploy/overlays/prod
```

Recommended final structure:

```text
.
+-- .github/workflows/
+-- .circleci/
+-- backend/
+-- frontend/
+-- deploy/
    +-- base/
    +-- overlays/
        +-- prod/
```

## 5. Add a Production Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Create `frontend/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

The backend already has `backend/Dockerfile`. For production, consider replacing Django's development server with Gunicorn later. A simple first deployment can still use the current image, but production should use a WSGI server.

Recommended backend production command:

```bash
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

If you use Gunicorn, add it to `backend/requirements.txt`:

```text
gunicorn>=23,<24
```

## 6. Create AWS EC2 Instance

In AWS:

1. Open EC2.
2. Launch an Ubuntu 22.04 or 24.04 instance.
3. Choose `t3.medium` if your budget allows.
4. Allocate 30 GB gp3 storage.
5. Create or select an SSH key pair.
6. Configure security group:

```text
Port 22   SSH    Your IP only
Port 80   HTTP   0.0.0.0/0
Port 443  HTTPS  0.0.0.0/0
```

Allocate and associate an Elastic IP:

```text
EC2 -> Elastic IPs -> Allocate Elastic IP -> Associate with instance
```

SSH into the instance:

```bash
ssh -i /path/to/key.pem ubuntu@<elastic-ip>
```

Update packages:

```bash
sudo apt update
sudo apt upgrade -y
```

## 7. Install k3s on EC2

On the EC2 instance:

```bash
curl -sfL https://get.k3s.io | sh -
```

Check the node:

```bash
sudo k3s kubectl get nodes
```

If you see an error like this, `kubectl` is not using the k3s kubeconfig:

```text
The connection to the server localhost:8080 was refused
```

That usually means `kubectl` has no active cluster config and is falling back to its default localhost endpoint.

First confirm k3s is running:

```bash
sudo systemctl status k3s --no-pager
```

Then allow your Ubuntu user to read the kubeconfig:

```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown "$USER":"$USER" ~/.kube/config
chmod 600 ~/.kube/config
```

Verify:

```bash
kubectl config current-context
kubectl get nodes
kubectl get pods -A
```

If you still get a permissions warning such as `Unable to read /etc/rancher/k3s/k3s.yaml`, you are probably running with `KUBECONFIG` pointed at the root-owned k3s config. Use your copied config instead:

```bash
export KUBECONFIG="$HOME/.kube/config"
kubectl get nodes
```

To make that persistent on the EC2 instance:

```bash
echo 'export KUBECONFIG="$HOME/.kube/config"' >> ~/.bashrc
source ~/.bashrc
```

Do not run the EC2 cluster check from your local machine unless you have copied and edited the kubeconfig for remote access. On the EC2 instance, the server address in `~/.kube/config` can stay as the local k3s API endpoint. On your local machine, it would need to point to the EC2 public IP or a secure tunnel.

k3s includes Traefik by default. You can either use Traefik or disable it and install Nginx Ingress. This guide uses Nginx Ingress, so install k3s with Traefik disabled if you want that path:

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable traefik" sh -
```

If you already installed k3s with Traefik, either use Traefik for ingress or reinstall k3s before putting production traffic on it.

## 8. Install Nginx Ingress Controller

On EC2:

```bash
kubectl create namespace ingress-nginx
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/cloud/deploy.yaml
```

For a single-node k3s EC2 deployment, you may prefer a NodePort/host-network ingress setup. Validate that ports 80 and 443 are bound:

```bash
kubectl get svc -n ingress-nginx
kubectl get pods -n ingress-nginx
```

If the default cloud-provider LoadBalancer service stays pending, patch it to NodePort or use the k3s ServiceLB behavior. For the simplest setup, Traefik's built-in k3s ingress may be easier. The key requirement is that HTTP and HTTPS from the EC2 public IP reach your Kubernetes ingress controller.

## 9. Install cert-manager for HTTPS

On EC2:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
```

Wait until pods are ready:

```bash
kubectl get pods -n cert-manager
```

Create `deploy/base/cluster-issuer.yaml`:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: your-email@example.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

Replace `your-email@example.com`.

## 10. Install ArgoCD

On EC2:

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Wait for ArgoCD:

```bash
kubectl get pods -n argocd
```

Get the initial admin password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
echo
```

Access ArgoCD locally through port forwarding:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Then open:

```text
https://localhost:8080
```

Username:

```text
admin
```

Use the initial password from the previous command.

For a portfolio deployment, do not expose ArgoCD publicly unless you secure it carefully.

## 11. Configure DNS

If using Route 53:

1. Create or select a hosted zone for your domain.
2. Create an `A` record:

```text
Name: your-domain.com
Type: A
Value: <EC2 Elastic IP>
TTL: 300
```

Optional:

```text
Name: www.your-domain.com
Type: CNAME
Value: your-domain.com
```

Confirm DNS:

```bash
dig your-domain.com
```

## 12. Create Kubernetes Base Manifests

Create `deploy/base/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: housing-proposal
```

Create `deploy/base/redis.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: housing-proposal
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: housing-proposal
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
```

Create `deploy/base/backend.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: housing-proposal
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: ghcr.io/YOUR_GITHUB_USER/housing-proposal-backend:latest
          ports:
            - containerPort: 8000
          env:
            - name: DJANGO_DEBUG
              value: "False"
            - name: DJANGO_ALLOWED_HOSTS
              value: "your-domain.com,www.your-domain.com"
            - name: REDIS_URL
              value: "redis://redis:6379/0"
            - name: DJANGO_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: DJANGO_SECRET_KEY
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: OPENAI_API_KEY
          command: ["python"]
          args: ["manage.py", "runserver", "0.0.0.0:8000"]
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: housing-proposal
spec:
  selector:
    app: backend
  ports:
    - port: 8000
      targetPort: 8000
```

Create `deploy/base/frontend.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: housing-proposal
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: ghcr.io/YOUR_GITHUB_USER/housing-proposal-frontend:latest
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: housing-proposal
spec:
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 80
```

Create `deploy/base/celery.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-worker
  namespace: housing-proposal
spec:
  replicas: 1
  selector:
    matchLabels:
      app: celery-worker
  template:
    metadata:
      labels:
        app: celery-worker
    spec:
      containers:
        - name: celery-worker
          image: ghcr.io/YOUR_GITHUB_USER/housing-proposal-backend:latest
          command: ["celery"]
          args: ["-A", "config", "worker", "-l", "info"]
          env:
            - name: DJANGO_DEBUG
              value: "False"
            - name: REDIS_URL
              value: "redis://redis:6379/0"
            - name: DJANGO_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: DJANGO_SECRET_KEY
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: OPENAI_API_KEY
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-beat
  namespace: housing-proposal
spec:
  replicas: 1
  selector:
    matchLabels:
      app: celery-beat
  template:
    metadata:
      labels:
        app: celery-beat
    spec:
      containers:
        - name: celery-beat
          image: ghcr.io/YOUR_GITHUB_USER/housing-proposal-backend:latest
          command: ["celery"]
          args:
            [
              "-A",
              "config",
              "beat",
              "-l",
              "info",
              "--scheduler",
              "django_celery_beat.schedulers:DatabaseScheduler"
            ]
          env:
            - name: DJANGO_DEBUG
              value: "False"
            - name: REDIS_URL
              value: "redis://redis:6379/0"
            - name: DJANGO_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: DJANGO_SECRET_KEY
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: OPENAI_API_KEY
```

Create `deploy/base/ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: housing-proposal
  namespace: housing-proposal
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - your-domain.com
        - www.your-domain.com
      secretName: housing-proposal-tls
  rules:
    - host: your-domain.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 8000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
    - host: www.your-domain.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 8000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
```

Create `deploy/base/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - cluster-issuer.yaml
  - redis.yaml
  - backend.yaml
  - frontend.yaml
  - celery.yaml
  - ingress.yaml
```

Create `deploy/overlays/prod/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base

images:
  - name: ghcr.io/YOUR_GITHUB_USER/housing-proposal-backend
    newTag: latest
  - name: ghcr.io/YOUR_GITHUB_USER/housing-proposal-frontend
    newTag: latest
```

Replace:

```text
YOUR_GITHUB_USER
your-domain.com
www.your-domain.com
your-email@example.com
```

## 13. Create Kubernetes Secrets

On EC2:

```bash
kubectl create namespace housing-proposal --dry-run=client -o yaml | kubectl apply -f -
```

Create secrets:

```bash
kubectl create secret generic app-secrets \
  -n housing-proposal \
  --from-literal=DJANGO_SECRET_KEY='replace-with-a-long-random-secret' \
  --from-literal=OPENAI_API_KEY='replace-with-your-openai-key'
```

If you use SQL Server:

```bash
kubectl create secret generic database-secrets \
  -n housing-proposal \
  --from-literal=DATABASE_HOST='replace-me' \
  --from-literal=DATABASE_NAME='nyc_housing' \
  --from-literal=DATABASE_USER='replace-me' \
  --from-literal=DATABASE_PASSWORD='replace-me'
```

For a GitOps-pure setup, use Sealed Secrets or External Secrets instead of creating secrets manually.

## 14. Configure GitHub Container Registry

GHCR is the simplest registry if your code is on GitHub.

Images:

```text
ghcr.io/YOUR_GITHUB_USER/housing-proposal-backend
ghcr.io/YOUR_GITHUB_USER/housing-proposal-frontend
```

In GitHub repository settings:

```text
Settings -> Actions -> General -> Workflow permissions
```

Enable:

```text
Read and write permissions
```

If using a private repository, make sure the EC2 cluster can pull private images. For a public portfolio project, public GHCR images are simpler.

## 15. Add GitHub Actions CI

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install backend dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run migrations check
        run: python manage.py makemigrations --check --dry-run

      - name: Run backend tests
        run: python manage.py test

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install frontend dependencies
        run: npm ci

      - name: Lint frontend
        run: npm run lint

      - name: Build frontend
        run: npm run build
```

## 16. Add GitHub Actions Image Build and GitOps Update

Create `.github/workflows/release.yml`:

```yaml
name: Build Images and Update Deployment

on:
  push:
    branches:
      - main

permissions:
  contents: write
  packages: write

env:
  REGISTRY: ghcr.io
  BACKEND_IMAGE: ghcr.io/${{ github.repository_owner }}/housing-proposal-backend
  FRONTEND_IMAGE: ghcr.io/${{ github.repository_owner }}/housing-proposal-frontend

jobs:
  build-and-update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set image tag
        run: echo "IMAGE_TAG=${GITHUB_SHA::12}" >> "$GITHUB_ENV"

      - name: Build and push backend
        uses: docker/build-push-action@v6
        with:
          context: ./backend
          file: ./backend/Dockerfile
          push: true
          tags: |
            ${{ env.BACKEND_IMAGE }}:${{ env.IMAGE_TAG }}
            ${{ env.BACKEND_IMAGE }}:latest

      - name: Build and push frontend
        uses: docker/build-push-action@v6
        with:
          context: ./frontend
          file: ./frontend/Dockerfile
          push: true
          tags: |
            ${{ env.FRONTEND_IMAGE }}:${{ env.IMAGE_TAG }}
            ${{ env.FRONTEND_IMAGE }}:latest

      - name: Update Kustomize image tags
        run: |
          cd deploy/overlays/prod
          kustomize edit set image \
            ${{ env.BACKEND_IMAGE }}=${{ env.BACKEND_IMAGE }}:${{ env.IMAGE_TAG }}
          kustomize edit set image \
            ${{ env.FRONTEND_IMAGE }}=${{ env.FRONTEND_IMAGE }}:${{ env.IMAGE_TAG }}

      - name: Commit deployment update
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add deploy/overlays/prod/kustomization.yaml
          git diff --cached --quiet || git commit -m "Deploy ${IMAGE_TAG}"
          git push
```

This workflow pushes images and commits the new image tags back to the repository. ArgoCD then deploys the committed state.

## 17. Add CircleCI Secondary Pipeline

Use CircleCI for checks that complement GitHub Actions. Do not let CircleCI and GitHub Actions both deploy to the cluster.

Create `.circleci/config.yml`:

```yaml
version: 2.1

orbs:
  node: circleci/node@5
  python: circleci/python@2

jobs:
  backend-tests:
    docker:
      - image: cimg/python:3.12
    working_directory: ~/project/backend
    steps:
      - checkout:
          path: ~/project
      - run:
          name: Install dependencies
          command: |
            python -m venv .venv
            . .venv/bin/activate
            pip install --upgrade pip
            pip install -r requirements.txt
      - run:
          name: Run tests
          command: |
            . .venv/bin/activate
            python manage.py test

  frontend-build:
    docker:
      - image: cimg/node:22.0
    working_directory: ~/project/frontend
    steps:
      - checkout:
          path: ~/project
      - run:
          name: Install dependencies
          command: npm ci
      - run:
          name: Lint
          command: npm run lint
      - run:
          name: Build
          command: npm run build

workflows:
  nightly:
    triggers:
      - schedule:
          cron: "0 6 * * *"
          filters:
            branches:
              only:
                - main
    jobs:
      - backend-tests
      - frontend-build
```

This gives you a useful CircleCI story without creating two competing deployment systems.

## 18. Create the ArgoCD Application

Create `deploy/argocd-application.yaml`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: housing-proposal-generator
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/YOUR_GITHUB_USER/YOUR_REPO.git
    targetRevision: main
    path: deploy/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: housing-proposal
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Replace:

```text
YOUR_GITHUB_USER
YOUR_REPO
```

Apply it on EC2:

```bash
kubectl apply -f deploy/argocd-application.yaml
```

Check status:

```bash
kubectl get applications -n argocd
kubectl describe application housing-proposal-generator -n argocd
```

If your repository is private, configure ArgoCD repository credentials before applying the app.

## 19. First Deployment

Commit and push your deployment files:

```bash
git add frontend/Dockerfile frontend/nginx.conf deploy .github/workflows .circleci
git commit -m "Add EC2 GitOps deployment"
git push origin main
```

Watch GitHub Actions:

```text
GitHub -> Actions -> CI
GitHub -> Actions -> Build Images and Update Deployment
```

On EC2:

```bash
kubectl get pods -n housing-proposal
kubectl get ingress -n housing-proposal
kubectl get certificate -n housing-proposal
```

Check app:

```bash
curl -I https://your-domain.com
curl -I https://your-domain.com/api/
```

## 20. Database Initialization

If using SQLite, run migrations inside the backend pod:

```bash
kubectl get pods -n housing-proposal
kubectl exec -n housing-proposal deploy/backend -- python manage.py migrate
kubectl exec -n housing-proposal deploy/backend -- python manage.py seed_nyc_data
```

For a more automated setup, create a Kubernetes Job for migrations:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: migrate
  namespace: housing-proposal
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: ghcr.io/YOUR_GITHUB_USER/housing-proposal-backend:latest
          command: ["python"]
          args: ["manage.py", "migrate"]
          env:
            - name: DJANGO_DEBUG
              value: "False"
            - name: REDIS_URL
              value: "redis://redis:6379/0"
            - name: DJANGO_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: DJANGO_SECRET_KEY
```

For portfolio simplicity, manual migration commands are acceptable for the first deployment. For production, use migration jobs or a controlled release step.

## 21. Deployment Flow After Setup

Normal development flow:

```text
1. Create a feature branch.
2. Open a pull request.
3. GitHub Actions runs backend and frontend checks.
4. Merge to main.
5. GitHub Actions builds and pushes Docker images.
6. GitHub Actions updates deploy/overlays/prod/kustomization.yaml.
7. ArgoCD sees the Git change.
8. ArgoCD syncs the EC2 k3s cluster.
9. New version is live at the public URL.
10. CircleCI runs scheduled secondary checks.
```

## 22. Useful Operations

View app pods:

```bash
kubectl get pods -n housing-proposal
```

View backend logs:

```bash
kubectl logs -n housing-proposal deploy/backend
```

View frontend logs:

```bash
kubectl logs -n housing-proposal deploy/frontend
```

View Celery logs:

```bash
kubectl logs -n housing-proposal deploy/celery-worker
kubectl logs -n housing-proposal deploy/celery-beat
```

Restart backend:

```bash
kubectl rollout restart deployment/backend -n housing-proposal
```

Check ArgoCD app:

```bash
kubectl get application housing-proposal-generator -n argocd
kubectl describe application housing-proposal-generator -n argocd
```

Force ArgoCD refresh:

```bash
kubectl annotate application housing-proposal-generator \
  -n argocd \
  argocd.argoproj.io/refresh=hard \
  --overwrite
```

## 23. Common Problems

### GitHub Actions cannot push to GHCR

Check:

```text
Repository Settings -> Actions -> General -> Workflow permissions
```

Set:

```text
Read and write permissions
```

Also confirm `permissions` in `release.yml`:

```yaml
permissions:
  contents: write
  packages: write
```

### ArgoCD cannot pull manifests

If the repo is private, add repo credentials to ArgoCD.

For public repos, confirm:

```text
repoURL is correct
targetRevision is correct
path is deploy/overlays/prod
```

### Kubernetes cannot pull images

If GHCR images are private, create an image pull secret:

```bash
kubectl create secret docker-registry ghcr-login \
  -n housing-proposal \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USER \
  --docker-password=YOUR_GITHUB_TOKEN \
  --docker-email=YOUR_EMAIL
```

Then add this to deployments:

```yaml
imagePullSecrets:
  - name: ghcr-login
```

### HTTPS certificate is not issued

Check:

```bash
kubectl describe certificate -n housing-proposal
kubectl describe challenge -n housing-proposal
kubectl logs -n cert-manager deploy/cert-manager
```

Common causes:

- DNS does not point to the EC2 Elastic IP.
- Port 80 is blocked.
- Ingress class does not match the ingress controller.
- The app is using Traefik while the issuer expects Nginx, or the reverse.

### Backend returns host or CORS errors

Check `DJANGO_ALLOWED_HOSTS`.

For this app, production should include:

```text
your-domain.com,www.your-domain.com
```

This repository currently hardcodes local CORS origins in `backend/config/settings.py`. For production frontend/API on the same domain, CORS may not be needed for same-origin requests. If your frontend calls a separate API hostname, update settings to read allowed origins from an environment variable.

### Backend data disappears after redeploy

If using SQLite inside the container without a persistent volume, data will be lost. Use a persistent volume or an external database.

## 24. Recommended Improvements Before Public Launch

These are not required for the first deployment, but they make the project look more production-ready:

1. Replace `python manage.py runserver` with Gunicorn.
2. Add a `/api/health/` endpoint for readiness/liveness probes.
3. Move CORS settings to environment variables.
4. Use a persistent database instead of container-local SQLite.
5. Add Kubernetes resource requests and limits.
6. Add readiness and liveness probes.
7. Add a migration Job.
8. Use Sealed Secrets or External Secrets.
9. Add Dependabot or scheduled dependency scans.
10. Add a short architecture diagram to the README.

## 25. Portfolio Talking Points

Once deployed, you can describe the project like this:

```text
I deployed a full-stack Django/React application on AWS EC2 using k3s Kubernetes.
GitHub Actions runs CI, builds Docker images, publishes them to GHCR, and updates
GitOps manifests. ArgoCD continuously reconciles the EC2 cluster from Git, while
CircleCI runs scheduled secondary validation. The public app is served over HTTPS
through Kubernetes ingress and cert-manager.
```

This is a strong portfolio story because it demonstrates application development, containerization, CI, CD, Kubernetes, GitOps, cloud infrastructure, DNS, and HTTPS.
