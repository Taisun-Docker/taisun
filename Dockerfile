FROM lsiobase/alpine:3.11 as buildstage

ARG COMPOSE_VERSION=1.24.1
ARG PYINSTALLER_VERSION=v3.6

RUN \
 echo "**** install build deps ****" && \
 apk add --no-cache \
	curl \
	g++ \
	gcc \
	git \
	libc-dev \
	libffi-dev \
	make \
	musl-dev \
	openssl-dev \
	python3 \
	python3-dev \
	zlib-dev

RUN \
 echo "**** build pyinstaller ****" && \
 git clone --depth 1 \
	--single-branch \
	--branch ${PYINSTALLER_VERSION} \
	https://github.com/pyinstaller/pyinstaller.git \
	/tmp/pyinstaller && \
 cd /tmp/pyinstaller/bootloader && \
 CFLAGS="-Wno-stringop-overflow -Wno-error=stringop-truncation" python3 \
	./waf configure --no-lsb all && \
 pip3 install ..
 

RUN \
 echo "**** build compose ****" && \
 cd /tmp && \
 git clone https://github.com/docker/compose.git && \
 cd compose && \
 git checkout ${COMPOSE_VERSION} && \
 pip3 install \
	-r requirements.txt && \
 ./script/build/write-git-sha > compose/GITSHA && \
 pyinstaller docker-compose.spec && \
 mv dist/docker-compose /


# runtime stage
FROM lsiobase/cloud9:alpine
MAINTAINER Ryan Kuba <ryankuba@gmail.com>
# Set Label info
ARG BUILD_DATE
LABEL build_version="Build-date:- ${BUILD_DATE}"

RUN \
 echo "**** install build packages ****" && \
 apk add --no-cache --virtual=build-dependencies \
	curl \
	nodejs-npm && \
 echo "**** install runtime packages ****" && \
 apk add --no-cache \
	docker-cli \
	expect \
	git \
	libcap \
	nodejs \
	sudo \
	tcl && \
 echo "**** install Taisun ****" && \
 git clone https://github.com/Taisun-Docker/taisun.git /code && \
 echo "**** install node modules ****" && \
 npm install --prefix /code && \
 npm install -g nodemon && \
 mv /usr/bin/git /usr/bin/gitbin && \
 echo "**** cleanup ****" && \
 addgroup -g 100 docker && \
 apk del --purge \
	build-dependencies && \
 rm -rf \
	/tmp/*

# copy local files
COPY root/ /
COPY ./git /usr/bin/git
COPY --from=buildstage /docker-compose /usr/local/bin/

#App runs on port 3000 development interface on port 8000
EXPOSE 3000
EXPOSE 8000
