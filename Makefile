.DEFAULT: all
.PHONY: all
all: YoMundo.class

YoMundo.class: crawl.java ; javac -cp "jedis-2.4.2.jar"  crawl.java

.PHONY: java
java: YoMundo.class ; java -cp ".:jedis-2.4.2.jar" YoMundo

.PHONY: node
node: crawl.js ; ./crawl.js

.PHONY: python
python: crawl.py ; ./crawl.py

.PHONY: clean
clean:
	rm -f YoMundo.class || true
