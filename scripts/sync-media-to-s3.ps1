# Sync client/public media to AWS S3.
# Require: AWS CLI, aws configure.
# Set bucket: $env:S3_MEDIA_BUCKET = "astro-edu-media"
# Run from repo root: .\scripts\sync-media-to-s3.ps1

$bucket = $env:S3_MEDIA_BUCKET
if (-not $bucket) {
    $bucket = "astro-edu-media"
    Write-Host "Using default bucket: $bucket (set S3_MEDIA_BUCKET to change)"
}

$public = "client/public"
$folders = @("course-media", "models", "textures", "images")

foreach ($folder in $folders) {
    $path = Join-Path $public $folder
    if (Test-Path $path) {
        Write-Host "Syncing $path -> s3://$bucket/$folder ..."
        & aws s3 sync $path "s3://$bucket/$folder" --acl public-read
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Sync failed: $folder"
            exit 1
        }
    } else {
        Write-Host "Skip (not found): $path"
    }
}

$region = $env:AWS_REGION
if (-not $region) { $region = "ap-southeast-1" }
Write-Host "Done. Base URL: https://$bucket.s3.$region.amazonaws.com"