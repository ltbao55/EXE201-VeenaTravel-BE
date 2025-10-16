import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Khởi tạo Pinecone client
let pinecone = null;
let index = null;
let genAI = null;

const initializePinecone = async () => {
  const apiKey = process.env.PINECONE_API_KEY;
  const embeddingApiKey = process.env.GEMINIAPIKEY; // Sử dụng GEMINIAPIKEY thay vì EMBEDDING_API_KEY

  if (!apiKey) {
    throw new Error('PINECONE_API_KEY không được cấu hình trong file .env');
  }

  if (!embeddingApiKey) {
    throw new Error('GEMINIAPIKEY không được cấu hình trong file .env');
  }

  try {
    // Khởi tạo Pinecone
    pinecone = new Pinecone({
      apiKey: apiKey
    });

    // Kết nối với index 'vinatravel-768' (dimension 768 cho Gemini embedding)
    index = pinecone.index('vinatravel-768');

    // Khởi tạo Google AI cho embedding
    genAI = new GoogleGenerativeAI(embeddingApiKey);

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Pinecone service đã được khởi tạo thành công với index: vinatravel-768');
    }
  } catch (error) {
    console.error('❌ Lỗi khởi tạo Pinecone:', error);
    throw error;
  }
};

// Đảm bảo service được khởi tạo
const ensureInitialized = async () => {
  if (!pinecone || !index || !genAI) {
    await initializePinecone();
  }
};

/**
 * Tạo vector embedding từ text sử dụng Google AI
 * @param {string} text - Text cần tạo embedding
 * @returns {Promise<Array<number>>} Vector embedding
 */
const createEmbedding = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Lỗi tạo embedding:', error);
    throw new Error('Không thể tạo embedding cho text');
  }
};

/**
 * Tìm kiếm ngữ nghĩa trong database Pinecone
 * @param {string} query - Câu truy vấn tìm kiếm
 * @param {Object} options - Tùy chọn tìm kiếm
 * @returns {Promise<{success: boolean, data?: Array, message?: string}>}
 */
export const semanticSearch = async (query, options = {}) => {
  try {
    await ensureInitialized();

    if (!query || typeof query !== 'string') {
      return {
        success: false,
        message: 'Câu truy vấn tìm kiếm là bắt buộc'
      };
    }

    // Tạo embedding cho câu truy vấn
    const queryEmbedding = await createEmbedding(query);

    // Thực hiện tìm kiếm trong Pinecone
    const searchOptions = {
      vector: queryEmbedding,
      topK: options.limit || 10,
      includeMetadata: true,
      includeValues: false
    };

    // Thêm filter nếu có
    if (options.filter) {
      searchOptions.filter = options.filter;
    }

    const searchResults = await index.query(searchOptions);

    // Xử lý kết quả
    const results = searchResults.matches.map(match => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata
    }));

    return {
      success: true,
      data: {
        query,
        results,
        totalResults: results.length,
        searchedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Lỗi tìm kiếm ngữ nghĩa:', error);

    if (error.message.includes('API')) {
      return {
        success: false,
        message: 'Lỗi kết nối API Pinecone. Vui lòng kiểm tra cấu hình.'
      };
    }

    return {
      success: false,
      message: 'Có lỗi xảy ra trong quá trình tìm kiếm. Vui lòng thử lại.'
    };
  }
};

/**
 * Tìm kiếm địa điểm du lịch theo loại
 * @param {string} query - Câu truy vấn
 * @param {string} category - Loại địa điểm (khách sạn, nhà hàng, điểm tham quan, etc.)
 * @returns {Promise<{success: boolean, data?: Array, message?: string}>}
 */
export const searchPlacesByCategory = async (query, category = null) => {
  try {
    const filter = category ? { category: { $eq: category } } : null;

    const result = await semanticSearch(query, {
      filter,
      limit: 15
    });

    if (!result.success) {
      return result;
    }

    // Lọc và sắp xếp kết quả theo điểm số
    const filteredResults = result.data.results
      .filter(item => item.score > 0.7) // Chỉ lấy kết quả có độ tương đồng cao
      .sort((a, b) => b.score - a.score);

    return {
      success: true,
      data: {
        query,
        category,
        places: filteredResults,
        totalFound: filteredResults.length
      }
    };

  } catch (error) {
    console.error('Lỗi tìm kiếm theo danh mục:', error);
    return {
      success: false,
      message: 'Có lỗi xảy ra khi tìm kiếm địa điểm.'
    };
  }
};

