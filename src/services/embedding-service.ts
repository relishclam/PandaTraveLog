import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI, TaskType, Content } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';

// Define a specific type for our metadata
export type PandaTraveLogMetadata = {
  originalText: string;
  type: string;
  city?: string;
  country?: string;
};

// Initialize Pinecone
const pineconeApiKey = process.env.PINECONE_API_KEY;
if (!pineconeApiKey) {
  throw new Error('PINECONE_API_KEY is not set in environment variables');
}
const pinecone = new Pinecone({ apiKey: pineconeApiKey });
const indexName = process.env.PINECONE_INDEX_NAME || 'pandatravelog-embeddings';
const pineconeIndex = pinecone.index<PandaTraveLogMetadata>(indexName);

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

/**
 * Creates an embedding for a given text using Google's Gemini model.
 * @param text The text to embed.
 * @returns A promise that resolves to the embedding vector.
 */
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const result = await embeddingModel.embedContent(
        {
            content: { role: 'user', parts: [{ text }] },
            taskType: TaskType.RETRIEVAL_QUERY,
        },
    );
    return result.embedding.values;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw new Error('Failed to create embedding with Gemini API.');
  }
}

/**
 * Queries the Pinecone index to find the most similar vectors.
 * @param embedding The query vector.
 * @param topK The number of results to return.
 * @returns A promise that resolves to the query results.
 */
export async function queryEmbeddings(embedding: number[], topK: number = 5) {
  try {
    const queryResponse = await pineconeIndex.query({
      vector: embedding,
      topK,
      includeMetadata: true,
    });
    return queryResponse.matches;
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    throw new Error('Failed to query embeddings from Pinecone.');
  }
}

/**
 * Upserts (inserts or updates) vectors into the Pinecone index.
 * @param vectors An array of vectors to upsert.
 */
export async function upsertEmbeddings(vectors: PineconeRecord<PandaTraveLogMetadata>[]) {
    if (vectors.length === 0) return;
    try {
        await pineconeIndex.upsert(vectors);
    } catch (error) {
        console.error('Error upserting to Pinecone:', error);
        throw new Error('Failed to upsert embeddings to Pinecone.');
    }
}

/**
 * A high-level function to perform a semantic search.
 * It takes a text query, creates an embedding, and queries Pinecone.
 * @param query The text query from the user.
 * @param topK The number of results to return.
 * @returns A promise that resolves to the search results with metadata.
 */
export async function semanticSearch(query: string, topK: number = 5) {
    try {
        const embedding = await createEmbedding(query);
        const searchResults = await queryEmbeddings(embedding, topK);
        return searchResults;
    } catch (error) {
        console.error('Semantic search failed:', error);
        // Return empty array or re-throw, depending on desired error handling
        return [];
    }
}

// Example of how you might structure data for upserting
// This is for demonstration; actual data will come from your app's content
export async function seedExampleData() {
    const exampleDestinations = [
        { id: uuidv4(), text: "Eiffel Tower, Paris: An iconic iron tower known for its breathtaking views of the city. A must-visit for romantic trips.", metadata: { type: 'landmark', city: 'Paris', country: 'France', originalText: "Eiffel Tower, Paris: An iconic iron tower known for its breathtaking views of the city. A must-visit for romantic trips." } },
        { id: uuidv4(), text: "Colosseum, Rome: An ancient amphitheater in the center of Rome, Italy. A testament to Roman engineering and history.", metadata: { type: 'landmark', city: 'Rome', country: 'Italy', originalText: "Colosseum, Rome: An ancient amphitheater in the center of Rome, Italy. A testament to Roman engineering and history." } },
        { id: uuidv4(), text: "Mount Fuji, Japan: Japan's highest mountain, an active volcano, and a symbol of the country. Popular for hiking and photography.", metadata: { type: 'natural_wonder', country: 'Japan', originalText: "Mount Fuji, Japan: Japan's highest mountain, an active volcano, and a symbol of the country. Popular for hiking and photography." } },
    ];

    const vectorsToUpsert: PineconeRecord<PandaTraveLogMetadata>[] = [];
    for (const dest of exampleDestinations) {
        const embedding = await createEmbedding(dest.text);
        vectorsToUpsert.push({
            id: dest.id,
            values: embedding,
            metadata: dest.metadata,
        });
    }

    await upsertEmbeddings(vectorsToUpsert);
    console.log('Successfully seeded example data to Pinecone.');
}
