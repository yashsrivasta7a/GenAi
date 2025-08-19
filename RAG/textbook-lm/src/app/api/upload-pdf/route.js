import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import fs from "fs";
import path from "path";
import "dotenv/config";

export const POST = async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf");

    if (!file) {
      return new Response(JSON.stringify({ error: "No PDF uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const tempPath = path.join(uploadsDir, file.name);
    fs.writeFileSync(tempPath, buffer);

    const loader = new PDFLoader(tempPath);
    const docs = await loader.load();

    const textsplitters = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const text = await textsplitters.splitDocuments(docs);

 const embeddings = new AzureOpenAIEmbeddings({
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY, 
  azureOpenAIApiInstanceName: "showfolio",
  azureOpenAIApiEmbeddingsDeploymentName: "text-embedding-3-large",
  azureOpenAIApiVersion: "2024-04-01-preview",
  maxRetries: 1,
});


    await QdrantVectorStore.fromDocuments(text, embeddings, {
      url: "http://localhost:6333",
      collectionName: "RAG-collection",
    });

    
    fs.unlinkSync(tempPath);


    return new Response(
      JSON.stringify({ message: "PDF processed successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
