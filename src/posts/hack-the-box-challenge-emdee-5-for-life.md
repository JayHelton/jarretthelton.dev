---
title: "Hack the Box Challenges: Emdee 5 For Life"
description: A quick write-up for the Emdee 5 For Life challenge on Hack the Box!
author: Jarrett Helton
date: 2021-08-13T00:37:57.555Z
draft: false
tags:
  - cryptography
  - hackthebox
  - ethicalhacking
---
![Awkward Roadtrip Moments: No Ragrets - YouTube](https://i.ytimg.com/vi/pSW2FDXuFe4/maxresdefault.jpg)

### Introduction

Emdee 5 for life is an *easy* web challenge on [Hack the Box](https://www.hackthebox.eu/). 

The challenges on Hack the Box are not like the pwn machines. Each challenge is already on a specific port and follow a more obvious theme.

The challenge details are simply: 

> Can you encrypt fast enough?

### Details

The webpage itself is very basic. There is a random value in a header and a small form. The page just tells you to "Encrypt this string".  I used [MD5Online](https://www.md5online.org/md5-encrypt.html) to do a quick hash of the first value and submitted it. 

Submitting this way just leads to a "Too Slow" message.

![Webpage showing the title MD5 encrypt this string, with a random text value, a subtitle saying too slow, and a form with a button](/static/img/screen-shot-2021-08-12-at-8.46.39-pm.png "Emdee for life page")

I tried to manually move faster, but after an attempt or two of trying to be The Flash, I moved over to scripting.

There are a few steps we need to do:

* Figure out how the form is submitted
* Extract the string from the header
* Submit the form via a POST request

Using Burp Suite, I intercepted a manual submission of the form. The data is being submitted as `application/x-www-form-urlencoded`. 

With that figured out, I used the [BeautifulSoup](https://beautiful-soup-4.readthedocs.io/en/latest/) library to extract the value we needed to hash from the header. Then I used [HashLib](https://docs.python.org/3/library/hashlib.html) to MD5 hash the value and then [Requests](https://docs.python-requests.org/en/master/) to immediately POST the data to the server.

Here is the final script:

```python
#! /usr/bin/python3

import requests
from bs4 import BeautifulSoup
import hashlib


def get_challenge(body):
    soup = BeautifulSoup(body, "html.parser")
    header = soup.select("h3")[0].text.strip()
    print("header ", header)
    return header


def post(session, hash):
    print("sending hash ", hash)
    r = session.post("http://139.59.166.56:32107/", data={"hash": hash})
    print(r.text)


def main():
    session = requests.session()
    r = session.get("http://139.59.166.56:32107/")
    header = get_challenge(r.text)
    hash = hashlib.md5(header.encode("utf-8")).hexdigest()
    post(session, hash)


main()
```

Suprisingly enough, this is all you need! 

The flag was returned and the challenge was complete!

### Conclusion

Thanks for reading this quick walkthrough of Emdee for life. It was an easy one, but fun nevertheless.