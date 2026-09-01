variable "project_name" {
  description = "Short name used to prefix and tag all resources."
  type        = string
  default     = "corehr"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "Primary AWS region for all resources except the CloudFront ACM certificate."
  type        = string
  default     = "ap-south-1"
}

# --- Networking ---

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the two public subnets (ALB, NAT Gateway)."
  type        = list(string)
  default     = ["10.20.0.0/24", "10.20.1.0/24"]
}

variable "private_app_subnet_cidrs" {
  description = "CIDR blocks for the two private application subnets (EC2)."
  type        = list(string)
  default     = ["10.20.10.0/24", "10.20.11.0/24"]
}

variable "private_db_subnet_cidrs" {
  description = "CIDR blocks for the two private data subnets (RDS, ElastiCache)."
  type        = list(string)
  default     = ["10.20.20.0/24", "10.20.21.0/24"]
}

# --- Application ---

variable "app_port" {
  description = "Port the FastAPI container listens on (must match the Dockerfile's EXPOSE/CMD port)."
  type        = number
  default     = 8000
}

variable "health_check_path" {
  description = "Path the ALB target group health check requests."
  type        = string
  default     = "/health"
}

variable "image_tag" {
  description = "Tag of the backend image in ECR that EC2 pulls and runs. At least one image with this tag must exist in ECR before the first apply — push one manually to bootstrap, then let CI push versioned tags after that."
  type        = string
  default     = "latest"
}

variable "jwt_access_ttl" {
  type    = string
  default = "15m"
}

variable "jwt_refresh_ttl" {
  type    = string
  default = "7d"
}

variable "client_url" {
  description = "Comma-separated list of allowed CORS origins (the frontend's CloudFront/custom domain URL). Set once the CloudFront distribution's domain is known."
  type        = string
  default     = ""
}

# --- EC2 ---

variable "ec2_instance_type" {
  description = "Free-tier-eligible by default; bump for real production load."
  type        = string
  default     = "t3.micro"
}

variable "asg_desired_capacity" {
  type    = number
  default = 1
}

# --- RDS ---

variable "db_name" {
  type    = string
  default = "corehr"
}

variable "db_username" {
  type    = string
  default = "corehr_app"
}

variable "rds_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "Storage in GB."
  type        = number
  default     = 20
}

variable "rds_engine_version" {
  type    = string
  default = "16.4"
}

variable "rds_backup_retention_days" {
  type    = number
  default = 1
}

# --- ElastiCache ---

variable "redis_node_type" {
  type    = string
  default = "cache.t3.micro"
}

variable "redis_engine_version" {
  type    = string
  default = "7.1"
}

# --- S3 ---

variable "uploads_noncurrent_version_expire_days" {
  description = "Days after which a noncurrent (overwritten/deleted) version of an uploaded file is permanently removed."
  type        = number
  default     = 90
}

# --- Domain / HTTPS (optional) ---

variable "domain_name" {
  description = "Root domain for the app (e.g. corehr.example.com). Leave empty to skip Route53/ACM/CloudFront custom-domain wiring and serve the ALB over HTTP only."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Existing Route53 hosted zone ID for domain_name. Required if domain_name is set."
  type        = string
  default     = ""
}

# --- GitHub Actions OIDC ---

variable "github_repository" {
  description = "GitHub repo allowed to assume the deploy role via OIDC, as \"owner/repo\". Required for the OIDC trust policy to mean anything — leave empty and the role trusts nobody."
  type        = string
  default     = ""
}

# --- Monitoring ---

variable "alarm_email" {
  description = "Email address to subscribe to the CloudWatch alarm SNS topic. Leave empty to create the topic with no subscribers."
  type        = string
  default     = ""
}
