FROM lsiobase/alpine:3.9 as buildstage

# Build args
ARG INPUT
ARG PASS

RUN \
  echo "**** install packages ****" && \
  apk add --no-cache --upgrade \
    gnupg && \
  echo "**** encode text blob ****" && \
  echo "${INPUT}" > /input && \
  echo "${PASS}" | gpg \
    --output /enc.gpg \
    --batch --yes \
    --pinentry-mode loopback \
    --passphrase-fd 0 -c /input

# Runtime Stage
FROM lsiobase/alpine:3.9

RUN \
  echo "**** install packages ****" && \
  apk add --no-cache --upgrade \
    gnupg

# Add local files
COPY root/ /
COPY --from=buildstage /enc.gpg /enc.gpg

ENTRYPOINT ["/bin/bash"]
CMD ["/gimmie.sh"]