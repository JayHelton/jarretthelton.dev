---
title: "Hack the Box Machines: Pit"
description: A write-up for the Pit machine on Hack the Box!
author: Jarrett Helton
date: 2021-08-13T23:32:27.648Z
draft: false
tags:
  - ethicalhacking
  - cybersecurity
  - hackthebox
---
![New Machine - PIT - Linux - Worth 50 points - Mediume difficulty](/static/img/pithtb.jpeg "Pit Hack the Boc")

### Introduction

Pit is a medium machine on [Hack the Box](https://www.hackthebox.eu/). 

As a novice hacker, this was a difficult challenge. It took me around a week from start to finish, researching and hacking here and there throughout the week. The research took the longest.

In my writeups, I avoid posting all of the exact outputs of the commands that I run or the flags that I find. I highly recommend spending some time trying to get through this yourself!

### Enumeration

As usual, we start with enumeration of the machine.

I added the IP address of the machine to `/etc/hosts` as `pit.htb` to make things easier.\
\
I prefer rustscan:\
`rustscan -a pit.htb --ulimit 5000 -- -A -oN initial.nmap`

Port and service scanning shows that we have ports 22, 80, and 9090 available. We also have an SSL certificate for `dms-pit.htb`. Port 80 just shows a default nginx install. Since we have nginx installed, there may be specific routing based on domain.\
\
In the hosts file, I added an entry for `dms-pit.htb`. Visiting this domain result in a forbidden error code. Next is port 9090. This has [Cockpit](https://cockpit-project.org/) installed. It took me some snooping to figure out that this was Cockpit. I had to poke through the script tag in the HTML. 

I tried to login with basic credentials, but these did not work. I went down a few brute force rabbit holes with password lists like rockyou.txt, but they did not lead anywhere. A directory enumeration with gobuster was also a dead-end. Usually when I get stuck like this, just try more enumeration tactics of varying levels.\
\
I finally found something with a UDP scan (this took forever):

`rustscan -a pit.htb --ulimit 5000 -- -sU -v -oN udp.nmap`

Port 161 is open for `snmp`. 

This was a great find, but I had zero clues of what snmp even was. This was my first long stint of having to research. [This arcticle](https://www.auvik.com/franklyit/blog/network-basics-what-is-snmp/) does a pretty good job of explaining what the protocol is used for, but the even more basic explanation is "it's used for monitoring and is super confusing".

There are a handful of linux utilities availble on my Kali machine. After a lot of trial and error, I found a command that worked. I'll be honest, I have not fully grasped what these utilities are doing and which each parameter is doing.. but they got me there: 

`snmpbulkwalk -On -r1 -v2c -c public <ip-address> | tee snmpbulkwalk.txt`

I tee'd this into a text file, becuase it mostly outputs a bunch of noise I did not care about. Grokking it in the terminal was awful.

Eventually, I found two sections that were useful:

```
Login Name           SELinux User         MLS/MCS Range        Service

__default__          unconfined_u         s0-s0:c0.c1023       *
michelle             user_u               s0                   *
root                 unconfined_u         s0-s0:c0.c1023       *
System uptime
```

```
.1.3.6.1.4.1.2021.9.1.2.2 = STRING: "/var/www/html/seeddms51x/seeddms"
```

Now we have a username and a new path to try on the webserver.\
Navigating to `https://dms-pit.htb/seeddms51x/seeddms` shows us the login page for [SeedDMS](https://www.seeddms.org/index.php?id=2).

### Remote Code Execution

I used searchsploit and saw that there was an RCE vulnerability.

Unfortunately, it requires authentication. Luckily for me, the username `michelle` came into play and the password was also `michelle`. I immediately jumped into using [this python script](https://www.exploit-db.com/exploits/50062) to exploit the RCE vulnerability. After some failures, I had to adjust some of the URL parameters in the script and eventually got it working. Being the script kiddie I am, I just used [this PHP](https://www.exploit-db.com/exploits/47022) file as the payload to upload.\
\
Finally, with the script uploaded and the python scripting working, we can send commands via the script. After a lot of  `cd`s and `ls`s, I found a settings.xml file in the installation of SeedDMS. 

```
Seeddms Shell]$ cat settings.xml

[Seeddms Shell]$ <?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <site>
... yada yada yada
    <database dbDriver="mysql" dbHostname="localhost" dbDatabase="seeddms" dbUser="seeddms" dbPass="ied^ieY6xoquu" doNotCheckVersion="false">
    </database>
... yada yada yada
```

\
\
This file had a DB password in plaintext. Time to try and use that password!

### Finding the User Flag

Given the name of the machine (Pit), I made the educated guess that Cockpit was going to be our main entrance into the system. Using the DB password we found and username `michelle`, we successfully log into Cockpit. 

I immediately found the page that boots up an in-browser shell into the linux instance. User flag found!

### Privilege Escalation

Privilege escalation for this machine was HARD.\
The user we had access to was not able to do anything obvious. I was not able to list out any files that this user could run as root. I was stuck here.\
I backtracked my steps and decided to read through the outputs of the snmpbulkwalk. Anything that looked like a file on the server, I tried to cat and inspect with michelle. I stumbled on this line:

`.1.3.6.1.4.1.8072.1.3.2.2.1.2.10.109.111.110.105.116.111.114.105.110.103 = STRING: "/usr/bin/monitor"`

Previous research showed me that snmp can be used for monitoring and running scripts. I was able to cat out the script:

```
#!/bin/bash

for script in /usr/local/monitoring/check*sh
do
    /bin/bash $script
done
```

My assumption was that *at some point* this script would run because of snmp and iterate through at scripts in `/usr/local/monitoring` that matched that naming pattern. So, I need to create a script that will give me access, then I need to find out how to trigger this monitoring script. It sounds easy enough.\
\
It was not easy. This was what took me the longest. I had to dig a lot into snmp, trying random commands I found on Stackoverflow and random articles. Nothing was working. After several sessions of attempting to get root access, I realized I had two problems:

* I had no idea which command would actually run the monitoring script
* It turns out the machine deletes all scripts in the monitoring folder after some unmeasured amount of time.

For all I know, all of my attempts at executing the reverse-shell script only failed because the script did not exist. I decided to approach this with something more measurable. Instead of a reverse-shell, I created a script that outputs an SSH public key into `/root/.ssh/known_hosts`. This only works if port 22 is available, but I've grown to really like this approach over a reverse-shell, if possible. \
\
Now, every time I tried a command, I copied the script into the folder.

I found [this medium article](https://medium.com/rangeforce/snmp-arbitrary-command-execution-19a6088c888e) by rangeforce, which led me to the basic command I needed:

`snmpwalk -m +MY-MIB -v2c -c public <IP-Address> nsExtendObjects`

I also had to run `sudo download-mibs` to get passed some obscure errors.

Once the command finishes, I was able to ssh into the machine as root and found the root flag!

### Conclusion

Pit was the first medium machine I completed. Before this, I had no idea that SNMP existed! I am no Linux Admin. This machine had several new applications and concepts for me, so I had to take a "shotgun" approach. I was slow, but I got there eventually. 

Pit was also the first one I've done that required a UDP scan.\
Even with the basics of the machine laid out, I still recommend going through it and see how it all pieced together.