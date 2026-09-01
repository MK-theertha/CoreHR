# CoreHR — Terraform

Provisions the production AWS stack: VPC (2 AZs, public/private-app/private-db
subnets, single NAT Gateway), ALB, an Auto Scaling Group of EC2 instances
running the FastAPI container from ECR, RDS PostgreSQL, ElastiCache Redis,
S3 (frontend + uploads), CloudFront, IAM roles (including GitHub Actions
OIDC), and CloudWatch alarms.

This code has been reviewed carefully but **not run** — no `terraform apply`
has ever been executed against it, and there is no state file. Treat the
first `plan` as the real first test.

## Before you run anything

1. **Push a bootstrap image to ECR first.** The Auto Scaling Group's user
   data pulls `image_tag` (default `latest`) on boot; if nothing with that
   tag exists yet, the first instance fails to start and the ALB health
   check never turns healthy. Order of operations:
   ```
   terraform apply -target=aws_ecr_repository.backend
   # build + push a "latest"-tagged image to the ECR URL it just created
   terraform apply
   ```
2. Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in at
   least `aws_region`. Everything else has a workable default.
3. `domain_name` / `route53_zone_id` are optional. Leave them empty and the
   stack still works end-to-end over the ALB's DNS name and CloudFront's
   default domain — just without HTTPS on the ALB or a custom domain. Fill
   them in once you own a domain and its Route53 zone.

## Cost

Sized for the cheapest free-tier-eligible instance types and a single NAT
Gateway (not one per AZ), but this is still billable infrastructure — RDS,
the NAT Gateway, ElastiCache, and the ALB all charge per hour regardless of
traffic. `skip_final_snapshot` and `deletion_protection` are deliberately
off on the RDS instance specifically so `terraform destroy` can tear
everything down cleanly between study sessions. Don't leave this running
unattended.

## Usage

```
terraform init
terraform plan
terraform apply
terraform destroy   # when you're done for the day
```

## What's deliberately out of scope here

- **Remote state.** Defaults to local state (`providers.tf` has a commented
  `backend "s3"` block ready to uncomment once you want one).
- **Multi-AZ RDS / Redis failover.** Both are single-node for cost; flipping
  `multi_az`/`automatic_failover_enabled` to `true` is a one-line change.
- **CI actually invoking this.** `.github/workflows/` isn't wired to run
  `terraform apply` — that's a deliberate choice (auto-applying
  infrastructure changes on push is a bigger blast-radius decision than a
  code change and shouldn't happen silently). CI's job is building/pushing
  the app image and redeploying it to the *existing* EC2 instances via SSM
  (see `outputs.github_actions_role_arn`), not touching the infrastructure
  itself.
