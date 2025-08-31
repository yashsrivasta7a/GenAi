import "dotenv/config";
import { Agent, run, tool } from "@openai/agents";
import { z } from "zod";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import readline from "readline";

const SYSTEM_PROMPT = `
You are Autobrowse, an advanced web automation agent. Execute user tasks with precision.

Workflow:
1. Use open_web_page with target URL
2. Use get_dom_elements or get_page_html for page analysis  
3. For forms: ask user for ALL field values using ask_user, then fill with fill_input
4. Use click_element for buttons/links
5. Use take_screenshot to verify actions
6. Complete with task_complete

Form Protocol:
- Always ask for ALL form field values - never assume
- Use selectors: #1 id, #2 name, #3 composite
- Process fields sequentially
- Verify before submission
`;

const browser = await chromium.launch({
  headless: false,
  args: ["--disable-extensions", "--disable-file-system"],
});

let page = await browser.newPage();

const screenshotsDir = path.join(process.cwd(), "screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}
const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-");

const askUser = tool({
  name: "ask_user",
  description: "Ask the user for input",
  parameters: z.object({
    question: z.string().describe("Question to ask"),
  }),
  async execute({ question }) {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question(`${question} `, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  },
});

const openWebPage = tool({
  name: "open_web_page",
  description: "Open URL and detect form fields",
  parameters: z.object({
    url: z.string().describe("URL to open"),
  }),
  async execute({ url }) {
    try {
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      const fields = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("input, textarea, select"))
          .filter(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && 
                   style.display !== 'none' && style.visibility !== 'hidden';
          })
          .map(el => ({
            label: el.labels?.[0]?.innerText?.trim() || el.placeholder || el.name || el.id || el.type,
            type: el.type,
            id: el.id,
            name: el.name,
            selector: el.id ? `#${el.id}` : el.name ? `input[name="${el.name}"]` : `input[type="${el.type}"]`,
            placeholder: el.placeholder,
            required: el.required
          }));
      });

      const formPrompt = fields.length
        ? "Form fields:\n" + fields.map(f => `- ${f.label} (${f.type}) [${f.selector}]`).join("\n")
        : "No input fields detected.";

      return `Opened: ${normalizedUrl}\n\n${formPrompt}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
});

const getDomElements = tool({
  name: "get_dom_elements",
  description: "Get interactive elements",
  parameters: z.object({}),
  async execute() {
    try {
      const elements = await page.evaluate(() => {
        const interactive = [];
        document.querySelectorAll("a, button, input, textarea, [role='button'], [role='link']")
          .forEach((el, index) => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              interactive.push({
                text: (el.innerText || el.value || el.placeholder || "").trim(),
                selector: el.id ? `#${el.id}` : el.name ? `[name="${el.name}"]` : `[index="${index}"]`,
                type: el.type || el.tagName.toLowerCase()
              });
            }
          });
        return interactive;
      });
      
      return `Found ${elements.length} elements:\n` + 
             elements.map(el => `- ${el.text || el.type} (${el.selector})`).join('\n');
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
});

const clickElement = tool({
  name: "click_element",
  description: "Click element by text or selector",
  parameters: z.object({ 
    target: z.string().describe("Text or CSS selector")
  }),
  async execute({ target }) {
    try {
      let locator = page.getByRole("button", { name: new RegExp(target, "i") });
      if ((await locator.count()) > 0) {
        await locator.first().click();
        return `Clicked button: ${target}`;
      }
      
      locator = page.getByText(target, { exact: true });
      if ((await locator.count()) > 0) {
        await locator.first().click();
        return `Clicked text: ${target}`;
      }
      
      if (target.includes('#') || target.includes('.') || target.includes('[')) {
        locator = page.locator(target);
        if ((await locator.count()) > 0) {
          await locator.first().click();
          return `Clicked selector: ${target}`;
        }
      }
      
      return `No element found: ${target}`;
    } catch (err) {
      return `Error clicking: ${err.message}`;
    }
  },
});

const fillInput = tool({
  name: "fill_input",
  description: "Fill input field",
  parameters: z.object({
    selector: z.string().describe("CSS selector"),
    value: z.string().describe("Value to enter"),
  }),
  async execute({ selector, value }) {
    try {
      const locator = page.locator(selector);
      if ((await locator.count()) === 0) {
        return `No input found: ${selector}`;
      }
      
      await locator.first().clear();
      await locator.first().fill(value);
      return `Filled: ${selector}`;
    } catch (err) {
      return `Error filling: ${err.message}`;
    }
  },
});

