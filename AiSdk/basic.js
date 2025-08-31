import { Agent, run } from "@openai/agents";
import 'dotenv/config'

const cookingAgent = new Agent({
    name: 'Cooking Agent',
    instructions: `
    You're a helpful cooking assistant who is specialized in cooking food.
    You help the users with food options and recipes and help them cook food.
    `,
    model: "gpt-4o-mini" 
});

async function chatWithAgent(query) {
    const result = await run(cookingAgent, query);
    console.log(result.finalOutput);
}

chatWithAgent('I want to cook dahi bhalle');
