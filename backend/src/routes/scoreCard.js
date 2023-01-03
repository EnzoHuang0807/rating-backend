import { Router } from "express";
import ScoreCard from "../models/ScoreCard";
const puppeteer = require('puppeteer');

import db from "../db"
const router = Router();

const saveScoreCard = async (name, subject, score) => {
    const existing = await ScoreCard.findOne({ name : name, subject: subject });

    if (existing){
        try{
            await ScoreCard.updateOne({ name : name, subject: subject }, 
                {$set: {score : score}});
            console.log("Updated ScoreCard");
            return `Updating (${name}, ${subject}, ${score})`;
        } catch (e) {return "ScoreCard update error" + e}
    }
    else{
        try{
            const newCard = new ScoreCard({ name, subject, score });
            console.log("Created new ScoreCard", newCard);
            newCard.save();
            return `Adding (${name}, ${subject}, ${score})`;
        } catch (e) {return "ScoreCard creation error" + e}
    }
};

const deleteDB = async () => {
    try{
        await ScoreCard.deleteMany({});
        console.log("Database deleted");
    } catch (e) {throw new Error("Database deletion failed");}
};

const queryDB = async (type, string) => {
    try{
        if (type == "name")
            return await ScoreCard.find({ name : string});
        else
            return await ScoreCard.find({ subject : string});
    } catch (e) {return "ScoreCard query error" + e}
};

db.connect();

router.delete("/cards", async (_, res) => {
    await deleteDB();
    res.json({message: "Database cleared"})
});

router.post("/card", async (req, res) => {
    let msg = await saveScoreCard(req.body.name, req.body.subject, req.body.score);
    if (msg[0] == "S")
        res.json({message: msg, card: false});
    else
        res.json({message: msg, card: true});
});


router.get("/cards", async (req, res) => {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    let reviews = [];

    let url = `https://www.ptt.cc/bbs/NTUcourse/search?q=${req.query.queryString}`;
    await page.goto(url);

    // Check if result exists
    try{
        await page.waitForSelector('.r-ent', {visible: true, timeout: 500})
    } catch (e) {
        res.json({message: "Can't find result"});
        return;
    }
 
    const pages = await page.evaluate(() => {
        const result = Array.from(document.querySelectorAll("a[href]"));
        const str = result.filter(e => e.textContent === '最舊')
            .map(e => e.getAttribute('href'))[0];

        return parseInt(str.slice(
            str.indexOf('=') + 1, 
            str.lastIndexOf('&')));
    });

    //Traverse all pages
    url = `https://www.ptt.cc/bbs/NTUcourse/search?q=${req.query.queryString}&page=${req.query.pageNum}`;
    console.log(url);
    await page.goto(url);
    await page.waitForSelector('.r-ent', {visible: true});

    let tmp = await page.evaluate(() => {
        let result = Array.from(document.querySelectorAll("a[href]"));
        return result.filter(e => e.textContent.includes('[評價]') || e.textContent.includes('[通識]'))
            .map(e => ({ title: e.textContent, link: e.getAttribute('href')}));
    });
    reviews = [...reviews, ...tmp];

    browser.close();
    console.log(reviews);
    res.json({pageNum: pages, result: reviews});
});

router.get("/card", async (req, res) => {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    let reviews = [];

    let url = `https://rating.myntu.me/search/0?courseName=${req.query.queryString}`; 
    console.log(url);
/*
    // Check if result exists
    try{
        await page.waitForSelector('.MuiCardHeader-root', {visible: true, timeout: 5000})
    } catch (e) {
        res.json({message: "Can't find result"}); 
        return;
    }*/
 /*
    const pages = await page.evaluate(() => {
        const result = Array.from(document.querySelectorAll("a[href]"));
        const str = result.filter(e => e.textContent === '最舊')
            .map(e => e.getAttribute('href'))[0];

        return parseInt(str.slice(
            str.indexOf('=') + 1, 
            str.lastIndexOf('&')));
    });
*/
    //Traverse all pages
    //for (let i = 1; i <= pages; i++){
        //let url = `https://www.ptt.cc/bbs/NTUcourse/search?q=${req.query.queryString}&page=${i}`;
        //console.log(url); 
        await page.goto(url);
        try{
            await page.waitForSelector('#courseName', {visible: true, timeout: 5000})
        } catch (e) {
            res.json({message: "Can't find result"}); 
            return;
        }

        let tmp = await page.evaluate(() => {
            let result = Array.from(document.querySelectorAll("a[href]"));
            return result.map(e => ({ title: e.textContent, link: e.getAttribute('href')}));
        });
        console.log(tmp);
    //}

    browser.close();
    //console.log(reviews);
    res.json({message: "Success"});  
});


export default router;