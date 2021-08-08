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

Over the past several months, I have been doing Capture the Flags challenges on [Cryptohack](https://cryptohack.org). Cryptohack is a platform for learning practical cryptography with game-like challenges. I love the platform because it doesn't require you to leetcode the solution with the best Big-O time complexity. Instead, you just need to get the flag any way possible.

 XOR is one of those bit operators that escape the mainstream spotlight. It's not a fancy framework or language making its way through the industry, but XOR is a fundamental part of what makes the internet and our software safe. Before we dive into code examples, we should cover what XOR is and how it's used in cryptography.

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

Many asymmetric and symmetric cryptography algorithms use XOR as a component. This is due to the fact that given a secret key XOR'd against some plaintext message, the output of the operation, known as the ciphertext, is indistinguishable from a random set of bits. An attacker that has access to the encrypted message cannot tell the difference between a correct and incorrect decryption result without either the key or the original message. When an encrypted set of bits has a set bit, you **cannot** **tell** whether the key or the message had a set or unset bit resulting in a 1 from the XOR operation. 

Because of this, the one-time pad, or XOR cipher, is a truly unbreakable encryption algorithm if you only use a secret key once (key reuse with an XOR cipher is a big no-no). It's not very practical, because the key would have to be as long as the message so that the XOR has enough bits to operate on. This is why we have Steam Ciphers... That's a whole different rabbit hole though.

### Cryptohack Challenges

With the basics out of the way, let's look at some of these "General" XOR problems on Cryptohack.

###### XOR Starter

> Given the string `"label"`, XOR each character with the integer `13`. Convert these integers back to a string and submit the flag as `crypto{new_string}`.

```python
#! /usr/bin/python3
test = "label"
result = ""
for c in test:
    result = result + chr(ord(c) ^ 13)

print(result)
```

###### XOR Properties

> Below is a series of outputs where three random keys have been XOR'd together and with the flag. Use the above properties to undo the encryption in the final line to obtain the flag.

I found this challenge particularly interesting. It does a great job of highlighting XOR properties and how key reuse can be dangerous even in conjunction with other keys. It is not a real-world example, but it proves several concepts.

```python
#! /usr/bin/python3

# Commutative: A ⊕ B = B ⊕ A
# Associative: A ⊕ (B ⊕ C) = (A ⊕ B) ⊕ C
# Identity: A ⊕ 0 = A
# Self-Inverse: A ⊕ A = 0

from pwn import xor

key1 = bytes.fromhex("a6c8b6733c9b22de7bc0253266a3867df55acde8635e19c73313")
result1 = bytes.fromhex("37dcb292030faa90d07eec17e3b1c6d8daf94c35d4c9191a5e1e")
result2 = bytes.fromhex("c1545756687e7573db23aa1c3452a098b71a7fbf0fddddde5fc1")
result3 = bytes.fromhex("04ee9855208a2cd59091d04767ae47963170d1660df7f56f5faf")

key2 = xor(key1, result1)
key3 = xor(key2, result2)
flag = xor(result3, key1, key2, key3)

print(flag)
```

###### Favorite Byte

> I've hidden my data using XOR with a single byte. Don't forget to decode from hex first.

This challenge shows a brute force method of decrypting. Though as you can see, it's only useful if you know at least part of the original plain text.

```python
from pwn import xor

test = bytes.fromhex(
    "73626960647f6b206821204f21254f7d694f7624662065622127234f726927756d"
)
for i in range(0, 256):
    result = xor(test, i).decode("utf-8")
    if "crypto" in result:
        print(result)
```

###### You either know, XOR you don't

> I've encrypted the flag with my secret key, you'll never be able to guess it.

Lastly, this one took me for a bit of a loop. I went around in circles for a bit. I was thrown off by the fact that the encrypted messaged was so long, yes we only knew 8 of the values of the decrypted message.

After some thought, I decided to just XOR the first 7 characters of the message with the portion of the flag. This result in a portion of the key: `myXORke`. It was then a no-brainer what the real key was. I wanted to go the extra step and see if XOR'ing the last character of the flag format with the last character of the message would give me what I knew was the final key. It worked!

```python
#! /usr/bin/python3
from pwn import xor

encrypted_msg = bytes.fromhex(
    "0e0b213f26041e480b26217f27342e175d0e070a3c5b103e2526217f27342e175d0e077e263451150104"
)

flag_format = b"crypto{"
key = xor(encrypted_msg[:7], flag_format) + xor(encrypted_msg[-1], "}")
print(key)
flag = xor(key, encrypted_msg)
print(flag)
```

### Conclusion

These challenges aren't particularly difficult, but I found them incredibly fun. I had previously read plenty about XOR ciphers and cryptography as a whole, but I had rarely written code to put that knowledge to the test. I recommend giving Cryptohack a try if you find yourself with spare time to hack and want to learn practical cryptography.