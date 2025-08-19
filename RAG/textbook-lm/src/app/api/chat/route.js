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

    const systemPrompt = `You are an AI assistant. Answer the user's question in natural human language forming sentence using the context provided from PDF documents.

Guidelines:
1. Only use the information available in the provided context. Do not assume or fabricate information.
2. If the context contains page numbers, include them in your answer where relevant.
3. Be concise, clear, and informative.
4. If the answer cannot be found in the context, politely say: "The information is not available in the provided documents."

Context: 
${contextText}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userQuery),
    ];

    const response = await chat.invoke(messages);
    console.log(response.content);

    return new Response(
      JSON.stringify({
        response: response.content,
        message: response.content,
        sources: relevantDocs.map((doc) => ({
          page: doc.metadata?.page || "Unknown",
          content: doc.pageContent.substring(0, 200) + "...",
        })),
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
