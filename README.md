## Taisun ![Taisun](http://taisun.io/img/TaisunSmall.png)

http://taisun.io


Taisun is a web based interface for a Docker enabled device with an emphasis on providing a web based interface for managing a single server.

Taisun allows you to: 

  - Deploy and manage web based virtual desktops.
  - Deploy taisun specific stacks of applications
  - Browse available images on popular Docker repositories
  - Import a Docker project from any git repository and start developing on your choice of web based IDE or full Linux desktop
  - Spinup a shell application based on popular frameworks and work from a web based IDE

### QuickStart

#### Users:

On a Docker enabled host run the following command from cli:
```
sudo docker run --name taisun -d \
-p 3000:80 \
-p 3001:3000 \
-v /var/run/docker.sock:/var/run/docker.sock \
taisun/webapp:latest
```
Taisun will be available by accessing: 

http://localhost:3000

#### Developers: 

On a Docker enabled host run the following command from cli:
```
sudo docker run --name taisun -d \
-p 3000:80 \
-p 3001:3000 \
-p 8000:8000 \
-v /var/run/docker.sock:/var/run/docker.sock \
taisun/webapp:latest.dev
```
Taisun will be available by accessing: 

http://localhost:3000

There is also a web based IDE using Cloud9 Core https://github.com/c9/core running on: 

http://localhost:8000

This can be used for making custom modifications of the project and commiting pull requests. 

TODO method for a pull request. 

## Usage

WIP

## Features Todos

  - Search and deploy images from dockerhub
  - Deploy images from your local images on disk
  - Import an existing Docker project from a public/private git repo
  - Build shell containers for frameworks like NodeJS, Python, ETC. Give the user the ability to choose an IDE to use along with a volume linked VDI. 


##### License:
MIT
