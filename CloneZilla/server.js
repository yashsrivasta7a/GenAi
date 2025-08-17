import express from 'express'
import 'dotenv/config'
import cors from 'cors'
import { AzureOpenAI } from "openai/azure.js";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import axios from "axios";
import {SYSTEM_PROMPT} from './SYSTEM_PROMPT.js'

const app = express();
app.use(cors());
app.use(express.json());

const client = new AzureOpenAI();

async function readFile(path) {
  return fs.readFileSync(path, "utf-8");
}

async function deleteFile(filePath) {
  fs.unlinkSync(filePath);
  return `File deleted at ${filePath}`;
}

async function appendFile({ path: filePath, content }) {
  fs.appendFileSync(filePath, content, "utf-8");
  return `Content appended to ${filePath}`;
}

async function listFile(dirPath) {
  return fs.readdirSync(dirPath);
}

async function createFile({ path: filePath, content }) {
  fs.writeFileSync(filePath, content, "utf-8");
  return `File created at ${filePath}`;
}


async function createFolder(folderName) {
  const fullPath = path.join("./clone", folderName); 
  fs.mkdirSync(fullPath, { recursive: true });
  return `Folder '${folderName}' has been successfully created in ./clone`;
}

async function deleteFolder(folderPath) {
  fs.rmSync(folderPath, { recursive: true, force: true });
  return `Folder deleted at ${folderPath}`;
}

async function fileExists(filePath) {
  return fs.existsSync(filePath);
}

async function createDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return `Directory created at ${dirPath}`;
}

