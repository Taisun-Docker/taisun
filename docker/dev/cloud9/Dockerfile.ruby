#Dockerfile for Ruby Development container
#2017
#Use the Ruby base image
FROM ruby:2.4.3-jessie

MAINTAINER Ryan Kuba <ryankuba@gmail.com>

# Grab Cloud9 and install under root
RUN curl https://s3-us-west-2.amazonaws.com/taisun-pubfiles/cloud9.tar.gz | tar xz -C /

#Install Dependencies
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y git supervisor software-properties-common apt-transport-https && \
  curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add - && \
  add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable" && \
  apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install --no-install-recommends expect tcl docker-ce && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/* &&\
  curl -L https://github.com/docker/compose/releases/download/1.16.1/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose &&\
  chmod +x /usr/local/bin/docker-compose

#Copy over supervisor config file and start script
COPY ./ruby.conf /etc/supervisor/conf.d/ruby.conf
COPY ./start.sh /start.sh

#App runs on port 80
EXPOSE 80

#Run Supervisor
CMD ["/usr/bin/supervisord"]
