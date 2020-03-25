# Load credentials and config into environment (see example.env for details).
include .env
export $(shell sed 's/=.*//' .env)

BUILD_VERSION        := $(shell git describe --tags --always --dirty="-dev")
BUILD_TIME           := $(shell date -u '+%Y-%m-%d-%H_%M_%S UTC')
export BUILD_VERSION
export BUILD_TIME

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

build/coverage/lcov-report/index.html: workers/*.ts lib/*.ts ; npm test

build/compiled/workers/crawl_worker.js: workers/crawl_worker.ts ; npm run tsc
build/bundles/crawl_worker.js: build/compiled/workers/crawl_worker.js ; npm run rollup

.PHONY: deploy
deploy: test build/bundles/crawl_worker.js ; npm run deploy

.PHONY: clean
clean:
	rm -f scratch/YoMundo.class || true
	rm -rf build/
