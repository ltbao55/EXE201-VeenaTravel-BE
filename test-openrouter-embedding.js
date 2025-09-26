import openRouterEmbeddingService from './src/services/openRouterEmbeddingService.js';

/**
 * Test script để kiểm tra OpenRouterEmbeddingService
 */
async function testEmbeddingService() {
    console.log('🚀 Testing OpenRouter Embedding Service\n');

    // Test 1: Basic connection
    console.log('🔍 Testing connection...');
    try {
        const connectionSuccess = await openRouterEmbeddingService.testConnection();
        if (connectionSuccess) {
            console.log('✅ Connection successful!');
        } else {
            console.log('❌ Connection failed!');
            return;
        }
    } catch (error) {
        console.error('❌ Connection test error:', error.message);
        return;
    }

    // Test 2: Single embedding
    console.log('\n🧠 Testing single embedding...');
    try {
        const testText = "Đà Lạt là thành phố du lịch nổi tiếng với khí hậu mát mẻ và nhiều hoa";
        const embedding = await openRouterEmbeddingService.createEmbedding(testText);
        
        console.log('✅ Single embedding successful!');
        console.log(`📊 Vector dimensions: ${embedding.length}`);
        console.log(`📈 Sample values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    } catch (error) {
        console.error('❌ Single embedding failed:', error.message);
    }

    // Test 3: Multiple embeddings
    console.log('\n📚 Testing multiple embeddings...');
    try {
        const testTexts = [
            "Hà Nội phố cổ với nhiều di tích lịch sử",
            "Phú Quốc đảo ngọc với bãi biển đẹp",
            "Sapa vùng núi với ruộng bậc thang"
        ];
        
        const embeddings = await openRouterEmbeddingService.createMultipleEmbeddings(testTexts);
        
        console.log('✅ Multiple embeddings successful!');
        console.log(`📊 Number of embeddings: ${embeddings.length}`);
        console.log(`📈 Each vector dimensions: ${embeddings[0].length}`);
    } catch (error) {
        console.error('❌ Multiple embeddings failed:', error.message);
    }

    // Test 4: Query embedding from tags
    console.log('\n🏷️ Testing query embedding from tags...');
    try {
        const tags = ["ăn uống", "thiên nhiên", "gia đình"];
        const queryEmbedding = await openRouterEmbeddingService.createQueryEmbedding(tags);
        
        console.log('✅ Query embedding successful!');
        console.log(`📊 Query vector dimensions: ${queryEmbedding.length}`);
        console.log(`🏷️ Tags processed: ${tags.join(', ')}`);
    } catch (error) {
        console.error('❌ Query embedding failed:', error.message);
    }

    // Test 5: Cosine similarity
    console.log('\n📐 Testing cosine similarity...');
    try {
        const text1 = "Đà Lạt thành phố hoa";
        const text2 = "Đà Lạt nổi tiếng với hoa";
        const text3 = "Hà Nội phố cổ";
        
        const embedding1 = await openRouterEmbeddingService.createEmbedding(text1);
        const embedding2 = await openRouterEmbeddingService.createEmbedding(text2);
        const embedding3 = await openRouterEmbeddingService.createEmbedding(text3);
        
        const similarity12 = openRouterEmbeddingService.cosineSimilarity(embedding1, embedding2);
        const similarity13 = openRouterEmbeddingService.cosineSimilarity(embedding1, embedding3);
        
        console.log('✅ Cosine similarity calculation successful!');
        console.log(`📊 Similarity (Đà Lạt texts): ${similarity12.toFixed(4)}`);
        console.log(`📊 Similarity (Đà Lạt vs Hà Nội): ${similarity13.toFixed(4)}`);
        
        if (similarity12 > similarity13) {
            console.log('✅ Similarity test passed - similar texts have higher similarity!');
        } else {
            console.log('⚠️ Similarity test warning - unexpected similarity values');
        }
    } catch (error) {
        console.error('❌ Cosine similarity test failed:', error.message);
    }

    // Test 6: Semantic analysis with DeepSeek
    console.log('\n🤖 Testing semantic analysis with DeepSeek...');
    try {
        const testText = "Tôi muốn tìm quán ăn ngon ở Đà Lạt với gia đình";
        const semanticAnalysis = await openRouterEmbeddingService.analyzeSemanticContent(testText);
        
        console.log('✅ Semantic analysis successful!');
        console.log('📝 Analysis result:', semanticAnalysis);
    } catch (error) {
        console.error('❌ Semantic analysis failed:', error.message);
    }

    console.log('\n🎉 All embedding tests completed!');
}

// Run tests
testEmbeddingService().catch(console.error);
