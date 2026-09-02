#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-$(gcloud config get-value run/region 2>/dev/null || true)}"
REPOSITORY="${REPOSITORY:-cloud-run}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-ecom-accounting-frontend}"
BACKEND_SERVICE="${BACKEND_SERVICE:-ecom-accounting-backend}"
DEFAULT_ENTITY_ID="${DEFAULT_ENTITY_ID:-tw-entity-001}"
ERP_PUBLIC_FRONTEND_URL="${ERP_PUBLIC_FRONTEND_URL:-https://erp.corely.cc}"
ERP_PUBLIC_API_URL="${ERP_PUBLIC_API_URL:-https://api.erp.corely.cc}"
FRONTEND_API_URL="${FRONTEND_API_URL:-${ERP_PUBLIC_API_URL%/}/api/v1}"
BACKEND_CORS_ORIGIN="${BACKEND_CORS_ORIGIN:-${ERP_PUBLIC_FRONTEND_URL%/}}"
BACKEND_ENV_VARS_FILE="${BACKEND_ENV_VARS_FILE:-}"

if [[ -z "${PROJECT_ID}" || -z "${REGION}" ]]; then
  echo "PROJECT_ID or REGION is missing. Set them explicitly or configure gcloud first."
  exit 1
fi

if [[ -z "${FRONTEND_API_URL}" ]]; then
  echo "FRONTEND_API_URL is required, for example: https://api.erp.corely.cc/api/v1"
  exit 1
fi

if [[ -z "${BACKEND_CORS_ORIGIN}" ]]; then
  echo "BACKEND_CORS_ORIGIN is required, for example: https://erp.corely.cc"
  exit 1
fi

IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}"
FRONTEND_IMAGE="${IMAGE_BASE}/${FRONTEND_SERVICE}"
BACKEND_IMAGE="${IMAGE_BASE}/${BACKEND_SERVICE}"

echo "Ensuring Artifact Registry repository exists..."
gcloud artifacts repositories describe "${REPOSITORY}" \
  --location="${REGION}" >/dev/null 2>&1 || \
gcloud artifacts repositories create "${REPOSITORY}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Cloud Run containers for ecom-accounting-system"

echo "Building frontend image..."
gcloud builds submit frontend \
  --project="${PROJECT_ID}" \
  --substitutions="_VITE_API_URL=${FRONTEND_API_URL},_VITE_DEFAULT_ENTITY_ID=${DEFAULT_ENTITY_ID}" \
  --config=- <<EOF
steps:
  - name: gcr.io/cloud-builders/docker
    args:
      - build
      - -t
      - ${FRONTEND_IMAGE}
      - --build-arg
      - VITE_API_URL=\${_VITE_API_URL}
      - --build-arg
      - VITE_DEFAULT_ENTITY_ID=\${_VITE_DEFAULT_ENTITY_ID}
      - .
images:
  - ${FRONTEND_IMAGE}
EOF

echo "Deploying frontend service..."
gcloud run deploy "${FRONTEND_SERVICE}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --image="${FRONTEND_IMAGE}" \
  --allow-unauthenticated \
  --port=8080 \
  --set-env-vars="API_URL=${FRONTEND_API_URL},WS_URL=${FRONTEND_API_URL%/api/v1},DEFAULT_ENTITY_ID=${DEFAULT_ENTITY_ID}"

echo "Building backend image..."
gcloud builds submit backend \
  --project="${PROJECT_ID}" \
  --tag="${BACKEND_IMAGE}"

echo "Deploying backend service..."
backend_deploy_args=(
  run deploy "${BACKEND_SERVICE}"
  --project="${PROJECT_ID}"
  --region="${REGION}"
  --image="${BACKEND_IMAGE}"
  --allow-unauthenticated
  --port=3000
)

if [[ -n "${BACKEND_ENV_VARS_FILE}" ]]; then
  backend_deploy_args+=(
    --env-vars-file="${BACKEND_ENV_VARS_FILE}"
    --update-env-vars="^@^CORS_ORIGIN=${BACKEND_CORS_ORIGIN}@APP_BASE_URL=${ERP_PUBLIC_FRONTEND_URL%/}@FRONTEND_PUBLIC_URL=${ERP_PUBLIC_FRONTEND_URL%/}@FRONTEND_URL=${ERP_PUBLIC_FRONTEND_URL%/}@PAYMENT_LINK_BASE_URL=${ERP_PUBLIC_FRONTEND_URL%/}"
  )
else
  backend_deploy_args+=(--update-env-vars="^@^CORS_ORIGIN=${BACKEND_CORS_ORIGIN}@APP_BASE_URL=${ERP_PUBLIC_FRONTEND_URL%/}@FRONTEND_PUBLIC_URL=${ERP_PUBLIC_FRONTEND_URL%/}@FRONTEND_URL=${ERP_PUBLIC_FRONTEND_URL%/}@PAYMENT_LINK_BASE_URL=${ERP_PUBLIC_FRONTEND_URL%/}")
fi

gcloud "${backend_deploy_args[@]}"

echo
echo "Deployment complete."
echo "Frontend image: ${FRONTEND_IMAGE}"
echo "Backend image:  ${BACKEND_IMAGE}"
