terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Local state by default so this is usable without any prior setup. For a
  # real team, switch to a remote backend before the first apply, e.g.:
  #
  # backend "s3" {
  #   bucket         = "corehr-terraform-state"
  #   key            = "corehr/terraform.tfstate"
  #   region         = "ap-south-1"
  #   dynamodb_table = "corehr-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# CloudFront only accepts ACM certificates issued in us-east-1, regardless of
# which region the rest of the stack runs in — this alias exists solely for
# that certificate (see cloudfront.tf).
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
