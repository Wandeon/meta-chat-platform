import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDocumentStatus() {
  console.log('Starting document status migration...');

  try {
    // Find documents with chunks that have embeddings
    const documents = await prisma.document.findMany({
      where: {
        status: { in: ['pending', 'processing'] }
      },
      include: {
        chunks: true
      }
    });

    console.log(`Found ${documents.length} documents with pending/processing status`);

    let updatedCount = 0;
    let partialCount = 0;

    for (const doc of documents) {
      // Use raw query to check for embeddings since Prisma doesn't support Unsupported type queries
      const chunksWithEmbeddings = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM chunks
        WHERE "documentId" = ${doc.id}
        AND embedding IS NOT NULL
      `;

      const embeddedChunksCount = Number(chunksWithEmbeddings[0].count);
      const totalChunks = doc.chunks.length;

      if (embeddedChunksCount > 0 && embeddedChunksCount === totalChunks) {
        // All chunks have embeddings → set to indexed
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            status: 'indexed',
            metadata: {
              ...(doc.metadata as any),
              indexedAt: new Date().toISOString(),
              chunkCount: totalChunks
            }
          }
        });
        console.log(`✅ Updated document ${doc.id} (${doc.filename}) to 'indexed' (${totalChunks} chunks)`);
        updatedCount++;
      } else if (embeddedChunksCount > 0) {
        // Partial embeddings → keep processing
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            status: 'processing',
            metadata: {
              ...(doc.metadata as any),
              processedAt: new Date().toISOString(),
              chunkCount: totalChunks,
              partialChunkCount: embeddedChunksCount
            }
          }
        });
        console.log(`⏳ Updated document ${doc.id} (${doc.filename}) to 'processing' (${embeddedChunksCount}/${totalChunks} chunks)`);
        partialCount++;
      } else {
        console.log(`⏭️  Skipped document ${doc.id} (${doc.filename}) - no embeddings found`);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total documents processed: ${documents.length}`);
    console.log(`Documents set to 'indexed': ${updatedCount}`);
    console.log(`Documents set to 'processing': ${partialCount}`);
    console.log('Migration complete!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

fixDocumentStatus()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
