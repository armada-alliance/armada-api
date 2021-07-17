# Pass what you want to output as variables
# VERSION=1.1.1 AUTHOR=keyflight COMMIT_HASH=23145 RELEASE_DATE=$(date -u +"%FT%T.000Z") ./scripts/output-build-info.sh
#
echo "{\"version\": \"$VERSION\",\"author\": \"$AUTHOR\",\"commit_hash\": \"$COMMIT_HASH\",\"release_date\": \"$RELEASE_DATE\"}" > build-info.json