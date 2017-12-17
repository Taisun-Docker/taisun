## Taisun ![Taisun](http://taisun.io/img/TaisunSmall.png)

http://taisun.io


Taisun is an application for a Docker enabled device with an emphasis on providing a web based interface for managing a single server.

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
-p 8000:8000 \
-v /var/run/docker.sock:/var/run/docker.sock \
taisun/webapp:latest.dev
```
Taisun will be available by accessing: 

http://localhost:3000

There is also a web based IDE using Cloud9 Core https://github.com/c9/core running on: 

http://localhost:8000

This can be used for making custom modifications of the project and commiting pull requests. 

## Documentation:

[Installation](https://gitlab.com/thelamer/taisun/wikis/Installation)
  - [Linux](https://gitlab.com/thelamer/taisun/wikis/Installation/Linux)
  - [Windows](https://gitlab.com/thelamer/taisun/wikis/Installation/Windows)
  - [Synology DSM](https://gitlab.com/thelamer/taisun/wikis/Installation/Synology)

[Usage](https://gitlab.com/thelamer/taisun/wikis/Usage)
  - [Stack Management](https://gitlab.com/thelamer/taisun/wikis/Usage/Stacks)
  - [Image Management](https://gitlab.com/thelamer/taisun/wikis/Usage/Images)
  - [Virtual Desktops](https://gitlab.com/thelamer/taisun/wikis/Usage/VDI)
  - [Remote Access](https://gitlab.com/thelamer/taisun/wikis/Usage/Gateway)

[Development](https://gitlab.com/thelamer/taisun/wikis/Development)
  - [Create Stack Templates](https://gitlab.com/thelamer/taisun/wikis/Development/Templates)
  - [Taisun Development](https://gitlab.com/thelamer/taisun/wikis/Development/Taisun)
  - [Development Containers](https://gitlab.com/thelamer/taisun/wikis/Development/YourApp)

##### License:
WTFPL
