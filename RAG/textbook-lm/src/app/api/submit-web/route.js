import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import "dotenv/config";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

export const POST = async (req) => {
  try {
    const { webContent } = await req.json();
    const loader = new CheerioWebBaseLoader(
      webContent, {
      selector: "body", // ✅ only grab visible body text, not scripts/styles
    });

    if (!webContent || !webContent.trim()) {
      return new Response(JSON.stringify({ error: "No link provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const docs = await loader.load();

    const textsplitters = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    console.log(`docs milgye ${docs[0]}`);

    const splitDocs = await textsplitters.splitDocuments(docs);

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
