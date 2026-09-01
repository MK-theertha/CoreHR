output "vpc_id" {
  value = aws_vpc.main.id
}

output "alb_dns_name" {
  description = "Point client_url / DNS at this if domain_name wasn't set (HTTP only)."
  value       = aws_lb.main.dns_name
}

output "api_url" {
  description = "The API's public base URL, whichever form is active."
  value       = var.domain_name != "" ? "https://api.${var.domain_name}" : "http://${aws_lb.main.dns_name}"
}

output "frontend_url" {
  value = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "Needed by the CI step that invalidates the cache after a frontend deploy."
  value       = aws_cloudfront_distribution.frontend.id
}

output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "s3_frontend_bucket" {
  value = aws_s3_bucket.frontend.id
}

output "s3_uploads_bucket" {
  value = aws_s3_bucket.uploads.id
}

output "rds_endpoint" {
  value     = aws_db_instance.postgres.endpoint
  sensitive = true
}

output "redis_primary_endpoint" {
  value     = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive = true
}

output "github_actions_role_arn" {
  description = "Put this in the GitHub Actions workflow's role-to-assume for OIDC. Empty until github_repository is set."
  value       = var.github_repository != "" ? aws_iam_role.github_actions[0].arn : null
}

output "ec2_autoscaling_group_name" {
  value = aws_autoscaling_group.app.name
}
