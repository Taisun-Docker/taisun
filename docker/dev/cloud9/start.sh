#! /bin/bash

# Check for lock file to only run git operations once
if [ -e /lock.file ]
then
  # Lock exists not importing project this is a restart
  echo "Lock exists just starting cloud9"
else
  # Create directory for project
  mkdir -p /usr/src/$PROJECTNAME
  # Clone the url the user passed to this directory
  git clone $GITURL /usr/src/$PROJECTNAME
fi

# Create lock file after first run
touch /lock.file

# Start Cloud9 in the foreground
cd /cloud9
export PATH=/root/.c9/node/bin/:/root/.c9/node_modules/.bin:$PATH
node server.js --listen 0.0.0.0 -p 8000 -w /usr/src/$PROJECTNAME -a :