---
title: XOR's and Oh's
description: XOR is one of those bit operators that escapes the mainstream
  spotlight. It's not a fancy framework or language making its way through the
  industry, but XOR is a fundamental part of what makes the internet and our
  software safe. Let's find out why.
author: Jarrett Helton
date: 2021-08-08T00:39:42.722Z
draft: true
tags:
  - cryptography
  - python
  - cryptohack
---
![CryptoHack – A fun free platform for learning cryptography](https://cryptohack.org/static/img/banner.png)

### Introduction

Over the past several months, I have been doing Capture the Flags challenges on [Cryptohack](https://cryptohack.org). Cryptohack is a platform for learning practical cryptography with game-like challenges. I love the platform, because it doesn't require you to leetcode the solution with the best Big-O time complexity. Instead, you just need to get the flag any way possible.



### XOR and Symmetric Encryption

XOR is one of those bit operators that escapes the mainstream spotlight. It's not a fancy framework or language making its way through the industry, but XOR is a fundamental part of what makes the internet and our software safe. Before we dive into code examples, we should cover what XOR is and how it's used.