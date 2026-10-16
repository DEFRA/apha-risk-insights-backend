#!/bin/bash

# S3 buckets
aws s3 mb s3://apha-risk-insights-local-uploads

# SQS queues
#aws sqs create-queue --queue-name my-queue