async function fetchWebsite({ url, savePath }) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  let html = await page.content();

  const cssFolder = path.join(savePath, "assets/css");
  const jsFolder = path.join(savePath, "assets/js");
  const imgFolder = path.join(savePath, "assets/img");
  fs.mkdirSync(cssFolder, { recursive: true });
  fs.mkdirSync(jsFolder, { recursive: true });
  fs.mkdirSync(imgFolder, { recursive: true });

  const baseURL = new URL(url).origin;

  const cssLinks = await page.$$eval('link[rel="stylesheet"]', (links) =>
    links.map((l) => l.getAttribute("href"))
  );
  for (const href of cssLinks) {
    try {
      const fullUrl = new URL(href, baseURL).href;
      const res = await axios.get(fullUrl);
      const fileName = path.basename(href.split("?")[0]);
      fs.writeFileSync(path.join(cssFolder, fileName), res.data, "utf-8");
      html = html.replace(new RegExp(href, "g"), `./assets/css/${fileName}`);
    } catch (e) {
      console.log(`Failed CSS: ${href}`);
    }
  }

  const jsLinks = await page.$$eval("script[src]", (scripts) =>
    scripts.map((s) => s.getAttribute("src"))
  );
  for (const src of jsLinks) {
    try {
      const fullUrl = new URL(src, baseURL).href;
      const res = await axios.get(fullUrl);
      const fileName = path.basename(src.split("?")[0]);
      fs.writeFileSync(path.join(jsFolder, fileName), res.data, "utf-8");
      html = html.replace(new RegExp(src, "g"), `./assets/js/${fileName}`);
    } catch (e) {
      console.log(`Failed JS: ${src}`);
    }
  }

  // FIXED IMAGE EXTRACTION PART
  const imageUrls = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    const urls = new Set(); // Use Set to avoid duplicates
    
    // Function to decode URL and extract actual image path
    function processImageUrl(url) {
      if (!url) return null;
      
      // Handle Next.js image optimization URLs
      if (url.includes('/_next/image?url=')) {
        try {
          const urlObj = new URL(url, window.location.origin);
          const imageParam = urlObj.searchParams.get('url');
          if (imageParam) {
            return decodeURIComponent(imageParam);
          }
        } catch (e) {
          console.log('Error processing Next.js image URL:', url);
        }
      }
      
      return url;
    }
    
    imgs.forEach((img) => {
      // Get src attribute
      const src = img.getAttribute("src") || img.src;
      const processedSrc = processImageUrl(src);
      if (processedSrc) urls.add(processedSrc);
      
      // Get data-src attribute (for lazy loading)
      const dataSrc = img.getAttribute("data-src");
      const processedDataSrc = processImageUrl(dataSrc);
      if (processedDataSrc) urls.add(processedDataSrc);
      
      // Get srcset attribute and extract all URLs
      const srcset = img.getAttribute("srcset");
      if (srcset) {
        // Parse srcset: "url1 1x, url2 2x" or "url1 640w, url2 1080w"
        const srcsetUrls = srcset
          .split(',')
          .map(entry => {
            const url = entry.trim().split(/\s+/)[0]; // Get URL part before size descriptor
            return processImageUrl(url);
          })
          .filter(url => url && url.length > 0);
        
        srcsetUrls.forEach(url => urls.add(url));
      }
      
      // Check for other common lazy loading attributes
      const dataSrcset = img.getAttribute("data-srcset");
      if (dataSrcset) {
        const dataSrcsetUrls = dataSrcset
          .split(',')
          .map(entry => {
            const url = entry.trim().split(/\s+/)[0];
            return processImageUrl(url);
          })
          .filter(url => url && url.length > 0);
        
        dataSrcsetUrls.forEach(url => urls.add(url));
      }
    });
    
    return Array.from(urls).filter(Boolean);
  });

  // Also check for CSS background images
  const backgroundImageUrls = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    const urls = new Set();
    
    elements.forEach(el => {
      const style = window.getComputedStyle(el);
      const bgImage = style.backgroundImage;
      
      if (bgImage && bgImage !== 'none') {
        // Extract URL from url("...") or url('...')
        const matches = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/g);
        if (matches) {
          matches.forEach(match => {
            const url = match.replace(/url\(['"]?|['"]?\)/g, '');
            if (url) urls.add(url);
          });
        }
      }
    });
    
    return Array.from(urls);
  });

  // Combine all image URLs
  const allImageUrls = [...imageUrls, ...backgroundImageUrls];

  // Get original URLs before processing (for HTML replacement)
  const originalImageUrls = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    const urls = new Set();
    
    imgs.forEach((img) => {
      // Get all original URLs from HTML
      const src = img.getAttribute("src") || img.src;
      if (src) urls.add(src);
      
      const dataSrc = img.getAttribute("data-src");
      if (dataSrc) urls.add(dataSrc);
      
      const srcset = img.getAttribute("srcset");
      if (srcset) {
        const srcsetUrls = srcset
          .split(',')
          .map(entry => entry.trim().split(/\s+/)[0])
          .filter(url => url && url.length > 0);
        srcsetUrls.forEach(url => urls.add(url));
      }
      
      const dataSrcset = img.getAttribute("data-srcset");
      if (dataSrcset) {
        const dataSrcsetUrls = dataSrcset
          .split(',')
          .map(entry => entry.trim().split(/\s+/)[0])
          .filter(url => url && url.length > 0);
        dataSrcsetUrls.forEach(url => urls.add(url));
      }
    });
    
    return Array.from(urls).filter(Boolean);
  });

  // Scroll page to load lazy images
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });

  // Create mapping of processed URL to original URL
  const urlMapping = new Map();
  
  for (let i = 0; i < allImageUrls.length; i++) {
    try {
      const processedUrl = allImageUrls[i];
      const imgUrl = new URL(processedUrl, baseURL).href;
      const res = await axios.get(imgUrl, { responseType: "arraybuffer" });
      
      // Detect file extension
      let extension = path.extname(processedUrl.split("?")[0]);
      if (!extension) {
        const contentType = res.headers["content-type"];
        if (contentType === "image/png") extension = ".png";
        else if (contentType === "image/jpeg") extension = ".jpg";
        else if (contentType === "image/gif") extension = ".gif";
        else if (contentType === "image/webp") extension = ".webp";
        else extension = ".png";
      }

      const fileName = `${path.basename(
        processedUrl.split("?")[0] || "image"
      )}${extension}`;
      fs.writeFileSync(path.join(imgFolder, fileName), res.data);
      
      // Map processed URL to local file path
      urlMapping.set(processedUrl, `./assets/img/${fileName}`);
      
    } catch (e) {
      console.log(`Failed image: ${allImageUrls[i]}`);
    }
  }

  // Replace original URLs in HTML with local paths
  for (const originalUrl of originalImageUrls) {
    try {
      // Find the processed version of this URL
      let processedUrl = originalUrl;
      
      // Handle Next.js URLs
      if (originalUrl.includes('/_next/image?url=')) {
        const urlObj = new URL(originalUrl, baseURL);
        const imageParam = urlObj.searchParams.get('url');
        if (imageParam) {
          processedUrl = decodeURIComponent(imageParam);
        }
      }
      
      // Replace in HTML if we have a local version
      if (urlMapping.has(processedUrl)) {
        // Handle both encoded and non-encoded versions
        const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const encodedUrl = originalUrl.replace(/&/g, '&amp;').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Replace both versions
        html = html.replace(new RegExp(escapedUrl, 'g'), urlMapping.get(processedUrl));
        html = html.replace(new RegExp(encodedUrl, 'g'), urlMapping.get(processedUrl));
        
        // Also handle the case where URL might be partially encoded
        if (originalUrl !== originalUrl.replace(/&/g, '&amp;')) {
          const partiallyEncoded = originalUrl.replace(/&/g, '&amp;');
          const escapedPartial = partiallyEncoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          html = html.replace(new RegExp(escapedPartial, 'g'), urlMapping.get(processedUrl));
        }
      }
    } catch (e) {
      console.log(`Failed to replace URL: ${originalUrl}`);
    }
  }

  // Additional fix: Replace any remaining Next.js image URLs that might have been missed
  html = html.replace(/\/_next\/image\?url=([^&\s"']+)([^"'\s]*)/g, (match, encodedPath, params) => {
    try {
      const decodedPath = decodeURIComponent(encodedPath);
      if (urlMapping.has(decodedPath)) {
        return urlMapping.get(decodedPath);
      }
      return match;
    } catch (e) {
      return match;
    }
  });

  fs.writeFileSync(path.join(savePath, "index.html"), html, "utf-8");
  await browser.close();
  return `Website saved to ${savePath} with assets`;
}

