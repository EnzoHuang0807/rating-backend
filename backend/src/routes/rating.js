import { Router } from "express";
const puppeteer = require('puppeteer');
const router = Router();

router.get("/searchPtt", async (req, res) => {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    let url = 
    `https://www.ptt.cc/bbs/NTUcourse/search?q=${req.query.key}&page=${req.query.pageNum}`;
    await page.goto(url);

    // Check if result exists
    try{
        await page.waitForSelector('.r-ent', {visible: true, timeout: 500})
    } catch (e) {
        res.json({result: []});
        return;
    }
    
    // Number of page
    const pageNum = await page.evaluate(() => {
        const tmp = Array.from(document.querySelectorAll("a[href]"));
        const str = tmp.filter(e => e.textContent === '最舊')
            .map(e => e.getAttribute('href'))[0];

        return parseInt(str.slice(
            str.indexOf('=') + 1, 
            str.lastIndexOf('&')));
    });

    //Find result of specified page
    let result = await page.evaluate(() => {
        let tmp = Array.from(document.querySelectorAll("a[href]"));
        return tmp.filter(e => e.textContent.includes('[評價]') || e.textContent.includes('[通識]'))
            .map(e => ({ 
                title: e.textContent, 
                id: e.getAttribute('href').slice(
                    e.getAttribute('href').lastIndexOf('/') + 1, 
                    e.getAttribute('href').lastIndexOf('.'))}));
    });

    browser.close();
    console.log(result);
    res.json({pageNum, result});
});

router.get("/detailPtt", async (req, res) => {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    let url = `https://www.ptt.cc/bbs/NTUcourse/${req.query.id}.html`;
    await page.goto(url);

    // Check if result exists
    try{
        await page.waitForSelector('#main-content', {visible: true, timeout: 500})
    } catch (e) {
        res.json({result: []});
        return;
    }

    //Find result of specified page
    let result = await page.evaluate(() => {
        let tmp = Array.from(document.querySelectorAll("#main-content"))[0];
        return tmp.textContent;
    });

    let data = {url};
    let array = result.split("標題");
    data.title = array[array.length - 1].split("時間")[0].trim();
    array = result.split("哪一學年度修課：");

    for (let i = 0; i < 5; i++){
        
        if (i === 0){
            array = array[array.length - 1].split("ψ 授課教師 (若為多人合授請寫開課教師，以方便收錄)");
            data.year = array[0].trim();
        }
        if (i === 1){
            array = array[array.length - 1].split("λ 開課系所與授課對象 (是否為必修或通識課 / 內容是否與某些背景相關)");
            data.teacher = array[0].trim();
        }
        if (i === 2){
            array = array[array.length - 1].split("δ 課程大概內容");
            data.classification = array[0].trim();
        }
        if (i === 3){
            array = array[array.length - 1].split("Ω 私心推薦指數(以五分計) ★★★★★");
            data.description = array[0].trim();
        }
        if (i === 4){
            array = array[array.length - 1].split("η 上課用書(影印講義或是指定教科書)");
            data.rating = array[0].trim();
        }
    }

    browser.close();
    console.log(data);
    res.json({result: data});
});

router.get("/searchRating", async (req, res) => {

    if(req.query.key === "")
        return;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "language", {
            get: function() {
                return "zh-TW";
            }
        });
        Object.defineProperty(navigator, "languages", {
            get: function() {
                return ["zh-TW", "zh"];
            }
        });
    });

    let url = `https://rating.myntu.me/search/${req.query.pageNum -1}?courseName=${req.query.key}`; 
    console.log(url);
    await page.goto(url);

    try{
        await page.waitForSelector('#courseName', {visible: true, timeout: 10000})
    } catch (e) {
        console.log("timeout")
        res.json({result: []}); 
        return;
    }

    let courseName = await page.evaluate(() => {
        let result = Array.from(document.querySelectorAll("#courseName"));
        return result.map(e => (e.textContent));
    });

    let teacher = await page.evaluate(() => {
        let result = Array.from(document.querySelectorAll(".jss34"));
        return result.map(e => (e.textContent).slice(
            0, e.textContent.indexOf(' ')));
    });

    let link = await page.evaluate(() => {
        let tmp = Array.from(document.querySelectorAll("a[href]"));
        return tmp.map(e => (e.getAttribute('href')));
    });
    
    let label = await page.evaluate(() => {
        let tmp = Array.from(document.querySelectorAll(".jss46"));
        return tmp.map(e => (e.textContent));
    });

    let result = [];
    for (let i = 0; i < courseName.length; i++)
        result.push({
            title: courseName[i] + " " + teacher[i],
            link: "https://rating.myntu.me" + link[i + 4],
            rating: { 
                quality: label[i * 4], 
                easyA: label[i * 4 + 1], 
                freedom: label[i * 4 + 2], 
                workload: label[i * 4 + 3], 
            }
        });

    console.log(result);

    browser.close();
    res.json({pageNum: 0, result}); 
});

export default router;