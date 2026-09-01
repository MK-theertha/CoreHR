data "aws_caller_identity" "current" {}

# ---------------------------------------------------------------------------
# EC2 instance role — pulls from ECR, reads secrets from SSM, writes to the
# uploads bucket, ships logs/metrics to CloudWatch. No AWS access keys.
# ---------------------------------------------------------------------------

resource "aws_iam_role" "ec2" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = { Name = "${var.project_name}-ec2-role" }
}

# Session Manager access in place of SSH key pairs / an open port 22.
resource "aws_iam_role_policy_attachment" "ec2_ssm_core" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# CloudWatch agent: CPU/memory/disk metrics (app logs ship separately via the
# Docker awslogs driver, configured in ec2.tf's user data).
resource "aws_iam_role_policy_attachment" "ec2_cloudwatch_agent" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy" "ec2_ecr_pull" {
  name = "${var.project_name}-ec2-ecr-pull"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "EcrAuth"
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Sid    = "EcrPull"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ]
        Resource = aws_ecr_repository.backend.arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "ec2_s3_uploads" {
  name = "${var.project_name}-ec2-s3-uploads"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ListUploadsBucket"
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.uploads.arn
      },
      {
        Sid    = "ReadWriteUploadObjects"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
        ]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      }
    ]
  })
}

# Scoped to just this project's parameters — not every SecureString in the account.
resource "aws_iam_role_policy" "ec2_ssm_parameters" {
  name = "${var.project_name}-ec2-ssm-parameters"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadAppSecrets"
        Effect   = "Allow"
        Action   = "ssm:GetParameter"
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/*"
      },
      {
        Sid    = "DecryptSecureStringParameters"
        Effect = "Allow"
        Action = "kms:Decrypt"
        # No customer-managed key exists to scope this to (SecureString
        # params use the AWS-managed aws/ssm key); ViaService keeps it
        # limited to decrypt calls made on this role's behalf, by SSM only.
        Resource = "*"
        Condition = {
          StringEquals = { "kms:ViaService" = "ssm.${var.aws_region}.amazonaws.com" }
        }
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2.name
}

# ---------------------------------------------------------------------------
# GitHub Actions OIDC — CI assumes a role via short-lived federated tokens,
# no long-lived AWS access keys ever sit in repo secrets. Only created once
# var.github_repository is set.
# ---------------------------------------------------------------------------

resource "aws_iam_openid_connect_provider" "github" {
  count = var.github_repository != "" ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  # SHA1 fingerprint of the root CA at the top of token.actions.githubusercontent.com's
  # current TLS chain (AWS no longer actually validates this value against
  # the live handshake for well-known public CAs, but the API still
  # requires one). Regenerate if GitHub ever rotates CAs and IdP creation
  # starts failing:
  #   echo | openssl s_client -servername token.actions.githubusercontent.com \
  #     -showcerts -connect token.actions.githubusercontent.com:443 2>/dev/null \
  #     | awk '/BEGIN CERT/,/END CERT/{print > ("cert" n ".pem")} /END CERT/{n++}'
  #   openssl x509 -in cert2.pem -noout -fingerprint -sha1   # last cert in the chain
  thumbprint_list = ["ab9d0263244dd0326eb67015705a667e79cfe998"]

  tags = { Name = "${var.project_name}-github-oidc" }
}

resource "aws_iam_role" "github_actions" {
  count = var.github_repository != "" ? 1 : 0
  name  = "${var.project_name}-github-actions-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github[0].arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          # Scoped to this repo, any branch/tag/PR. Tighten to
          # "repo:${var.github_repository}:ref:refs/heads/main" to restrict
          # deploys to pushes on main only.
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:*"
        }
      }
    }]
  })

  tags = { Name = "${var.project_name}-github-actions-deploy" }
}

resource "aws_iam_role_policy" "github_actions_ecr" {
  count = var.github_repository != "" ? 1 : 0
  name  = "${var.project_name}-github-actions-ecr"
  role  = aws_iam_role.github_actions[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "EcrAuth"
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Sid    = "EcrPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
        ]
        Resource = aws_ecr_repository.backend.arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "github_actions_deploy" {
  count = var.github_repository != "" ? 1 : 0
  name  = "${var.project_name}-github-actions-deploy"
  role  = aws_iam_role.github_actions[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "SendRedeployCommand"
        Effect   = "Allow"
        Action   = "ssm:SendCommand"
        Resource = "arn:aws:ssm:${var.aws_region}::document/AWS-RunShellScript"
      },
      {
        Sid      = "SendRedeployCommandToAppServersOnly"
        Effect   = "Allow"
        Action   = "ssm:SendCommand"
        Resource = "arn:aws:ec2:${var.aws_region}:${data.aws_caller_identity.current.account_id}:instance/*"
        Condition = {
          StringEquals = { "ssm:resourceTag/Name" = "${var.project_name}-app" }
        }
      },
      {
        Sid      = "ReadRedeployCommandResult"
        Effect   = "Allow"
        Action   = "ssm:GetCommandInvocation"
        Resource = "*"
      },
      {
        Sid    = "DeployFrontend"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          aws_s3_bucket.frontend.arn,
          "${aws_s3_bucket.frontend.arn}/*",
        ]
      },
      {
        Sid      = "InvalidateCloudFront"
        Effect   = "Allow"
        Action   = "cloudfront:CreateInvalidation"
        Resource = aws_cloudfront_distribution.frontend.arn
      }
    ]
  })
}