const takeScreenshot = tool({
  name: "take_screenshot",
  description: "Take screenshot",
  parameters: z.object({
    filename: z.string().nullable().optional().describe("Optional filename"),
  }),
  async execute({ filename }) {
    try {
      let baseFilename = filename || `screenshot-${timestamp()}`;
      if (!baseFilename.endsWith(".png")) baseFilename += ".png";
      const filePath = path.join(screenshotsDir, baseFilename);
      await page.screenshot({ path: filePath, fullPage: true });
      return `Screenshot: ${filePath}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
});

const getPageHTML = tool({
  name: "get_page_html",
  description: "Get page HTML",
  parameters: z.object({}),
  async execute() {
    try {
      const html = await page.content();
      return html.length > 20000 ? html.slice(0, 20000) + "... [truncated]" : html;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
});

const taskComplete = tool({
  name: "task_complete",
  description: "Mark task complete",
  parameters: z.object({ 
    summary: z.string().describe("Summary")
  }),
  async execute({ summary }) {
    console.log(`\n✅ COMPLETED: ${summary}\n`);
    return `Complete: ${summary}`;
  },
});

async function directOpenWebPage(url) {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const fields = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("input[type='text'], input[type='password'], input[type='email'], textarea, select"))
        .filter(el => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && 
                 style.display !== 'none' && style.visibility !== 'hidden';
        })
        .map(el => ({
          label: el.labels?.[0]?.innerText?.trim() || el.placeholder || el.name || el.id || el.type,
          type: el.type,
          selector: el.id ? `#${el.id}` : el.name ? `input[name="${el.name}"]` : `input[type="${el.type}"]`,
          placeholder: el.placeholder,
          required: el.required
        }));
    });

    const formPrompt = fields.length
      ? "Form fields:\n" + fields.map(f => `- ${f.label} (${f.type})`).join("\n")
      : "No input fields.";

    return { success: true, message: `Opened: ${normalizedUrl}\n\n${formPrompt}`, fields };
  } catch (error) {
    return { success: false, message: `Error: ${error.message}`, fields: [] };
  }
}

async function directAskUser(question) {
  return new Promise((resolve) => {
    if (mainRl) mainRl.pause();
    const tempRl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    tempRl.question(`\n❓ ${question} `, (answer) => {
      tempRl.close();
      if (mainRl) mainRl.resume();
      resolve(answer.trim());
    });
  });
}

async function directFillInput(selector, value) {
  try {
    let locator = page.locator(selector);
    if ((await locator.count()) > 0) {
      await locator.first().fill(value);
      return `✅ Filled: ${selector}`;
    }
    
    const allInputs = page.locator('input[type="text"], input[type="password"], input[type="email"]');
    if ((await allInputs.count()) > 0) {
      await allInputs.first().fill(value);
      return `✅ Filled first input`;
    }
    
    return `❌ No input found: ${selector}`;
  } catch (err) {
    return `❌ Error: ${err.message}`;
  }
}

async function directClickElement(target) {
  try {
    let locator = page.getByRole("button", { name: new RegExp(target, "i") });
    if ((await locator.count()) > 0) {
      await locator.first().click();
      return `Clicked button: ${target}`;
    }
    
    locator = page.getByText(target, { exact: true });
    if ((await locator.count()) > 0) {
      await locator.first().click();
      return `Clicked text: ${target}`;
    }
    
    if (target.includes('#') || target.includes('.') || target.includes('[')) {
      locator = page.locator(target);
      if ((await locator.count()) > 0) {
        await locator.first().click();
        return `Clicked selector: ${target}`;
      }
    }
    
    return `No element found: ${target}`;
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

const websiteAutomationAgent = new Agent({
  name: "Website Automation Agent",
  instructions: SYSTEM_PROMPT,
  tools: [askUser, openWebPage, getDomElements, clickElement, fillInput, takeScreenshot, getPageHTML, taskComplete],
    model: "gpt-4o-mini" 
});

async function runAgentTask(task) {
  try {
    console.log(`\n🤖 Starting: ${task}\n`);
    
    if (task.startsWith('http')) {
      const openResult = await directOpenWebPage(task);
      console.log(openResult.message);
      
      if (!openResult.success) return;
      
      await page.screenshot({ path: path.join(screenshotsDir, `initial-${timestamp()}.png`) });
      
      if (openResult.fields?.length > 0) {
        console.log(`\n📝 Found ${openResult.fields.length} fields`);
        
        for (const field of openResult.fields) {
          let prompt = `Enter ${field.label}:`;
          if (field.type === 'password') prompt = `Enter password:`;
          else if (field.label.toLowerCase().includes('username')) prompt = `Enter username:`;
          else if (field.label.toLowerCase().includes('email')) prompt = `Enter email:`;
          
          const userInput = await directAskUser(prompt);
          if (userInput) {
            const result = await directFillInput(field.selector, userInput);
            console.log(result);
          }
        }
        
        await page.screenshot({ path: path.join(screenshotsDir, `filled-${timestamp()}.png`) });
        
        const submit = await directAskUser("Submit form? (yes/no):");
        if (submit.toLowerCase().includes('yes')) {
          const submitResult = await directClickElement("Submit");
          console.log(submitResult);
          await page.screenshot({ path: path.join(screenshotsDir, `final-${timestamp()}.png`) });
        }
      }
      return;
    }
    
    const result = await run(websiteAutomationAgent, task);
    console.log('\n📋', result.output_text || result.text || JSON.stringify(result));
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

let mainRl = null;

const main = async () => {
  console.log("🌐 Autobrowse Started");
  console.log("Type 'exit' to quit\n");
  
  mainRl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "TASK > ",
  });

  mainRl.prompt();

  mainRl.on("line", async (line) => {
    const task = line.trim();
    if (task.toLowerCase() === "exit") {
      console.log("👋 Exiting...");
      await browser.close();
      mainRl.close();
      process.exit(0);
    }
    if (task) await runAgentTask(task);
    mainRl.prompt();
  }).on("close", async () => {
    await browser.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log("\n👋 Exiting...");
    await browser.close();
    process.exit(0);
  });
};

main().catch(console.error);