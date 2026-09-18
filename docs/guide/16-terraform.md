[← Back to Documentation index](./README.md) · [← CI/CD (GitHub Actions)](./15-cicd.md)

# Terraform / AWS Production Infrastructure

`infra/terraform/` — a complete, `terraform validate`-clean module for deploying
`fastapi-backend` to AWS. **Never applied** — this is infrastructure-as-*code*
only; no AWS account has actually had these resources created in it. Full usage
notes live in `infra/terraform/README.md`; this page is the architectural
summary.

## Topology

```
Internet
   │
   ▼
CloudFront ──── S3 (frontend static assets, private, OAC-only access)
   │
   │  (direct API calls, not through CloudFront)
   ▼
ALB (public subnets)  ──HTTP/HTTPS (443 only if a domain is configured)
   │
   ▼
Auto Scaling Group (private app subnets) ── EC2 running the Docker image from ECR
   │                    │
   ▼                    ▼
RDS PostgreSQL      ElastiCache Redis        S3 (uploads, private)
(private db subnets, (private db subnets,
 never public)        TLS + at-rest encryption)
```

## Per-file summary

| File | Provisions |
|---|---|
| `providers.tf` | AWS provider (`var.aws_region`) + a `us-east-1`-aliased provider used only for the CloudFront ACM cert (CloudFront requires certs from `us-east-1` regardless of the stack's actual region). |
| `variables.tf` | Every knob — region, CIDRs, instance sizes, `domain_name`/`route53_zone_id` (both optional — HTTP-only if unset), `github_repository` (gates whether the OIDC role is created at all), `alarm_email`. |
| `vpc.tf` | VPC across 2 AZs; public / private-app / private-db subnet tiers; **one** NAT Gateway (cost-optimized, not one per AZ); a free S3 gateway VPC endpoint; the DB subnet tier has **no route to the internet at all**. |
| `security-groups.tf` | ALB: 80/443 from anywhere. EC2: app port from ALB only. RDS: 5432 from EC2 only. Redis: 6379 from EC2 only. |
| `iam.tf` | EC2 instance role (SSM Session Manager access instead of SSH keys; ECR pull scoped to this one repo; S3 access scoped to the uploads bucket only; SSM `GetParameter` scoped to this project's parameter path). GitHub Actions OIDC provider + role (created only if `github_repository` is set) — federated trust, no long-lived AWS keys, scoped to ECR push + SSM `SendCommand` (tag-scoped to instances named `${project_name}-app`) + frontend S3 sync + CloudFront invalidation. |
| `ecr.tf` | One repository, `IMMUTABLE` tags, scan-on-push, lifecycle policy (expire untagged after 7 days, keep last 20 tagged). |
| `ec2.tf` | SNS alarm topic; **Terraform-generated** JWT secrets + DB password, stored as SSM `SecureString` parameters (never in a docker image, git repo, or plaintext user data); a CloudWatch log group; the launch template + Auto Scaling Group (fixed size, IMDSv2-only, encrypted EBS); CPU/memory/disk CloudWatch alarms. |
| `alb.tf` | The ALB, target group (health check `/health`), conditional ACM cert + HTTPS listener (only if `domain_name` set — otherwise HTTP-only), 4xx/5xx/unhealthy-host alarms. |
| `rds.tf` | Single-AZ `db.t3.micro` Postgres, `gp3` storage, encrypted, private, `skip_final_snapshot`/`deletion_protection` deliberately off (so `terraform destroy` tears it down cleanly between sessions — flip both for real production use), connection-count and free-storage alarms. |
| `redis.tf` | `aws_elasticache_replication_group` (not the plain `_cluster` resource — needed for at-rest/in-transit encryption even at one node), single node, TLS required (app must connect with `rediss://`), CPU/memory alarms. |
| `s3.tf` | Frontend bucket (versioned, encrypted, all public-access-block settings on — access is via CloudFront's OAC only) and uploads bucket (private, versioned, encrypted, CORS rule scoped to `client_url`, lifecycle rule expiring old object versions). |
| `cloudfront.tf` | Distribution fronting the frontend S3 bucket via Origin Access Control; SPA fallback (403/404 → `index.html`, 200); conditional custom domain + `us-east-1` ACM cert. |
| `outputs.tf` | ALB DNS name, API/frontend URLs, ECR repo URL, RDS/Redis endpoints (marked `sensitive`), the GitHub Actions role ARN, the ASG name. |

Note: the EC2 instance role does **not** currently include `ses:SendEmail`/
`ses:SendRawEmail` — see [File Storage & Email](./08-file-storage-and-email.md)
for what adding SES email delivery to a real deployment would still need.

## What running this for real would need

1. Bootstrap: `terraform apply -target=aws_ecr_repository.backend`, then manually
   `docker build`/`push` at least one `:latest` image (the ASG's first instance
   pulls that tag on boot — nothing exists yet on a truly fresh account).
2. `terraform.tfvars` from `terraform.tfvars.example` — region, optionally a real
   domain + Route53 zone, optionally a GitHub repo for OIDC, an alarm email.
3. `terraform apply` for everything else.
4. This is real, billable infrastructure the moment you apply it (RDS, the NAT
   Gateway, ElastiCache, and the ALB all charge per hour regardless of traffic) —
   see the cost note in `infra/terraform/README.md`.

---

[← CI/CD (GitHub Actions)](./15-cicd.md) · Next: [Environment Variables →](./17-environment-variables.md)
