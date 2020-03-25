# Load credentials and config into environment (see example.env for details).
include .env
export $(shell sed 's/=.*//' .env)

.DEFAULT_GOAL: all
.PHONY: all
all: YoMundo.class

YoMundo.class: crawl.java ; javac -cp "jedis-2.4.2.jar"  crawl.java

.PHONY: java
java: YoMundo.class ; java -cp ".:jedis-2.4.2.jar" YoMundo

.PHONY: node
node: crawl.js ; ./crawl.js

.PHONY: python
python: crawl.py ; ./crawl.py 
.PHONY: test
test: build/coverage/lcov-report/index.html

build/coverage/lcov-report/index.html: crawl_worker.ts crawl_worker.test.ts ; npm test

build/compiled/crawl_worker.js: crawl_worker.ts ; npm run tsc

.PHONY: deploy
deploy: test build/compiled/crawl_worker.js ; npm run deploy

.PHONY: clean
clean:
	rm -f YoMundo.class || true
	rm -rf build/
