---
title: Rust Antics - CPU Intensive Tasks in a Web Server
description: Playing around with Rust one idea at a time.
author: Jarrett Helton
date: 2021-10-16T23:02:34.335Z
draft: false
tags:
  - rust
  - programming
---
### **Introduction**

There is an interesting strategy for load shedding for a CPU intensive HTTP server. The context I learned this was with Node, but I decided to experiment with Rust and Tokio. The idea is simple - accept requests for a CPU intensive operation that is long enough to prevent concurrency, but not long enough to warrant an event-based pattern (like a pub/sub or queue).

Having CPU intensive tasks, commonly referred to as a blocking task, in an HTTP server is usually a bad idea. This is true even when you have multiple threads available. You can only get so many cores before your pockets hurt. When you have a task that blocks, that thread will stay busy and will not yield that work. The success for many HTTP servers receiving high traffic comes from concurrency. 

Concurrency is, more or less, the ability for a single thread to make progress on multiple tasks. This is made possible when a task has to "wait" for some other type of I/O bound operation like a database call or another HTTP request. These actions produce downtime because the task is either delegated to the OS or there is network latency. When that I/O bound operation is made within a thread, that thread yields back control of that task to the async runtime (like Tokio) and attempts to make progress on a different task that has been marked as ready because its I/O operation has completed. There is a lot of complexity that exists in an async runtime, like reactors, timers, and schedulers. I will not jump into those details in this post because I still have a lot to learn about their implementations.

So, my experiment was very simple. Create an HTTP server that accepts requests for a blocking task. If a request is made to the server while it can no longer handle any new tasks, reject the request with a 429 (too many requests). This is a very basic implementation of load shedding.

### Details

