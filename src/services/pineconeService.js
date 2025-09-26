import { Pinecone } from '@pinecone-database/pinecone';
import embeddingService from './embeddingService.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service để tương tác với Pinecone vector database
 * Tìm kiếm địa điểm dựa trên semantic similarity
 */
class PineconeService {
    constructor() {
        this.apiKey = process.env.PINECONE_API_KEY;
        this.indexName = 'veena-travel-places'; // Tên index trong Pinecone
        
        if (!this.apiKey) {
            throw new Error('PINECONE_API_KEY is required in environment variables');
        }

        this.pinecone = null;
        this.index = null;
        this.isInitialized = false;
    }

    /**
     * Khởi tạo kết nối với Pinecone
     */
    async initialize() {
        try {
            if (this.isInitialized) {
                return;
            }

            this.pinecone = new Pinecone({
                apiKey: this.apiKey
            });

            // Lấy thông tin về index
            this.index = this.pinecone.index(this.indexName);
            
            this.isInitialized = true;
            console.log('Pinecone service initialized successfully');

        } catch (error) {
            console.error('Error initializing Pinecone:', error.message);
            throw new Error(`Failed to initialize Pinecone: ${error.message}`);
        }
    }

    /**
     * Đảm bảo service đã được khởi tạo
     */
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initialize();
        }
    }

    /**
     * Tìm kiếm địa điểm dựa trên tags/interests
     * @param {Array<string>} tags - Mảng các tags/interests
     * @param {number} topK - Số lượng kết quả trả về (mặc định 20)
     * @param {Object} filter - Bộ lọc metadata (optional)
     * @returns {Promise<Array<string>>} - Mảng các _id của địa điểm
     */
    async queryByTags(tags, topK = 20, filter = null) {
        try {
            await this.ensureInitialized();

            if (!Array.isArray(tags) || tags.length === 0) {
                throw new Error('Tags must be a non-empty array');
            }

            // Tạo embedding vector từ tags
            const queryVector = await embeddingService.createQueryEmbedding(tags);

            if (!queryVector || queryVector.length === 0) {
                throw new Error('Failed to create query vector from tags');
            }

            // Chuẩn bị query options
            const queryOptions = {
                vector: queryVector,
                topK: Math.min(topK, 100), // Giới hạn tối đa 100 kết quả
                includeMetadata: true,
                includeValues: false
            };

            // Thêm filter nếu có
            if (filter && Object.keys(filter).length > 0) {
                queryOptions.filter = filter;
            }

            // Thực hiện query
            const queryResponse = await this.index.query(queryOptions);

            if (!queryResponse.matches || queryResponse.matches.length === 0) {
                console.log('No matches found for tags:', tags);
                return [];
            }

            // Trích xuất và trả về danh sách _id
            const placeIds = queryResponse.matches
                .filter(match => match.score > 0.5) // Lọc kết quả có độ tương đồng thấp
                .map(match => match.id)
                .filter(id => id); // Loại bỏ id null/undefined

            console.log(`Found ${placeIds.length} places for tags:`, tags);
            return placeIds;

        } catch (error) {
            console.error('Error in queryByTags:', error.message);
            throw new Error(`Failed to query by tags: ${error.message}`);
        }
    }

    /**
     * Tìm kiếm địa điểm theo destination và tags
     * @param {string} destination - Tên địa điểm/thành phố
     * @param {Array<string>} tags - Mảng các tags/interests
     * @param {number} topK - Số lượng kết quả trả về
     * @returns {Promise<Array<string>>} - Mảng các _id của địa điểm
     */
    async queryByDestinationAndTags(destination, tags, topK = 20) {
        try {
            // Tạo filter cho destination
            const filter = {
                destination: { "$eq": destination }
            };

            return await this.queryByTags(tags, topK, filter);

        } catch (error) {
            console.error('Error in queryByDestinationAndTags:', error.message);
            throw new Error(`Failed to query by destination and tags: ${error.message}`);
        }
    }

    /**
     * Tìm kiếm địa điểm theo category
     * @param {Array<string>} categories - Mảng các categories
     * @param {Array<string>} tags - Mảng các tags/interests
     * @param {number} topK - Số lượng kết quả trả về
     * @returns {Promise<Array<string>>} - Mảng các _id của địa điểm
     */
    async queryByCategories(categories, tags, topK = 20) {
        try {
            if (!Array.isArray(categories) || categories.length === 0) {
                return await this.queryByTags(tags, topK);
            }

            // Tạo filter cho categories
            const filter = {
                category: { "$in": categories }
            };

            return await this.queryByTags(tags, topK, filter);

        } catch (error) {
            console.error('Error in queryByCategories:', error.message);
            throw new Error(`Failed to query by categories: ${error.message}`);
        }
    }

    /**
     * Tìm kiếm địa điểm tương tự dựa trên một địa điểm cho trước
     * @param {string} placeId - ID của địa điểm tham chiếu
     * @param {number} topK - Số lượng kết quả trả về
     * @returns {Promise<Array<string>>} - Mảng các _id của địa điểm tương tự
     */
    async findSimilarPlaces(placeId, topK = 10) {
        try {
            await this.ensureInitialized();

            // Lấy vector của địa điểm tham chiếu
            const fetchResponse = await this.index.fetch([placeId]);
            
            if (!fetchResponse.records || !fetchResponse.records[placeId]) {
                throw new Error(`Place with ID ${placeId} not found in vector database`);
            }

            const referenceVector = fetchResponse.records[placeId].values;

            // Tìm kiếm các địa điểm tương tự
            const queryResponse = await this.index.query({
                vector: referenceVector,
                topK: topK + 1, // +1 để loại trừ chính nó
                includeMetadata: true,
                includeValues: false
            });

            // Loại trừ địa điểm tham chiếu và trả về kết quả
            const similarPlaceIds = queryResponse.matches
                .filter(match => match.id !== placeId && match.score > 0.7)
                .map(match => match.id)
                .slice(0, topK);

            return similarPlaceIds;

        } catch (error) {
            console.error('Error in findSimilarPlaces:', error.message);
            throw new Error(`Failed to find similar places: ${error.message}`);
        }
    }

    /**
     * Upsert (insert hoặc update) một địa điểm vào vector database
     * @param {string} placeId - ID của địa điểm
     * @param {string} placeText - Text mô tả địa điểm để tạo embedding
     * @param {Object} metadata - Metadata của địa điểm
     * @returns {Promise<boolean>} - True nếu thành công
     */
    async upsertPlace(placeId, placeText, metadata = {}) {
        try {
            await this.ensureInitialized();

            // Tạo embedding vector từ text mô tả
            const vector = await embeddingService.createEmbedding(placeText);

            // Upsert vào Pinecone
            await this.index.upsert([{
                id: placeId,
                values: vector,
                metadata: metadata
            }]);

            console.log(`Successfully upserted place: ${placeId}`);
            return true;

        } catch (error) {
            console.error('Error in upsertPlace:', error.message);
            throw new Error(`Failed to upsert place: ${error.message}`);
        }
    }

    /**
     * Xóa một địa điểm khỏi vector database
     * @param {string} placeId - ID của địa điểm cần xóa
     * @returns {Promise<boolean>} - True nếu thành công
     */
    async deletePlace(placeId) {
        try {
            await this.ensureInitialized();

            await this.index.deleteOne(placeId);
            console.log(`Successfully deleted place: ${placeId}`);
            return true;

        } catch (error) {
            console.error('Error in deletePlace:', error.message);
            throw new Error(`Failed to delete place: ${error.message}`);
        }
    }

    /**
     * Lấy thống kê về index
     * @returns {Promise<Object>} - Thông tin thống kê
     */
    async getIndexStats() {
        try {
            await this.ensureInitialized();

            const stats = await this.index.describeIndexStats();
            return stats;

        } catch (error) {
            console.error('Error getting index stats:', error.message);
            throw new Error(`Failed to get index stats: ${error.message}`);
        }
    }

    /**
     * Kiểm tra kết nối với Pinecone
     * @returns {Promise<boolean>} - True nếu kết nối thành công
     */
    async testConnection() {
        try {
            await this.ensureInitialized();
            await this.getIndexStats();
            return true;
        } catch (error) {
            console.error('Pinecone connection test failed:', error.message);
            return false;
        }
    }
}

export default new PineconeService();
