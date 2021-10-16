---
title: Rust Antics - Multithreaded Tokio
description: Playing around with Rust one idea at a time.
author: Jarrett Helton
date: 2021-10-16T23:02:34.335Z
draft: true
tags:
  - rust
  - programming
---
There is an interesting strategy for load shedding on for a CPU intensive HTTP server. The context I learned this was with Node, but I decided to experiment with Rust and Tokio. The idea is simple - accept requests for a CPU intensive operation that is long enough to prevent concurrency, but not long enough to warrant an event-based architecture (like a pub/sub or queue).

Having CPU intensive tasks, commonly referred to as a blocking task, in an HTTP server is usually a bad idea. This is true even when you have multiple threads available. You can only get so many cores before your pockets hurt. When you have a task that blocks, that thread will stay busy and will not yield that work. See, the success for many HTTP servers receiving high traffic comes from concurrency. 

Concurrency is, more or less, the ability for a single thread to make progress on multiple tasks. This is made possible when a task has to "wait" for some other type of I/O bound operation like a database call or another HTTP request. These actions produce downtime because the task is either delegated to the OS or there is network latency. When that I/O bound operation is made within a thread, that thread yields back control of that task to the async runtime (like Tokio) and attempts to make progress on a different task that has been marked as ready because its I/O operation has completed. There is a lot of complexity that exists in an async runtime, like reactors, timers, and schedulers. I will not jump into those details in this post. Mostly because I still have a lot to learn about their implementations.

So, my experiment was very simple. Create an HTTP server that accepts requests for a blocking task. If a request is made to the server while it can no longer handle any new tasks, reject the request with a 429 (too many requests). This is a very basic implementation of load shedding.