/**
 * Lưu dữ liệu địa điểm mới vào Pinecone
 * @param {Object} placeData - Dữ liệu địa điểm
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const upsertPlace = async (placeData) => {
  try {
    await ensureInitialized();

    const { id, name, description, metadata } = placeData;

    if (!id || !name || !description) {
      return {
        success: false,
        message: 'ID, tên và mô tả địa điểm là bắt buộc'
      };
    }

    // Tạo embedding cho mô tả địa điểm
    const embedding = await createEmbedding(`${name} ${description}`);

    // Upsert vào Pinecone
    await index.upsert([{
      id: id,
      values: embedding,
      metadata: {
        name,
        description,
        ...metadata
      }
    }]);

    return {
      success: true,
      message: 'Đã lưu địa điểm thành công'
    };

  } catch (error) {
    console.error('Lỗi lưu địa điểm:', error);
    return {
      success: false,
      message: 'Có lỗi xảy ra khi lưu địa điểm'
    };
  }
};

/**
 * Lưu nhiều địa điểm cùng lúc (batch upsert)
 * @param {Array} placesData - Mảng dữ liệu địa điểm
 * @returns {Promise<{success: boolean, message?: string, processed?: number}>}
 */
export const batchUpsertPlaces = async (placesData) => {
  try {
    await ensureInitialized();

    if (!Array.isArray(placesData) || placesData.length === 0) {
      return {
        success: false,
        message: 'Dữ liệu địa điểm phải là mảng không rỗng'
      };
    }

    const vectors = [];
    let processed = 0;

    for (const placeData of placesData) {
      try {
        const { id, name, description, metadata } = placeData;

        if (!id || !name || !description) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Bỏ qua địa điểm thiếu thông tin: ${id || 'unknown'}`);
          }
          continue;
        }

        // Tạo embedding
        const embedding = await createEmbedding(`${name} ${description}`);

        vectors.push({
          id: id,
          values: embedding,
          metadata: {
            name,
            description,
            ...metadata
          }
        });

        processed++;

        // Batch upload mỗi 10 items để tránh timeout
        if (vectors.length >= 10) {
          await index.upsert(vectors);
          vectors.length = 0; // Clear array

          // Delay nhỏ để tránh rate limit
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`Lỗi xử lý địa điểm ${placeData.id}:`, error.message);
      }
    }

    // Upload batch cuối cùng
    if (vectors.length > 0) {
      await index.upsert(vectors);
    }

    return {
      success: true,
      message: `Đã lưu ${processed} địa điểm thành công`,
      processed
    };

  } catch (error) {
    console.error('Lỗi batch upsert:', error);
    return {
      success: false,
      message: 'Có lỗi xảy ra khi lưu batch địa điểm'
    };
  }
};

/**
 * Upsert vectors directly to Pinecone (for partner places)
 * @param {Array} vectors - Array of vector objects with id, values, metadata
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const upsertVectors = async (vectors) => {
  try {
    await ensureInitialized();
    
    if (!vectors || vectors.length === 0) {
      return {
        success: false,
        message: 'No vectors provided'
      };
    }

    await index.upsert(vectors);

    return {
      success: true,
      message: `Upserted ${vectors.length} vectors successfully`
    };

  } catch (error) {
    console.error('❌ Error upserting vectors:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Query vectors from Pinecone
 * @param {Object} options - Query options (vector, topK, filter, includeMetadata)
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
export const queryVectors = async (options) => {
  try {
    await ensureInitialized();

    const result = await index.query(options);

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('❌ Error querying vectors:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Fetch vectors by IDs
 * @param {Array} ids - Array of vector IDs
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
export const fetchVectors = async (ids) => {
  try {
    await ensureInitialized();

    const result = await index.fetch(ids);

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('❌ Error fetching vectors:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Delete vectors by IDs
 * @param {Array} ids - Array of vector IDs to delete
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const deleteVectors = async (ids) => {
  try {
    await ensureInitialized();

    await index.deleteMany(ids);

    return {
      success: true,
      message: `Deleted ${ids.length} vectors successfully`
    };

  } catch (error) {
    console.error('❌ Error deleting vectors:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

export default {
  semanticSearch,
  searchPlacesByCategory,
  upsertPlace,
  batchUpsertPlaces,
  // New functions for partner places
  upsertVectors,
  queryVectors,
  fetchVectors,
  deleteVectors
};