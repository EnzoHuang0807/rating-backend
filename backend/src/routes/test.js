
const fetch = async (name) => {
    let link = concat("https://www.ptt.cc/bbs/NTUcourse/search?q=", name);

    console.log(link);

    (async() => {
      const puppeteer = require('puppeteer');
  
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
  
      await page.goto(link);
      await page.waitForSelector('#topbar-container', {visible: true})
      let bodyHTML = await page.content();
      console.log(bodyHTML);
      browser.close();
    })();
};

export default fetch;

