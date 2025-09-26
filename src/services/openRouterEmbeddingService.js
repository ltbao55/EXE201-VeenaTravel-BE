import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service để tạo embedding vectors sử dụng OpenRouter API
 * Thay thế Google AI Embedding với text-embedding models từ OpenRouter
 */
class OpenRouterEmbeddingService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY || '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';
        this.baseURL = 'https://openrouter.ai/api/v1';
        
        // Sử dụng text-embedding model thay vì chat model cho embedding
        this.embeddingModel = 'text-embedding-3-small'; // OpenAI embedding model via OpenRouter
        this.chatModel = 'deepseek/deepseek-chat'; // DeepSeek cho chat tasks
        
        if (!this.apiKey) {
            throw new Error('OPENROUTER_API_KEY is required in environment variables');
        }
    }

    /**
     * Tạo embedding vector từ text sử dụng OpenRouter
     * @param {string} text - Text cần tạo embedding
     * @returns {Promise<Array<number>>} - Vector embedding
     */
    async createEmbedding(text) {
        try {
            if (!text || typeof text !== 'string') {
                throw new Error('Text input is required and must be a string');
            }

            // Chuẩn hóa text
            const normalizedText = this.normalizeText(text);

            const response = await axios.post(
                `${this.baseURL}/embeddings`,
                {
                    model: this.embeddingModel,
                    input: normalizedText,
                    encoding_format: "float"
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:5001',
                        'X-Title': 'Veena Travel Backend'
                    },
                    timeout: 10000 // 10 seconds timeout
                }
            );

            if (!response.data || !response.data.data || !response.data.data[0] || !response.data.data[0].embedding) {
                throw new Error('Invalid response format from embedding API');
            }

            return response.data.data[0].embedding;

        } catch (error) {
            console.error('Error creating embedding:', error.message);
            
            if (error.response) {
                console.error('API Error Response:', error.response.data);
                throw new Error(`Embedding API error: ${error.response.status} - ${error.response.data.error?.message || 'Unknown error'}`);
            }
            
            throw new Error(`Failed to create embedding: ${error.message}`);
        }
    }

    /**
     * Tạo embedding cho nhiều text cùng lúc
     * @param {Array<string>} texts - Mảng các text cần tạo embedding
     * @returns {Promise<Array<Array<number>>>} - Mảng các vector embedding
     */
    async createMultipleEmbeddings(texts) {
        try {
            if (!Array.isArray(texts) || texts.length === 0) {
                throw new Error('Texts must be a non-empty array');
            }

            // OpenRouter có thể xử lý multiple inputs trong một request
            const normalizedTexts = texts.map(text => this.normalizeText(text));

            const response = await axios.post(
                `${this.baseURL}/embeddings`,
                {
                    model: this.embeddingModel,
                    input: normalizedTexts,
                    encoding_format: "float"
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:5001',
                        'X-Title': 'Veena Travel Backend'
                    },
                    timeout: 30000 // 30 seconds for multiple embeddings
                }
            );

            if (!response.data || !response.data.data) {
                throw new Error('Invalid response format from embedding API');
            }

            return response.data.data.map(item => item.embedding);

        } catch (error) {
            console.error('Error creating multiple embeddings:', error.message);
            
            // Fallback: create embeddings one by one
            console.log('Falling back to sequential embedding creation...');
            const embeddings = [];
            
            for (const text of texts) {
                try {
                    const embedding = await this.createEmbedding(text);
                    embeddings.push(embedding);
                    
                    // Add delay to avoid rate limits
                    await this.delay(100);
                } catch (singleError) {
                    console.error(`Failed to create embedding for text: ${text}`, singleError.message);
                    // Push a zero vector as fallback
                    embeddings.push(new Array(1536).fill(0)); // text-embedding-3-small has 1536 dimensions
                }
            }

            return embeddings;
        }
    }

    /**
     * Chuẩn hóa text trước khi tạo embedding
     * @param {string} text - Text cần chuẩn hóa
     * @returns {string} - Text đã được chuẩn hóa
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ') // Thay thế nhiều khoảng trắng bằng một khoảng trắng
            .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi, '') // Giữ lại chữ cái, số, khoảng trắng và ký tự tiếng Việt
            .substring(0, 8000); // Increase limit for OpenRouter
    }

    /**
     * Tạo embedding cho query tìm kiếm từ mảng tags
     * @param {Array<string>} tags - Mảng các tags
     * @returns {Promise<Array<number>>} - Vector embedding cho query
     */
    async createQueryEmbedding(tags) {
        try {
            if (!Array.isArray(tags) || tags.length === 0) {
                throw new Error('Tags must be a non-empty array');
            }

            // Nối các tags thành một chuỗi có ý nghĩa
            const queryText = this.tagsToQueryText(tags);
            
            return await this.createEmbedding(queryText);

        } catch (error) {
            console.error('Error creating query embedding:', error.message);
            throw new Error(`Failed to create query embedding: ${error.message}`);
        }
    }

    /**
     * Chuyển đổi mảng tags thành text query có ý nghĩa
     * @param {Array<string>} tags - Mảng các tags
     * @returns {string} - Text query
     */
    tagsToQueryText(tags) {
        // Lọc và chuẩn hóa tags
        const cleanTags = tags
            .filter(tag => tag && typeof tag === 'string')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        if (cleanTags.length === 0) {
            return 'du lịch việt nam';
        }

        // Tạo câu query tự nhiên từ tags
        return `tìm kiếm địa điểm du lịch ${cleanTags.join(', ')}`;
    }

    /**
     * Tính toán độ tương đồng cosine giữa hai vectors
     * @param {Array<number>} vector1 - Vector thứ nhất
     * @param {Array<number>} vector2 - Vector thứ hai
     * @returns {number} - Độ tương đồng cosine (0-1)
     */
    cosineSimilarity(vector1, vector2) {
        if (!Array.isArray(vector1) || !Array.isArray(vector2)) {
            throw new Error('Both inputs must be arrays');
        }

        if (vector1.length !== vector2.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < vector1.length; i++) {
            dotProduct += vector1[i] * vector2[i];
            norm1 += vector1[i] * vector1[i];
            norm2 += vector2[i] * vector2[i];
        }

        const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
        
        if (magnitude === 0) {
            return 0;
        }

        return dotProduct / magnitude;
    }

    /**
     * Utility function để tạo delay
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} - Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Kiểm tra kết nối với API
     * @returns {Promise<boolean>} - True nếu kết nối thành công
     */
    async testConnection() {
        try {
            await this.createEmbedding('test connection');
            return true;
        } catch (error) {
            console.error('OpenRouter embedding service connection test failed:', error.message);
            return false;
        }
    }

    /**
     * Sử dụng DeepSeek chat model để phân tích semantic content
     * @param {string} text - Text cần phân tích
     * @returns {Promise<Object>} - Kết quả phân tích semantic
     */
    async analyzeSemanticContent(text) {
        try {
            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: this.chatModel,
                    messages: [
                        {
                            role: "system",
                            content: "Bạn là AI chuyên phân tích nội dung du lịch. Trả về JSON với các keywords và categories chính."
                        },
                        {
                            role: "user",
                            content: `Phân tích nội dung này và trả về JSON: ${text}`
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 300
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error analyzing semantic content:', error.message);
            return null;
        }
    }
}

export default new OpenRouterEmbeddingService();
