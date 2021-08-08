---
title: XOR's and Oh's
description: XOR is one of those bit operators that escapes the mainstream
  spotlight. It's not a fancy framework or language making its way through the
  industry, but XOR is a fundamental part of what makes the internet and our
  software safe. Let's find out why.
author: Jarrett Helton
date: 2021-08-08T00:39:42.722Z
draft: false
tags:
  - cryptography
  - python
  - cryptohack
---
![CryptoHack – A fun free platform for learning cryptography](https://cryptohack.org/static/img/banner.png "CryptoHack")

> Heads up! This post gives answers to some of the Cryptohack challenges. Only go forward if you are stuck or have already completed them!

### Introduction

Over the past several months, I have been doing Capture the Flags challenges on [Cryptohack](https://cryptohack.org). Cryptohack is a platform for learning practical cryptography with game-like challenges. I love the platform, because it doesn't require you to leetcode the solution with the best Big-O time complexity. Instead, you just need to get the flag any way possible.

 XOR is one of those bit operators that escapes the mainstream spotlight. It's not a fancy framework or language making its way through the industry, but XOR is a fundamental part of what makes the internet and our software safe. Before we dive into code examples, we should cover what XOR is and how it's used in cryptography.

#### The Basics

XOR, meaning *exclusive or,* is a bitwise operator. Meaning, it manipulates data at the bit level. When XOR'ing bits, a set bit (value of 1) will be returned when the bits compared are different. When the bits are the same, an unset bit (value of 0) is returned.

Here is an example on a couple of nibbles:

| Nibble 1 | Nibble 2 | Result |
| -------- | -------- | ------ |
| 1        | 1        | 0      |
| 1        | 0        | 1      |
| 0        | 1        | 1      |
| 1        | 1        | 0      |



Decryption using XOR looks exactly like encryption, but reversed:

`Encryption: secret XOR message = ciphertext`

`Decryption: secret XOR ciphertext = message`

That's cool and all. But why is it so useful? 

Many asymmetric and symmetric cryptography algorithms use XOR as a component. This is due to the fact that given a secret key XOR'd against some plaintext message, the output of the operation, known as the ciphertext, is indistuigishable from a random set of bits. An attacker that has access to the encrypted message cannot tell the different between a correct and incorrect decryption result without either the key or the original message. When an encrypted set of bits has a set bit, you **cannot** **tell** whether the key or the message had a set or unset bit resulting in a 1 from the XOR operation. 

Because of this, the one-time pad, or XOR cipher, is a truly unbreakable encryption algorithm if you only use a secret key once (key reuse with an XOR cipher is a big no-no). It's not very practical, because the key would have to be as long as the message so that the XOR has enough bits to operate on. This is why we have Steam Ciphers... That's a whole different rabbit hole though.



### Cryptohack Challenges

With the basics out of the way, let's look at some of these "General" XOR problems on Cryptohack.



###### XOR Starter

> Given the string `"label"`, XOR each character with the integer `13`. Convert these integers back to a string and submit the flag as `crypto{new_string}`.

```

```

###### XOR Properties

> Below is a series of outputs where three random keys have been XOR'd together and with the flag. Use the above properties to undo the encryption in the final line to obtain the flag.

```

```

###### Favorite Byte

> I've hidden my data using XOR with a single byte. Don't forget to decode from hex first.

```

```

###### You either know, XOR you don't

> I've encrypted the flag with my secret key, you'll never be able to guess it.

```

```



### Conclusion

These challenges aren't particularly difficult, but I found them incredibly fun. I had previously read plenty about XOR ciphers and cryptography as a whole, but I had rarely written code to put that knowledge to the test. I recommend giving Cryptohack a try if you find yourself with spare time to hack and want to learn practical cryptography.