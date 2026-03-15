#!/usr/bin/env bash
# Sync client/public media lên AWS S3.
# Yêu cầu: cài AWS CLI, chạy aws configure.
# Set: export S3_MEDIA_BUCKET=astro-edu-media
# Chạy từ thư mục gốc project: ./scripts/sync-media-to-s3.sh

set -e
BUCKET="${S3_MEDIA_BUCKET:-astro-edu-media}"
PUBLIC="client/public"

echo "Bucket: $BUCKET"

for dir in course-media models textures images; do
  if [ -d "$PUBLIC/$dir" ]; then
    echo "Syncing $PUBLIC/$dir -> s3://$BUCKET/$dir ..."
    aws s3 sync "$PUBLIC/$dir" "s3://$BUCKET/$dir" --acl public-read
  else
    echo "Skip (not found): $PUBLIC/$dir"
  fi
done

echo "Done. Base URL: https://$BUCKET.s3.${AWS_REGION:-ap-southeast-1}.amazonaws.com"
