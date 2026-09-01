#!/bin/bash
# Runs once at instance boot (cloud-init). Installs Docker + the CloudWatch
# agent, writes a reusable deploy script, then runs it once to start the app.
# Later deploys (from CI, via SSM Send-Command) just re-invoke the deploy
# script with a new image tag — they don't re-run this whole file.
set -euxo pipefail

dnf install -y docker amazon-cloudwatch-agent
systemctl enable --now docker

# --- CloudWatch agent: CPU is free via basic EC2 metrics, but memory and
# disk usage require the agent. ---
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<'CWCONFIG'
{
  "metrics": {
    "namespace": "CWAgent",
    "append_dimensions": { "AutoScalingGroupName": "$${aws:AutoScalingGroupName}" },
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"] },
      "disk": {
        "measurement": ["used_percent"],
        "resources": ["/"]
      }
    }
  }
}
CWCONFIG
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json

# --- Reusable deploy script: pull the given (or default) image tag, restart
# the container. `sudo corehr-deploy.sh <tag>` is what CI runs over SSM. ---
cat > /usr/local/bin/corehr-deploy.sh <<'DEPLOY'
#!/bin/bash
set -euxo pipefail

IMAGE_TAG="$${1:-${image_tag}}"
REGION="${aws_region}"
ECR_REPO="${ecr_repository_url}"
CONTAINER_NAME="${project_name}-app"

DB_PASSWORD=$(aws ssm get-parameter --name "${ssm_db_password_name}" --with-decryption \
  --region "$REGION" --query 'Parameter.Value' --output text)
JWT_ACCESS_SECRET=$(aws ssm get-parameter --name "${ssm_jwt_access_secret_name}" --with-decryption \
  --region "$REGION" --query 'Parameter.Value' --output text)
JWT_REFRESH_SECRET=$(aws ssm get-parameter --name "${ssm_jwt_refresh_secret_name}" --with-decryption \
  --region "$REGION" --query 'Parameter.Value' --output text)

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$ECR_REPO"

docker pull "$ECR_REPO:$IMAGE_TAG"

docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p ${app_port}:${app_port} \
  --log-driver awslogs \
  --log-opt awslogs-region="$REGION" \
  --log-opt awslogs-group="${log_group_name}" \
  --log-opt awslogs-create-group=true \
  --log-opt awslogs-stream="$(TOKEN=$(curl -sX PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 21600'); curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)" \
  -e APP_ENV="${environment}" \
  -e PORT="${app_port}" \
  -e DATABASE_URL="postgresql://${db_username}:$${DB_PASSWORD}@${db_host}:${db_port}/${db_name}" \
  -e REDIS_URL="rediss://${redis_host}:${redis_port}/0" \
  -e JWT_ACCESS_SECRET="$${JWT_ACCESS_SECRET}" \
  -e JWT_REFRESH_SECRET="$${JWT_REFRESH_SECRET}" \
  -e JWT_ACCESS_TTL="${jwt_access_ttl}" \
  -e JWT_REFRESH_TTL="${jwt_refresh_ttl}" \
  -e CLIENT_URL="${client_url}" \
  -e S3_UPLOADS_BUCKET="${uploads_bucket}" \
  -e AWS_REGION="$REGION" \
  "$ECR_REPO:$IMAGE_TAG"

# Run the (idempotent) production migration, never a dev-only command.
docker exec "$CONTAINER_NAME" alembic upgrade head
DEPLOY
chmod +x /usr/local/bin/corehr-deploy.sh

/usr/local/bin/corehr-deploy.sh "${image_tag}"
