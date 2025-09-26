import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service để tạo embedding vectors từ text sử dụng OpenRouter API
 */
class EmbeddingService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseURL = 'https://openrouter.ai/api/v1';
        this.model = 'openai/text-embedding-ada-002';

        if (!this.apiKey) {
            throw new Error('OPENROUTER_API_KEY is required in environment variables');
        }
    }

    /**
     * Tạo embedding vector từ text
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
                `${this.baseURL}/${this.model}:embedContent?key=${this.apiKey}`,
                {
                    model: this.model,
                    content: {
                        parts: [{
                            text: normalizedText
                        }]
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000 // 10 seconds timeout
                }
            );

            if (!response.data || !response.data.embedding || !response.data.embedding.values) {
                throw new Error('Invalid response format from embedding API');
            }

            return response.data.embedding.values;

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

            // Tạo embedding cho từng text một cách tuần tự để tránh rate limit
            const embeddings = [];
            
            for (const text of texts) {
                const embedding = await this.createEmbedding(text);
                embeddings.push(embedding);
                
                // Thêm delay nhỏ để tránh rate limit
                await this.delay(100);
            }

            return embeddings;

        } catch (error) {
            console.error('Error creating multiple embeddings:', error.message);
            throw new Error(`Failed to create multiple embeddings: ${error.message}`);
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
            .substring(0, 1000); // Giới hạn độ dài text
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
            console.error('Embedding service connection test failed:', error.message);
            return false;
        }
    }
}

export default new EmbeddingService();
