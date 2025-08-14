import "dotenv/config";
import { AzureOpenAI } from "openai/azure.js";
import {system_prompt} from "./system_prompt.js"
import express from "express";
import cors from "cors";
import {system_prompt_piyush} from './system_prompt_piyush.js'

const app = express();

app.use(cors());
app.use(express.json());

const client = new AzureOpenAI();

let hitesh_history = [
  { role: "system", content: system_prompt }
];

let piyush_history = [
  { role: "system", content: system_prompt_piyush }
];
app.post('/chat/hitesh',async (req,res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) {
      return res.status(400).json({ error: "Message is required" });
    }
    hitesh_history.push({role:"user" , content:userMessage});
    const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: hitesh_history,
  });

  const botReply = response.choices[0].message.content;
  hitesh_history.push({ role: "assistant", content: botReply });
  res.json({ reply: botReply });
  } catch (error) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
})

app.post('/chat/piyush',async (req,res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) {
      return res.status(400).json({ error: "Message is required" });
    }
    piyush_history.push({role:"user" , content:userMessage});
    const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: piyush_history,
  });

  const botReply = response.choices[0].message.content;
  piyush_history.push({ role: "assistant", content: botReply });
  res.json({ reply: botReply });
  } catch (error) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
})



app.post('/clear', (req, res) => {
  const { persona } = req.body;
  
  if (persona === 'hitesh') {
    hitesh_history = [{ role: "system", content: system_prompt }];
    console.log("Hitesh conversation cleared");
  } else if (persona === 'piyush') {
    piyush_history = [{ role: "system", content: system_prompt_piyush }];
    console.log("Piyush conversation cleared");
  } else {
      hitesh_history = [{ role: "system", content: system_prompt }];
    piyush_history = [{ role: "system", content: system_prompt_piyush }];
    console.log("All conversations cleared");
  }
  
  res.json({ message: "Conversation cleared" });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Persona bot backend running on port ${PORT}`));



