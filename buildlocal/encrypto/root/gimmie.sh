#!/usr/bin/with-contenv bash

# Output the file contents to stdout
echo ${PASS} | \
gpg -q --output - \
--batch --yes \
--pinentry-mode loopback \
--passphrase-fd 0 -d /enc.gpg
