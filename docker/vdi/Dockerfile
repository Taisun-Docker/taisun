# A debian jessie docker container with window managers and some basic applications installed

FROM debian:jessie
MAINTAINER Ryan Kuba <ryankuba@gmail.com>

# Set correct environment variables
ENV HOME /root
ENV DEBIAN_FRONTEND noninteractive
ENV LC_ALL C.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8
ENV TZ=America/Los_Angeles
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Base Applications install
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install \
  xvfb \
  x11vnc \
  supervisor \
  xfce4-goodies \
  xfce4 \
  git-core \
  terminator \
  i3 \
  apt-transport-https \
  ca-certificates \
  curl \
  gnupg2 \
  software-properties-common \
  vim \
  wget \
  screen \
  tmux \
  sudo \
  xserver-xorg-video-dummy \
  firefox-esr \
  git && \
  dpkg --add-architecture i386 && \
  curl -fsSL https://dl.winehq.org/wine-builds/Release.key | apt-key add - && \ 
  curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add - && \
  add-apt-repository "deb https://dl.winehq.org/wine-builds/debian/ $(lsb_release -cs) main" && \
  add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable" && \
  apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --install-recommends \
  winehq-stable docker-ce && \
  apt-get autoclean && \
  rm -rf /var/lib/apt/lists/* && \
  useradd -ms /bin/bash taisun && \
  echo "taisun:taisun" | chpasswd && \
  usermod -aG sudo taisun && \
  curl -L https://github.com/docker/compose/releases/download/1.16.1/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose && \
  chmod +x /usr/local/bin/docker-compose


# Copy over the start file
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Startup file to use different window managers
COPY ./startdesktop /

# Copy over the xorg template
COPY ./xorg.conf /etc/X11/xorg.conf

# Helper script for changing the resolution
COPY ./changeres.sh /

# Basic desktop config files for xfce
COPY ./config /home/taisun/.config/
RUN chown -R taisun:taisun /home/taisun/.config
COPY ./xscreensaver /home/taisun/.xscreensaver
RUN chown taisun:taisun /home/taisun/.xscreensaver

# Set display
ENV DISPLAY :0

# Expose Port
EXPOSE 5900

CMD ["/usr/bin/supervisord"]
