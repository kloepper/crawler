# crawler
## Problem
Write a simple web crawler.

## OSX setup
 - brew install node
 - brew install lynx
 - brew install coreutils
   - This is needed for the gtimeout command
 - create an .env file using example.env as the template

## Useful commands
 - `make test`
   - Uses Jest to run unit tests against Typescript code in the lib/ directory
   - An HTML test coverage output can be found in build/coverage/lcov-report/index.html
 - `make deploy`
   - This is only needed to deploy the worker varient
   - It compiles all typescript code into Javascript and then packages into single file using rollup.js
   - The serverless tool is used to publish the bundled worker script
 - `./crawl.sh <URL>`
    - Bash script that uses the lynx browser to perform a crawl
    - This command maintains state in output files to allow resuming of the crawl
 - `./crawl.js <URL> <concurrent_count>`
    - Run crawl command from a Node script written in JavaScript
    - concurrent_count specifies the maximum number of HTTP to have in flight concurrently
 - `source .env && ./crawl_using_worker.js <URL> <concurrent_count>`
    - Similar to the crawl script except that the URL fetching and HTML link extraction is done by a Worker running on a Cloudflare server.
    - The source of .env load credentials into the Environment that allow crawl worker to be reached.
 - `source .env && ./compare_crawlers.sh <URL>`
    - Performs the crawl for specified URL using each of the three crawl tecniques

# Results
Output from the `compare_crawlers.sh` script (output alignment done manually) will help frame this discussion:

```
./compare_crawlers.sh https://twitter.com 60
bash              fetched   71 pages, with    0 failures, finding   5085 links.
node_sequential   fetched  185 pages, with    0 failures, finding  12500 links.
node_5x           fetched  595 pages, with    6 failures, finding  46107 links.
node_20x          fetched  934 pages, with  439 failures, finding  80235 links.
node_100x         fetched 1963 pages, with  590 failures, finding 175620 links.
worker_sequential fetched  136 pages, with    0 failures, finding   7126 links.
worker_5x         fetched  545 pages, with    7 failures, finding  42597 links.
worker_20x        fetched 1639 pages, with   25 failures, finding 147508 links.
worker_100x       fetched 5992 pages, with 1057 failures, finding 705518 links.

➜  ./compare_crawlers.sh https://news.ycombinator.com 60
bash              fetched   56 pages, with    0 failures, finding   5352 links.
node_sequential   fetched   41 pages, with   28 failures, finding   5134 links.
node_5x           fetched   77 pages, with   97 failures, finding   8969 links.
node_20x          fetched  379 pages, with  439 failures, finding  45842 links.
node_100x         fetched 1023 pages, with  576 failures, finding 302744 links.
worker_sequential fetched   76 pages, with    2 failures, finding   8393 links.
worker_5x         fetched  338 pages, with    9 failures, finding  23533 links.
worker_20x        fetched  629 pages, with  187 failures, finding  52568 links.
worker_100x       fetched  940 pages, with 4760 failures, finding  65450 links.

➜  ./compare_crawlers.sh https://www.google.com 60
bash              fetched   33 pages, with    0 failures, finding  10283 links.
node_sequential   fetched   95 pages, with    5 failures, finding   9328 links.
node_5x           fetched  358 pages, with    6 failures, finding  35254 links.
node_20x          fetched 1639 pages, with   26 failures, finding 118488 links.
node_100x         fetched 2145 pages, with   21 failures, finding 296046 links.
worker_sequential fetched   54 pages, with    3 failures, finding   1767 links.
worker_5x         fetched  153 pages, with    9 failures, finding  20223 links.
worker_20x        fetched  869 pages, with   28 failures, finding 115529 links.
worker_100x       fetched 1851 pages, with   67 failures, finding 253121 links.
```

This output shows the results of running a web crawl against three domains (twiter, hacker news, and google). Each crawl is run for 60 seconds and the number of pages successfully fetched, number of fetches that failed, and number of links found on pages that successfuly fetched is displayed.

All of the crawler programes only every attempted to fetch a URL once.

The first two scripts (and also worker_sequential) operate by:
- Downloading the content of a URL
- Parsing content as HTML
- Extracting unique links
- Adding links in page order to fetch queue

This process is done one URL at a time sequentially in page order. The performance difference between the bash version and Node versions likely has to do with increased latency of Bash having to start new processes to handle each stage of the run.

**Which brings us to the fundamental problem: hiding latency.**

The best way to hide latency is using concurrent programming techniques. These techniques first started as interrupt driven programming or using various polling techniques. Essentially it is just being able to wait on multiple things at the same time instead of waiting one by one. 

Concurrency is closely related to parallel programming techniques. Parallel programming is multiplying the amount of work you can do by splitting the problem to be solved across many parallel tasks. Parallel programming allows more work to be done by engaging more computing resources. 

In a way the crawler program is just the front side of a parallel programming problem as some of the above runs interacted with thousands or tens of thousands of computers and network devices. However, this was not just one big compute problem being broken down into smaller chunks. We are also contending with large latency values transporting parts of the problem across the internet. 

So to solve the latency problem we just issue multiple page downloads at the same time. This works well, but eventually exposes the second big problem.

**Second main problem: limited network bandwidth**

While watching the network tab on my local machine running a 100x concurrent fetch I see it spike into the 10 MB/s range downloading pages. The crawl speed is being limited by my ability to get the HTML (and other non HTML resources) to my machine to be parsed.

One way to solve this problem is to use more machines to do the work. Except they cant just be other cores on my laptop as all those cores share the same link to the interenet. 

The `crawl_using_worker.js` runs the same Javascript (mostly) to download and parse the HTML. It runs that function from a Cloudflare worker in a colo that is connected to the internet with a fast link.

It is interesting to see that while the fast link does help significantly in some cases without increasing the concurrency it can be slower due to added latency of running call to worker code.

## Next steps
- Limit maximum concurrent fetches to any single origin.
  - I suspect this is a major contributor to higher error rates among concurrent crawls.
- Split crawler service from viewing service.
  - The output of crawl results does not need to be done live.
  - Using a datastore like Redis or sqlite the crawl state can be persisted and explored independenly from fetching and parsing HTML pages.

## Design process
Write code quickly to understand the problem space. It is difficult to really begin to understand a problem unless there is some solution available to crique (no matter how inefficient or naieve).

By writing code to try out designs a base of functional knowledge is established that can quickly be used to pivot the final solution. Beyond solving the target problem exercise programming increases the programmers ability to represent a solution more accuately and with less time spent writing code.

Often rewriting a simple algorithm in several differnt languages helps to understand the really structure of the algorithm apart from any language syntax. This allows the concrete implementaion in each language to be improved.

Using composition of command line utilities is a great way to get something working quickly. It both gives a simple reference implementation as well as catching many corner cases when using well established utilities. The disadvantages typically have to do with overall performance as well as very high costs to customize the solution (which also typically makes the script increasingly brittle).
