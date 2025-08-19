import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { AzureChatOpenAI } from "@langchain/openai"; // Fixed import
import { QdrantVectorStore } from "@langchain/qdrant";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import "dotenv/config";

export const POST = async (req) => {
  try {
    const { userQuery } = await req.json();

    const embeddings = new AzureOpenAIEmbeddings({
      azureOpenAIApiKey: process.env.KEY,
      azureOpenAIApiInstanceName: process.env.INSTANCE_NAME,
      azureOpenAIApiEmbeddingsDeploymentName: "text-embedding-3-large",
      azureOpenAIApiVersion: "2024-04-01-preview",
      maxRetries: 1,
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: "http://localhost:6333",
        collectionName: "RAG-collection",
      }
    );

    const vectorSearch = vectorStore.asRetriever({ k: 3 });

    const relevantDocs = await vectorSearch.invoke(userQuery);

    const chat = new AzureChatOpenAI({
      azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY, 
      azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
      azureOpenAIApiDeploymentName:"gpt-4.1",
      azureOpenAIApiVersion:"2024-04-01-preview"
    });

    const contextText = relevantDocs
      .map(
        (doc) => `Page ${doc.metadata?.page || "Unknown"}: ${doc.pageContent}`
      )
      .join("\n\n");

    const systemPrompt = `You are an AI assistant. Answer the user's question using the context from the website, PDF, or text.

Guidelines:
1. Only use information available in the provided context. Do not assume or fabricate information.
2. Be concise, clear, and informative.
3. If the answer cannot be found in the context, politely say: "The information is not available in the provided documents."
4. Provide a direct answer without step-by-step reasoning.
5. Don't give long answers - keep them focused and relevant.

Context:
${contextText}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userQuery),
    ];

    const response = await chat.invoke(messages);
    console.log("LLM Response:", response.content);

   
    const sources = relevantDocs.map((doc) => {
      const metadata = doc.metadata || {};
      let sourceUrl = metadata.url || metadata.source;
      
    
      if (sourceUrl && !sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
        
        sourceUrl = null; 
      }
      
      return {
        page: metadata.page || "Unknown",
        title: metadata.title || metadata.filename || `Page ${metadata.page || "Unknown"}`,
        url: sourceUrl,
        content: doc.pageContent.substring(0, 200) + "...",
      };
    });

    return new Response(
      JSON.stringify({
        response: response.content.trim(),
        message: response.content.trim(),
        sources: sources,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("API Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};