I used Axum and Tokio for this.\
\
[Github Link](https://github.com/JayHelton/learning_playground/blob/main/rust/http_cpu_test/src/bin/server.rs).\
\
Here is the main entry point: 

```rust
struct State {
    counter: usize,
}

type AppState = Arc<Mutex<State>>;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let state = Arc::new(Mutex::new(State {
        counter: num_cpus::get() - 1,
    }));

    let app = Router::new()
        .route("/blocking", get(blocking_handler))
        .layer(CpuAvailabilityLayer::new(state.clone()))
        .layer(AddExtensionLayer::new(state))
        .handle_error(|error: BoxError| {
            if error.is::<CoresUnavailable>() {
                return Ok::<_, Infallible>((
                    StatusCode::TOO_MANY_REQUESTS,
                    Cow::from(format!("All cores are busy. Try again later.")),
                ));
            }

            Ok::<_, Infallible>((
                StatusCode::INTERNAL_SERVER_ERROR,
                Cow::from(format!("Unhandled internal error: {}", error)),
            ))
        });

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));

    println!("listening on {}", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;

    Ok(())
}
```

This creates a new Axum server with a shared state. When you have a multithreaded system, its a good idea to create an Arc for the state. This creates a type for atomic reference counting of data that is stored on the heap. The details around atomic reference counting is really neat and I recommend readers look more into how that type works. When you see an Arc typed cloned in the code, know that it is a reference being cloned, not the data that is being referenced. Because the Arc is a shared reference, Rust disallows mutation of that data. We remedy that by using a Mutex (mutual exclusion). The available cores is stored in this shared state. You can see that I subtracted 1 from the number of cores. This is to ensure that we always have a logical core available to continue accepting requests and rejecting them if there is no availability.\
\
Axum adopts Tower as a middleware system. I created a middleware that will check the number of cores available, throwing an error if resources are unavailable. 

```rust
/**
 * We define a new error for rejections.
 * We implement std::error::Error so that we can convert
 * the error back down to a general error.
 */
#[derive(Debug, Default)]
struct CoresUnavailable(());

impl std::fmt::Display for CoresUnavailable {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.pad("No cores available")
    }
}

impl std::error::Error for CoresUnavailable {}

/**
 * For complex middleware, we can define our own futures.
 * We probably could also just return a Box dyn in the Service impl
 */
#[pin_project]
struct ResponseFuture<F> {
    #[pin]
    future: F,
    cores_available: bool,
}

impl<F, Response, Error> Future for ResponseFuture<F>
where
    F: Future<Output = Result<Response, Error>>,
    Error: Into<BoxError>,
{
    type Output = Result<Response, BoxError>;

    fn poll(self: Pin<&mut Self>, cx: &mut std::task::Context<'_>) -> Poll<Self::Output> {
        if !self.cores_available {
            let err = Box::new(CoresUnavailable(()));
            return Poll::Ready(Err(err));
        }
        let this = self.project();
        match this.future.poll(cx) {
            Poll::Ready(result) => {
                let result = result.map_err(Into::into);
                return Poll::Ready(result);
            }
            Poll::Pending => {}
        }
        Poll::Pending
    }
}

/**
 * CPU availability middleware. It will call the inner service if there are workers available,
 * else it will throw an error
 */
#[derive(Debug, Clone)]
struct CpuAvailability<T> {
    state: AppState,
    inner: T,
}

impl<S> CpuAvailability<S> {
    fn new(state: AppState, inner: S) -> Self {
        CpuAvailability { state, inner }
    }
}

impl<S, Request> Service<Request> for CpuAvailability<S>
where
    S: Service<Request>,
    S::Error: Into<BoxError>,
{
    type Response = S::Response;
    type Error = BoxError;
    type Future = ResponseFuture<S::Future>;

    fn poll_ready(
        &mut self,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx).map_err(Into::into)
    }

    fn call(&mut self, req: Request) -> Self::Future {
        println!(
            "Checking CPUs: {} available",
            available_cores(self.state.clone())
        );
        ResponseFuture {
            cores_available: is_available(self.state.clone()),
            future: self.inner.call(req),
        }
    }
}

/**
 * Middleware Layer for the service decoration to make it a reusable component
 */
#[derive(Debug, Clone)]
struct CpuAvailabilityLayer {
    state: AppState,
}

impl CpuAvailabilityLayer {
    fn new(state: AppState) -> Self {
        CpuAvailabilityLayer { state }
    }
}

impl<S> Layer<S> for CpuAvailabilityLayer {
    type Service = CpuAvailability<S>;

    fn layer(&self, service: S) -> Self::Service {
        CpuAvailability::new(self.state.clone(), service)
    }
}
```

Okay... This middleware is not the easiest to look at. It took me awhile to navigate the traits and safety requirements enforced by Rust. It took me even longer to adapt to Rust's future implementations. I recommend reading more about Tower and its ServiceLayer pattern if you are genuinely interested in this part. \
Before diving into this, I never really understood the safety complexities that exist for middleware and function wrapping in general.\
\
Next we have the actual route handler which uses functions that access our shared state:

```rust
async fn blocking_handler(Extension(state): Extension<AppState>) -> impl IntoResponse {
    println!("Starting Work");
    decrement(state.clone());
    let start = Instant::now();
    loop {
        let elapsed = start.elapsed();
        if elapsed.as_secs() == 30 {
            break;
        }
    }
    increment(state);
    println!("Work Done");
    Json("Work Done")
}

fn available_cores(state: AppState) -> usize {
    let handle = state.lock().unwrap();
    handle.counter
}

fn is_available(state: AppState) -> bool {
    let handle = state.lock().unwrap();
    handle.counter != 0
}

fn decrement(state: AppState) {
    let mut handle = state.lock().unwrap();
    handle.counter = handle.counter - 1;
}

fn increment(state: AppState) {
    let mut handle = state.lock().unwrap();
    handle.counter = handle.counter + 1;
}
```

Nothing mind blowing here. Just a simulation of actual work.

### Conclusion

The experiment itself is not very exciting. I used this as a goal-oriented excuse to dive deeper into Tokio and Rusts async/multithreaded ecosystem. I watched countless hours of Jon Gjengsets Youtube channel. \
I can honestly say that I have a much better grasp on Rust as a language and Rust's concurrency and multithreaded story.

My next Rust Antics post will be about hacking my own DNS Nameserver.

#### References:

* <https://www.youtube.com/c/jongjengset>
* <https://github.com/tower-rs/tower/tree/master/guides>
* <https://doc.rust-lang.org/std/sync/struct.Arc.html>
* <https://doc.rust-lang.org/std/sync/struct.Mutex.html>