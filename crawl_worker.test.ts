import {listHtmlLinks} from "./crawl_worker";

const expectedBaseUrl = new URL("http://example.com/ducks");
const expected = [
    "http://flkrs.com/",
    "http://example.com/go/quack",
]
const testHtml = `
<a href="${expected[0]}"></a>
<a anothertag="nothing" href="${new URL(expected[1]).pathname}"/>`
test("hello test", () => {
    let index = 0;
    for (const link of listHtmlLinks(testHtml, expectedBaseUrl)) {
        expect(link).toEqual(expected[index++]);
    }
})