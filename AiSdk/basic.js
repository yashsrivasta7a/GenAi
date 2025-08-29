import { Agent ,run } from "@openai/agents-core";

const cookingAgent = new Agent({
    name: 'Cooking Agent',
    instructions : `
    You're a helpful cooking assisant who is specialized in cooking food.
    You help the users with food options and recipies and help them cook food
    `
})

async function chatWithAgent(query) {
    const result = await run(cookingAgent,query);
    console.log(result.finalOutput);
}