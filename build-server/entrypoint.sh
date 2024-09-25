#!/bin/bash

# Create the .env file
cat <<EOF > /home/app/.env
CLOUDFLARE_R2_ENDPOINT=$CLOUDFLARE_R2_ENDPOINT
PROJECT_ID=$PROJECT_ID
ACCESS_KEY_ID=$ACCESS_KEY_ID
SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY
BUCKET_NAME=$BUCKET_NAME
EOF

# Clone repo and start server
git clone "$GIT_REPOSITORY_URL" /home/app/output
exec npm start