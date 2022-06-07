#!/bin/bash
set -e

# check mandatory environment variables
MANDATORY_VARS="SOURCE_CONTAINER SOURCE_ACCOUNT_NAME SOURCE_ACCOUNT_KEY DESTINATION_CONTAINER DESTINATION_ACCOUNT_NAME DESTINATION_ACCOUNT_KEY"
for VAR in $MANDATORY_VARS; do
  if [[ -z "${!VAR}" ]]; then
    echo "${VAR} environment variable is empty"
    exit 1
  fi
done


echo "starting restore container $SOURCE_CONTAINER into $DESTINATION_CONTAINER"

# copy container
az storage copy -r \
  --source-account-name "$SOURCE_ACCOUNT_NAME" \
  --source-account-key "$SOURCE_ACCOUNT_KEY" \
  --source-container "$SOURCE_CONTAINER" \
  --account-name "$DESTINATION_ACCOUNT_NAME" \
  --account-key "$DESTINATION_ACCOUNT_KEY" \
  --destination-container "$DESTINATION_CONTAINER"

# get original permission
PUBLIC_ACCESS=\`az storage container show-permission \
  --account-name "$SOURCE_ACCOUNT_NAME" \
  --account-key "$SOURCE_ACCOUNT_KEY" \
  --name "$SOURCE_CONTAINER" | jq -r ".publicAccess"\`

# set original permission
az storage container set-permission \
  --name "$DESTINATION_CONTAINER" \
  --account-name "$DESTINATION_ACCOUNT_NAME" \
  --account-key "$DESTINATION_ACCOUNT_KEY" \
  --public-access "$PUBLIC_ACCESS"
