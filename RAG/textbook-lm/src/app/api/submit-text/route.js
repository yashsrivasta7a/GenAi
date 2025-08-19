import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import "dotenv/config";

export const POST = async (req) => {
  try {
    const { textContent } = await req.json();

    if (!textContent || !textContent.trim()) {
      return new Response(JSON.stringify({ error: "No text content provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const doc = new Document({
      pageContent: textContent,
      metadata: { source: "user_input", page: 1 }
    });

    const textsplitters = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splitDocs = await textsplitters.splitDocuments([doc]);

    const embeddings = new AzureOpenAIEmbeddings({
      azureOpenAIApiKey: process.env.KEY,
      azureOpenAIApiInstanceName: process.env.INSTANCE_NAME,
      azureOpenAIApiEmbeddingsDeploymentName: "text-embedding-3-large",
      azureOpenAIApiVersion: "2024-04-01-preview",
      maxRetries: 1,
    });

    await QdrantVectorStore.fromDocuments(splitDocs, embeddings, {
      url: "http://localhost:6333",
      collectionName: "RAG-collection",
    });

    return new Response(
      JSON.stringify({ message: "Text content processed successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Text processing error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
