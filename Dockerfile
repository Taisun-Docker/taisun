#Dockerfile for Taisun base image
#2017
#Use the node base image
FROM node:8.11

MAINTAINER Ryan Kuba <ryankuba@gmail.com>

#Install Dependencies
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y git supervisor software-properties-common apt-transport-https && \
  curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add - && \
  add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable" && \
  apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install --no-install-recommends expect tcl docker-ce && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/* &&\
  curl -L https://github.com/docker/compose/releases/download/1.16.1/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose &&\
  chmod +x /usr/local/bin/docker-compose

#Copy over supervisor config file
COPY ./taisun.conf /etc/supervisor/conf.d/taisun.conf

# Copy over application and install dependencies
RUN mkdir -p /usr/src/Taisun
COPY . /usr/src/Taisun
WORKDIR /usr/src/Taisun
RUN npm install

#App runs on port 80
EXPOSE 80

#Run Supervisor
CMD ["/usr/bin/supervisord"]
