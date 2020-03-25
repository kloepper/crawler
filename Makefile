# Load credentials and config into environment (see example.env for details).
include .env
export $(shell sed 's/=.*//' .env)

.DEFAULT_GOAL: test

YoMundo.class: scratch/crawl.java ; javac -cp "scratch/jedis-2.4.2.jar" scratch/crawl.java

.PHONY: java
java: scratch/YoMundo.class ; java -cp "./scratch:scratch/jedis-2.4.2.jar" YoMundo

.PHONY: node
node: crawl.js ; ./crawl.js

.PHONY: python
python: scratch/crawl.py ; ./scratch/crawl.py

.PHONY: test
test: build/coverage/lcov-report/index.html

build/coverage/lcov-report/index.html: crawl_worker.ts crawl_worker.test.ts ; npm test

build/compiled/crawl_worker.js: crawl_worker.ts ; npm run tsc

.PHONY: deploy
deploy: test build/compiled/crawl_worker.js ; npm run deploy

.PHONY: clean
clean:
	rm -f scratch/YoMundo.class || true
	rm -rf build/
