import "dotenv/config";
import { AzureOpenAI } from "openai/azure.js";

const client = new AzureOpenAI();

async function main() {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user", content:"How are you"
      },
    ],
  });
console.log(response.choices[0].message.role);
}
main();