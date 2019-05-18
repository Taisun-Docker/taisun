#Dockerfile for Taisun base image
#2019
#Use LinuxServer Base Image
FROM lsiobase/alpine:3.9
MAINTAINER Ryan Kuba <ryankuba@gmail.com>
# Set Label info
ARG BUILD_DATE
LABEL build_version="Build-date:- ${BUILD_DATE}"

RUN \
 echo "**** install build packages ****" && \
 apk add --no-cache --virtual=build-dependencies \
	curl \
	gcc \
	libffi-dev \
	make \
	musl-dev \
	nodejs-npm \
	openssl-dev \
	py-pip \
    python-dev && \
 echo "**** install runtime packages ****" && \
 apk add --no-cache \
	nodejs \
	docker \
	libcap \
	tcl \
	expect \
	python2 \
	git \
	sudo && \
 pip install --upgrade pip && \
 npm i npm@latest -g && \
 pip install docker-compose && \
 echo "**** install Taisun ****" && \
 mkdir -p \
	/usr/src/Taisun && \
 git clone https://github.com/Taisun-Docker/taisun.git /usr/src/Taisun && \
 echo "**** install node modules ****" && \
 npm install --prefix /usr/src/Taisun && \
 npm install -g nodemon && \
 echo "**** Install Cloud9 ****" && \
 curl https://s3-us-west-2.amazonaws.com/taisun-pubfiles/c9-alpine-3.8.tar.gz | tar xz -C / && \
 mkdir /applogs && \
 chown -R abc:abc \
	/usr/src/Taisun \
	/c9sdk \
	/root/.c9 \
	/applogs && \
 mv /usr/bin/git /usr/bin/gitbin && \
 echo "**** cleanup ****" && \
 apk del --purge \
	build-dependencies && \
 rm -rf \
	/tmp/*

# copy local files
COPY root-dev/ /
COPY ./git /usr/bin/git

#App runs on port 3000 development interface on port 8000
EXPOSE 3000
EXPOSE 8000
