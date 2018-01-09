## Taisun ![Taisun](http://taisun.io/img/TaisunSmall.png)

http://taisun.io

The first step to contributing code to the project is insuring there is an issue open and accepted for the potential commit. You can see current issues here: 

https://gitlab.com/thelamer/taisun/issues

Once an issue has been created go ahead and fork the repository: 

https://gitlab.com/thelamer/taisun/forks/new

Now you need to submit a change, the Taisun project provides a container specifically for this. To run one simply execute: 

```
sudo docker run --name taisun -d \
-p 3000:80 \
-p 8000:8000 \
-v /var/run/docker.sock:/var/run/docker.sock \
taisun/webapp:latest.dev
```

In this example a Cloud9 interface will be available at http://localhost:8000 . 

### Cloud9 Basics

When you first access the development interface you will be greeted with a login screen, this is only there to provide an ability to identify yourself if you are working in a shared environment. 

![setuser](/uploads/ac74d3005383538bb9758485f74f9963/setuser.png)

Once you are in the Cloud9 interface in your terminal on the bottom you will want to start tailing the nodemon output with: 

```
tail -f /root/Taisun.log
```

Now whenever you make code changes the current node output will be seen here. 

### Your first commit

In order to tie this into your repo we need to change the remote away from the main Taisun repo so we will run three commands here: 

```
git checkout master
git config --global user.email "youremailhere"
git remote set-url origin https://gitlab.com/Taisun-test/taisun.git
```

With the examples above swap out for your email and your forked project URL. 

For this example we are going to append something to the Readme: 

![taisuncommit](/uploads/0c10af376ee26e762476bfd82868b460/taisuncommit.png)

In the above image we changed the README.md file and here is the sequence of commands used to commit and push it: 

```
root@47b6378ead89:/usr/src/Taisun# git add .
root@47b6378ead89:/usr/src/Taisun# git commit -m '#70 adding test line to the readme'
To Commit Please enter your gitlab username:taisun-test
[master e769293] #70 adding test line to the readme
 1 file changed, 2 insertions(+)
root@47b6378ead89:/usr/src/Taisun# git push origin master 
Username for 'https://gitlab.com': taisun-test
Password for 'https://taisun-test@gitlab.com': 
Counting objects: 3, done.
Delta compression using up to 8 threads.
Compressing objects: 100% (3/3), done.
Writing objects: 100% (3/3), 326 bytes | 0 bytes/s, done.
Total 3 (delta 2), reused 0 (delta 0)
To https://gitlab.com/Taisun-test/taisun.git
   07e9da8..e769293  master -> master
```

In this example #70 is used to represent the issue you are referencing in the main repo. 


### Creating a merge request

Click on the link below to start a Merge request: 

https://gitlab.com/thelamer/taisun/merge_requests

You should automatically be presented with the merge request from your forked version, simply select the branch you want to merge ( in this case master ) : 

![start](/uploads/8a002390e9f0aaeeb72241f036f72d2c/start.png)

Edit the description to the merge request to your liking and submit it: 

![submit](/uploads/a58434c0cf0bc05f167404da71723bf5/submit.png)

Once approved your merge request will be integrated with the project and the open issue will hopefully be closed. 