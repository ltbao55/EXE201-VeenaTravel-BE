import openRouterService from '../services/openRouterService.js';
import embeddingService from '../services/embeddingService.js';
import Place from '../models/Place.js';

/**
 * Controller cho các tính năng AI sử dụng OpenRouter + DeepSeek v3.1
 */

// Test OpenRouter connection với DeepSeek v3.1
export const testOpenRouter = async (req, res) => {
  try {
    const { message = "Xin chào! Bạn có thể giới thiệu về mình không?" } = req.body;
    
    // Test basic chat với DeepSeek v3.1
    const response = await openRouterService.extractIntent(message);
    
    res.json({
      success: true,
      message: 'OpenRouter + DeepSeek v3.1 connection successful',
      data: response
    });
  } catch (error) {
    console.error('Test OpenRouter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test OpenRouter connection',
      error: error.message
    });
  }
};

// Trích xuất ý định du lịch từ query người dùng
export const extractTravelIntent = async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }
    
    console.log('Extracting intent for query:', query);
    
    // Sử dụng DeepSeek v3.1 thông qua OpenRouter để trích xuất ý định
    const intentData = await openRouterService.extractIntent(query);
    
    res.json({
      success: true,
      message: 'Intent extracted successfully using DeepSeek v3.1',
      data: {
        originalQuery: query,
        extractedIntent: intentData,
        aiModel: 'deepseek/deepseek-chat',
        provider: 'OpenRouter'
      }
    });
  } catch (error) {
    console.error('Extract travel intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract travel intent',
      error: error.message
    });
  }
};

// Tạo lịch trình du lịch hoàn chỉnh
export const generateTravelItinerary = async (req, res) => {
  try {
    const { query, destination, duration = 1, pax = 2 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }
    
    console.log('Generating itinerary for:', { query, destination, duration, pax });
    
    // Bước 1: Trích xuất ý định
    const intentData = await openRouterService.extractIntent(query);
    console.log('Intent extracted:', intentData);
    
    // Bước 2: Tìm địa điểm phù hợp
    const searchDestination = destination || intentData.destination || 'Việt Nam';
    const places = await Place.find({
      $or: [
        { name: { $regex: searchDestination, $options: 'i' } },
        { address: { $regex: searchDestination, $options: 'i' } },
        { description: { $regex: searchDestination, $options: 'i' } }
      ],
      isActive: true
    }).limit(10);
    
    console.log(`Found ${places.length} places for destination: ${searchDestination}`);
    
    // Bước 3: Tạo ma trận thời gian di chuyển giả lập (trong thực tế sẽ dùng Mapbox)
    const durationMatrix = places.map((_, i) => 
      places.map((_, j) => i === j ? 0 : Math.random() * 3600) // 0-1 hour in seconds
    );
    
    // Bước 4: Tạo lịch trình với DeepSeek v3.1
    const itinerary = await openRouterService.generateItinerary(
      query, 
      places, 
      durationMatrix, 
      intentData
    );
    
    res.json({
      success: true,
      message: 'Itinerary generated successfully using DeepSeek v3.1',
      data: {
        originalQuery: query,
        extractedIntent: intentData,
        availablePlaces: places.length,
        generatedItinerary: itinerary,
        aiModel: 'deepseek/deepseek-chat',
        provider: 'OpenRouter'
      }
    });
  } catch (error) {
    console.error('Generate travel itinerary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate travel itinerary',
      error: error.message
    });
  }
};

// So sánh performance giữa DeepSeek v3.1 và model cũ
export const compareAIPerformance = async (req, res) => {
  try {
    const { queries = [
      "Tìm quán ăn ngon ở Hà Nội",
      "Du lịch Đà Lạt 3 ngày với gia đình",
      "Khách sạn cao cấp ở Sapa"
    ] } = req.body;
    
    const results = [];
    
    for (const query of queries) {
      console.log(`Testing query: ${query}`);
      
      const startTime = Date.now();
      
      try {
        const intentData = await openRouterService.extractIntent(query);
        const endTime = Date.now();
        
        results.push({
          query,
          success: true,
          intentData,
          latency: endTime - startTime,
          model: 'deepseek/deepseek-chat',
          provider: 'OpenRouter'
        });
      } catch (error) {
        results.push({
          query,
          success: false,
          error: error.message,
          latency: Date.now() - startTime,
          model: 'deepseek/deepseek-chat',
          provider: 'OpenRouter'
        });
      }
    }
    
    // Tính toán thống kê
    const successfulResults = results.filter(r => r.success);
    const averageLatency = successfulResults.length > 0 
      ? successfulResults.reduce((sum, r) => sum + r.latency, 0) / successfulResults.length
      : 0;
    
    res.json({
      success: true,
      message: 'AI performance comparison completed',
      data: {
        totalQueries: queries.length,
        successfulQueries: successfulResults.length,
        failedQueries: results.length - successfulResults.length,
        averageLatency: Math.round(averageLatency),
        results,
        model: 'deepseek/deepseek-chat',
        provider: 'OpenRouter'
      }
    });
  } catch (error) {
    console.error('Compare AI performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare AI performance',
      error: error.message
    });
  }
};

// Hybrid search: sử dụng Google AI embedding + DeepSeek v3.1 analysis
export const hybridSearch = async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }
    
    console.log('Performing hybrid search for:', query);
    
    // Bước 1: Trích xuất ý định với DeepSeek v3.1
    const intentData = await openRouterService.extractIntent(query);
    console.log('Intent extracted:', intentData);
    
    // Bước 2: Tạo embedding với Google AI (giữ nguyên vì hoạt động tốt)
    const queryEmbedding = await embeddingService.createEmbedding(query);
    console.log('Embedding created, dimensions:', queryEmbedding.length);
    
    // Bước 3: Tìm kiếm địa điểm dựa trên intent và embedding
    const filter = {};
    
    // Lọc theo destination
    if (intentData.destination && intentData.destination !== 'Việt Nam') {
      filter.$or = [
        { name: { $regex: intentData.destination, $options: 'i' } },
        { address: { $regex: intentData.destination, $options: 'i' } }
      ];
    }
    
    // Lọc theo categories
    if (intentData.categories && intentData.categories.length > 0) {
      filter.category = { $in: intentData.categories };
    }
    
    const places = await Place.find(filter)
      .limit(topK * 2) // Lấy nhiều hơn để có thể filter
      .lean();
    
    res.json({
      success: true,
      message: 'Hybrid search completed successfully',
      data: {
        originalQuery: query,
        extractedIntent: intentData,
        embeddingDimensions: queryEmbedding.length,
        foundPlaces: places.length,
        places: places.slice(0, topK),
        aiModel: 'deepseek/deepseek-chat (intent) + Google AI (embedding)',
        provider: 'OpenRouter + Google AI'
      }
    });
  } catch (error) {
    console.error('Hybrid search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform hybrid search',
      error: error.message
    });
  }
};
