import "dotenv/config";
import { chromium } from "playwright";
import { Agent, run, tool } from "@openai/agents";
import { date, z } from "zod";
import { time } from "console";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const browser = await chromium.launch({
  headless: false,
  chromiumSandbox: true,
  env: {},
  args: ["--disable-extensions", "--disable-file-system"],
});

const page = await browser.newPage();

const takeScreenshot = tool({
  name: "takeScreenshot",
  description: "Takes a screenshot of the screen and processes it",
  parameters: z.object({}),
  async execute() {
    const time = new Date();
    const hours = time.getHours();
    const min = time.getMinutes();
    const filePath = `./screenshots/${hours}.${min}.png`;
    const imgbuffer = await page.screenshot({
      path: filePath,
      fullPage: true,
    });

    const base64 = imgbuffer.toString("base64");
    return {
      filePath,
      base64,
      byteSize: imgbuffer.length,
      base64Length: base64.length,
    };
  },
});

const visitUrl = tool({
  name: "visitUrl",
  description: "Visit the given URL in the browser",
  parameters: z.object({
    url: z.string().describe("URL to visit")
  }),
  async execute({ url }) {
    await page.goto(url);
    return `Visited ${url}`;
  },
});

const clickOnScreen = tool({
  name: 'clickScreen',
  description: 'Clicks on the screen with specified co-ordinates',
  parameters: z.object({
    x: z.number().describe('x axis on the screen where we need to click'),
    y: z.number().describe('Y axis on the screen where we need to click'),
  }),
  async execute({ x, y }) {
    await page.mouse.click(x, y);
    return `Clicked at (${x}, ${y})`;
  },
});

const what = tool({
  name:'what',
  description:'takes up the questions whenever needed to ask the user to fulfill his demand',
  parameters: z.object({
    question: z.string().describe("The question to ask the user")
  }),
  async execute({ question }) {
    return await new Promise((resolve) => {
      rl.question(`${question}: `, (answer) => resolve(answer));
    });
  }
})

const userDetails = tool({
  name: 'userDetail',
  description: 'Takes up the user detail whenever needed',
  parameters: z.object({
    question: z.string()
  }),

  async execute({ question }) {
    const answer = await what.execute({ question });
    return answer;
  }
});

const sendKeys = tool({
  name: 'send_keys',
  description: 'Fill form data according to user input',
  parameters: z.object({
    selector: z.string(),
    value: z.string()
  }),
  async execute({ selector, value }) {
    const element = await page.$(selector);
    if (element) {
      await element.type(value);
      return `Typed '${value}' in '${selector}'`;
    } else {
      return `Element '${selector}' not found`;
    }
  }
});

const webAgent = new Agent({
  name: 'WebSite Automation Agent',
  instructions: `
  You are Auto Browse, an expert AI assistant for automating website interactions.

  Workflow Rules:
  1. First, always ask the user which site they want to visit by calling the 'what' tool with a question like "Which website do you want to visit?".
  2. After receiving the answer, immediately call 'visitUrl' with the provided URL.
  3. Once the page is loaded, always call the 'takeScreenshot' tool to capture the screen.
  4. Detect all visible input fields (e.g., username, email, password, search boxes).
  5. For each input field:
     - Call 'userDetails' to ask the user for the required value.
     - Click on the field (using 'clickOnScreen' or selector).
     - Call 'sendKeys' to fill the value into that field.
     - Take a screenshot after filling each field.
  6. After all fields are filled, identify the submit/login/search button and click it.
  7. Take a final screenshot after submission.
  8. Continue assisting step by step until the process is complete.
  `,
  model: 'gpt-4o-mini',
  tools: [visitUrl, takeScreenshot, clickOnScreen, userDetails, sendKeys, what]
});

const result = await run(
  webAgent,
  'Help me automate the process',
);
console.log(result.finalOutput);
