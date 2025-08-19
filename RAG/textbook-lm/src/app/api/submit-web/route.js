import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import "dotenv/config";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

export const POST = async (req) => {
  try {
    const { webContent } = await req.json();

    if (!webContent || !webContent.trim()) {
      return new Response(
        JSON.stringify({ error: "No link provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    const formattedUrl = webContent.startsWith("http")
      ? webContent
      : `https://${webContent}`;

    const loader = new CheerioWebBaseLoader(formattedUrl, { selector: "body" });
    const docs = await loader.load();

    if (!docs || docs.length === 0) {
      throw new Error("No content found on the page");
    }

    const enhancedDocs = docs.map((doc) => ({
      pageContent: doc.pageContent,
      metadata: {
        ...doc.metadata,
        source: formattedUrl,
        title: doc.metadata.title || "", 
        description: doc.metadata.description || "",
      },
    }));

    const textsplitters = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splitDocs = await textsplitters.splitDocuments(enhancedDocs);

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
      JSON.stringify({ message: "Website text and metadata processed successfully" }),
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