const TOOL_MAP = {
  createFile,
  fetchWebsite,
  readFile,
  appendFile,
  deleteFile,
  listFile,
  fileExists,
  createDir,
  createFolder,
  deleteFolder,
};


app.get("/", async (req, res) => {
   const userInput = req.query.input;
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userInput },
  ];

  while (true) {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
    });

    const rawContent = response.choices[0].message.content;

    let parsedContent;
    try {
      parsedContent = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse:", rawContent);
      break;
    }

    messages.push({
      role: "assistant",
      content: JSON.stringify(parsedContent),
    });

    if (parsedContent.step === "START") {
      console.log(`🔥`, parsedContent.content);
      continue;
    }

    if (parsedContent.step === "THINK") {
      console.log(`🧠`, parsedContent.content);
      continue;
    }

    if (parsedContent.step === "TOOL") {
      const useTool = parsedContent.tool_name;
      if (!TOOL_MAP[useTool]) {
        messages.push({
          role: "user",
          content: `There is no such tool as ${useTool}`,
        });
        continue;
      }

      const responseTool = await TOOL_MAP[useTool](parsedContent.input);
      console.log(`🛠️: ${useTool}(${parsedContent.input}) = `, responseTool);

      messages.push({
        role: "user",
        content: JSON.stringify({ step: "OBSERVE", content: responseTool }),
      });
      continue;
    }

    if (parsedContent.step === "OUTPUT") {
      console.log(`🤖`, parsedContent.content);
      return res.send(parsedContent.content);
    }
  }

  res.send("Reached max iterations without OUTPUT");
});

app.listen(3000);