import PartnerPlace from '../models/PartnerPlace.js';
import pineconeService from './pinecone-service.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * =================================================================
 * Partner Places Management Service
 * =================================================================
 * Manages partner places with DUAL STORAGE:
 * 1. MongoDB = Source of Truth (primary storage)
 * 2. Pinecone = Search Index (auto-sync for semantic search)
 * =================================================================
 */

/**
 * Adds a new partner place
 * Flow: MongoDB first → Auto sync to Pinecone → Return
 * @param {Object} placeData - Partner place information
 * @param {String} userId - Admin user ID (optional)
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
const addPartnerPlace = async (placeData, userId = null) => {
  try {
    console.log(`📍 [PARTNER] Thêm địa điểm: ${placeData.name}`);
    
    // =============== STEP 1: Validate ===============
    const requiredFields = ['name', 'description', 'latitude', 'longitude', 'category'];
    const missingFields = requiredFields.filter(field => !placeData[field]);
    
    if (missingFields.length > 0) {
      return {
        success: false,
        message: `Thiếu thông tin bắt buộc: ${missingFields.join(', ')}`
      };
    }

    // =============== STEP 2: Save to MongoDB (PRIMARY STORAGE) ===============
    const mongoPlace = new PartnerPlace({
      name: placeData.name,
      description: placeData.description,
      location: {
        type: 'Point',
        coordinates: [placeData.longitude, placeData.latitude]  // [lng, lat] - GeoJSON format
      },
      address: placeData.address || '',
      category: placeData.category,
      tags: placeData.tags || [],
      priority: placeData.priority || 1,
      rating: placeData.rating || 0,
      reviewCount: placeData.reviewCount || 0,
      contact: placeData.contact || {},
      images: placeData.images || [],
      priceRange: placeData.priceRange || null,
      averagePrice: placeData.averagePrice || null,
      openingHours: placeData.openingHours || '',
      amenities: placeData.amenities || [],
      status: 'active',
      addedBy: userId,
      syncStatus: 'pending'
    });

    await mongoPlace.save();
    console.log(`✅ [MONGODB] Đã lưu: ${mongoPlace._id}`);

    // =============== STEP 3: Auto Sync to Pinecone (SEARCH INDEX) ===============
    let syncResult = { success: false };
    
    try {
      const pineconeId = `partner_${mongoPlace._id}`;
      
      // Generate embedding for semantic search
      console.log(`🔄 [PINECONE] Generating embedding...`);
      const embedding = await generateEmbedding(
        `${placeData.name} ${placeData.description} ${placeData.category} ${placeData.tags?.join(' ') || ''} ${placeData.address || ''}`
      );

      // Prepare Pinecone data
      const pineconeData = {
        id: pineconeId,
        values: embedding,
        metadata: {
          // MongoDB reference
          mongoId: mongoPlace._id.toString(),
          
          // Basic info
          name: placeData.name,
          description: placeData.description,
          address: placeData.address || '',
          
          // Location
          latitude: placeData.latitude,
          longitude: placeData.longitude,
          
          // Categorization
          category: placeData.category,
          tags: placeData.tags || [],
          
          // Priority & Status
          priority: placeData.priority || 1,
          status: 'active',
          isPartner: true,  // Important: Mark as partner place
          
          // Rating
          rating: placeData.rating || 0,
          reviewCount: placeData.reviewCount || 0,
          
          // Pricing
          priceRange: placeData.priceRange || '',
          averagePrice: placeData.averagePrice || 0,
          
          // Timestamps
          addedAt: new Date().toISOString()
        }
      };

      // Upsert to Pinecone
      syncResult = await pineconeService.upsertVectors([pineconeData]);
      
      if (syncResult.success) {
        await mongoPlace.markSyncSuccess(pineconeId);
        console.log(`✅ [PINECONE] Đã sync: ${pineconeId}`);
      } else {
        await mongoPlace.markSyncFailed(syncResult.message || 'Unknown error');
        console.warn(`⚠️ [PINECONE] Sync failed, sẽ retry sau`);
      }
      
    } catch (pineconeError) {
      console.error('❌ [PINECONE] Lỗi sync:', pineconeError.message);
      await mongoPlace.markSyncFailed(pineconeError.message);
      // KHÔNG fail toàn bộ request - data đã an toàn trong MongoDB
    }

    // =============== STEP 4: Return Success ===============
    return {
      success: true,
      data: {
        id: mongoPlace._id,
        pineconeId: mongoPlace.pineconeId,
        name: mongoPlace.name,
        category: mongoPlace.category,
        latitude: mongoPlace.latitude,
        longitude: mongoPlace.longitude,
        syncStatus: mongoPlace.syncStatus,
        message: syncResult.success 
          ? 'Địa điểm đối tác đã được thêm và đồng bộ thành công' 
          : 'Địa điểm đối tác đã được thêm (đồng bộ sẽ retry sau)'
      }
    };

  } catch (error) {
    console.error('❌ [SERVICE] Lỗi thêm địa điểm đối tác:', error);
    return {
      success: false,
      message: `Lỗi thêm địa điểm đối tác: ${error.message}`
    };
  }
};

/**
 * Get all partner places từ MongoDB
 * @param {Object} options - Query options
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
const getAllPartnerPlaces = async (options = {}) => {
  try {
    console.log('📋 [PARTNER] Lấy danh sách địa điểm');
    
    const { 
      limit = 50, 
      page = 1,
      category = null, 
      status = 'active',
      minRating = null,
      sortBy = 'priority',
      sortOrder = 'desc',
      search = null
    } = options;
    
    // =============== Build Query ===============
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }
    
    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // =============== Build Sort ===============
    const sort = {};
    if (search) {
      sort.score = { $meta: 'textScore' };  // Sort by text relevance if searching
    }
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // =============== Execute Query with Pagination ===============
    const skip = (page - 1) * limit;
    
    const [places, total] = await Promise.all([
      PartnerPlace.find(query)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .populate('addedBy', 'name email')
        .populate('updatedBy', 'name email')
        .lean(),
      PartnerPlace.countDocuments(query)
    ]);

    console.log(`✅ [MONGODB] Tìm thấy ${places.length}/${total} địa điểm`);

    return {
      success: true,
      data: {
        places,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        },
        filters: { category, status, minRating, search }
      }
    };

  } catch (error) {
    console.error('❌ [SERVICE] Lỗi lấy danh sách:', error);
    return {
      success: false,
      message: `Lỗi lấy danh sách: ${error.message}`
    };
  }
};

/**
 * Get a single partner place by ID
 * @param {String} placeId - Place MongoDB ID
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
const getPartnerPlaceById = async (placeId) => {
  try {
    const place = await PartnerPlace.findById(placeId)
      .populate('addedBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();
    
    if (!place) {
      return {
        success: false,
        message: 'Không tìm thấy địa điểm'
      };
    }

    return {
      success: true,
      data: place
    };

  } catch (error) {
    console.error('❌ [SERVICE] Lỗi lấy địa điểm:', error);
    return {
      success: false,
      message: `Lỗi lấy địa điểm: ${error.message}`
    };
  }
};

/**
 * Update a partner place
 * Flow: Update MongoDB → Auto sync to Pinecone
 * @param {String} placeId - Place MongoDB ID
 * @param {Object} updateData - Data to update
 * @param {String} userId - Admin user ID (optional)
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
const updatePartnerPlace = async (placeId, updateData, userId = null) => {
  try {
    console.log(`📝 [PARTNER] Cập nhật địa điểm: ${placeId}`);
    
    // =============== STEP 1: Update MongoDB ===============
    const place = await PartnerPlace.findById(placeId);
    
    if (!place) {
      return {
        success: false,
        message: 'Không tìm thấy địa điểm'
      };
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (key === 'latitude' || key === 'longitude') {
        // Update location coordinates
        if (!place.location) place.location = { type: 'Point', coordinates: [0, 0] };
        if (key === 'longitude') place.location.coordinates[0] = updateData[key];
        if (key === 'latitude') place.location.coordinates[1] = updateData[key];
      } else if (key !== 'syncStatus' && key !== 'pineconeId') {
        // Don't allow direct sync status/pinecone ID updates
        place[key] = updateData[key];
      }
    });

    place.updatedBy = userId;
    place.syncStatus = 'pending';  // Mark for re-sync
    
    await place.save();
    console.log(`✅ [MONGODB] Đã cập nhật`);

    // =============== STEP 2: Auto Sync to Pinecone ===============
    try {
      if (place.pineconeId) {
        // Check if need to regenerate embedding
        const textChanged = updateData.name || updateData.description || 
                           updateData.category || updateData.tags;
        
        let embedding = null;
        if (textChanged) {
          console.log(`🔄 [PINECONE] Regenerating embedding...`);
          embedding = await generateEmbedding(
            `${place.name} ${place.description} ${place.category} ${place.tags?.join(' ') || ''} ${place.address || ''}`
          );
        }

        // Update Pinecone data
        // Only upsert if we have new embedding, otherwise just metadata won't work
        if (!embedding) {
          console.log('   ℹ️  No text change, skipping Pinecone update');
          place.syncStatus = 'synced';  // Keep as synced since no change needed
          await place.save();
        } else {
          const pineconeData = {
            id: place.pineconeId,
            values: embedding,
            metadata: {
              mongoId: place._id.toString(),
              name: place.name,
              description: place.description,
              address: place.address || '',
              latitude: place.latitude,
              longitude: place.longitude,
              category: place.category,
              tags: place.tags || [],
              priority: place.priority,
              status: place.status,
              isPartner: true,
              rating: place.rating || 0,
              reviewCount: place.reviewCount || 0,
              priceRange: place.priceRange || '',
              averagePrice: place.averagePrice || 0,
              updatedAt: new Date().toISOString()
            }
          };

          const result = await pineconeService.upsertVectors([pineconeData]);
          
          if (result.success) {
            await place.markSyncSuccess(place.pineconeId);
            console.log(`✅ [PINECONE] Đã sync`);
          } else {
            await place.markSyncFailed(result.message);
          }
        }
      }
    } catch (pineconeError) {
      console.error('❌ [PINECONE] Lỗi sync:', pineconeError.message);
      await place.markSyncFailed(pineconeError.message);
    }

    return {
      success: true,
      data: {
        id: place._id,
        syncStatus: place.syncStatus,
        message: 'Đã cập nhật thành công'
      }
    };

  } catch (error) {
    console.error('❌ [SERVICE] Lỗi cập nhật:', error);
    return {
      success: false,
      message: `Lỗi cập nhật: ${error.message}`
    };
  }
};

/**
 * Deactivate a partner place (soft delete)
 * @param {String} placeId - Place MongoDB ID
 * @param {String} userId - Admin user ID (optional)
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
const deactivatePartnerPlace = async (placeId, userId = null) => {
  try {
    console.log(`🗑️ [PARTNER] Vô hiệu hóa: ${placeId}`);
    
    const result = await updatePartnerPlace(placeId, {
      status: 'inactive',
      deactivatedAt: new Date(),
      deactivatedBy: userId
    }, userId);

    if (result.success) {
      return {
        success: true,
        data: {
          id: placeId,
          message: 'Địa điểm đối tác đã được vô hiệu hóa'
        }
      };
    }
    
    return result;

  } catch (error) {
    console.error('❌ [SERVICE] Lỗi vô hiệu hóa:', error);
    return {
      success: false,
      message: `Lỗi vô hiệu hóa: ${error.message}`
    };
  }
};

/**
 * Delete a partner place permanently
 * @param {String} placeId - Place MongoDB ID
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
const deletePartnerPlace = async (placeId) => {
  try {
    console.log(`🗑️ [PARTNER] Xóa vĩnh viễn: ${placeId}`);
    
    const place = await PartnerPlace.findById(placeId);
    
    if (!place) {
      return {
        success: false,
        message: 'Không tìm thấy địa điểm'
      };
    }

    // Delete from Pinecone first
    if (place.pineconeId) {
      try {
        await pineconeService.deleteVectors([place.pineconeId]);
        console.log(`✅ [PINECONE] Đã xóa: ${place.pineconeId}`);
      } catch (pineconeError) {
        console.warn('⚠️ [PINECONE] Lỗi xóa:', pineconeError.message);
        // Continue anyway - MongoDB delete is more important
      }
    }

    // Delete from MongoDB
    await PartnerPlace.findByIdAndDelete(placeId);
    console.log(`✅ [MONGODB] Đã xóa: ${placeId}`);

    return {
      success: true,
      data: {
        id: placeId,
        message: 'Đã xóa thành công'
      }
    };

  } catch (error) {
    console.error('❌ [SERVICE] Lỗi xóa:', error);
    return {
      success: false,
      message: `Lỗi xóa: ${error.message}`
    };
  }
};

/**
 * Retry failed syncs (manual trigger hoặc cron job)
 * @param {Number} limit - Max số lượng retry
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
const retryFailedSyncs = async (limit = 10) => {
  try {
    console.log('🔄 [SYNC] Retry failed syncs...');
    
    const failedPlaces = await PartnerPlace.findNeedingSync(limit);

    if (failedPlaces.length === 0) {
      return {
        success: true,
        data: {
          total: 0,
          success: 0,
          failed: 0,
          message: 'Không có địa điểm cần sync'
        }
      };
    }

    let successCount = 0;
    let failCount = 0;

    for (const place of failedPlaces) {
      try {
        const pineconeId = place.pineconeId || `partner_${place._id}`;
        
        // Generate embedding
        const embedding = await generateEmbedding(
          `${place.name} ${place.description} ${place.category} ${place.tags?.join(' ') || ''} ${place.address || ''}`
        );

        // Prepare Pinecone data
        const pineconeData = {
          id: pineconeId,
          values: embedding,
          metadata: {
            mongoId: place._id.toString(),
            name: place.name,
            description: place.description,
            address: place.address || '',
            latitude: place.latitude,
            longitude: place.longitude,
            category: place.category,
            tags: place.tags || [],
            priority: place.priority,
            status: place.status,
            isPartner: true,
            rating: place.rating || 0,
            reviewCount: place.reviewCount || 0,
            priceRange: place.priceRange || '',
            averagePrice: place.averagePrice || 0
          }
        };

        // Upsert to Pinecone
        const result = await pineconeService.upsertVectors([pineconeData]);
        
        if (result.success) {
          await place.markSyncSuccess(pineconeId);
          successCount++;
          console.log(`✅ [RETRY] Success: ${place.name}`);
        } else {
          await place.markSyncFailed(result.message);
          failCount++;
          console.log(`❌ [RETRY] Failed: ${place.name}`);
        }
      } catch (error) {
        console.error(`❌ [RETRY] Error for ${place._id}:`, error);
        await place.markSyncFailed(error.message);
        failCount++;
      }
    }

    return {
      success: true,
      data: {
        total: failedPlaces.length,
        success: successCount,
        failed: failCount,
        message: `Đã retry ${failedPlaces.length} địa điểm: ${successCount} thành công, ${failCount} thất bại`
      }
    };

  } catch (error) {
    console.error('❌ [SYNC] Lỗi retry syncs:', error);
    return {
      success: false,
      message: `Lỗi retry syncs: ${error.message}`
    };
  }
};

/**
 * Get sync statistics
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
const getSyncStats = async () => {
  try {
    const stats = await PartnerPlace.getSyncStats();
    
    return {
      success: true,
      data: {
        ...stats,
        syncRate: stats.total > 0 ? ((stats.synced / stats.total) * 100).toFixed(2) + '%' : '0%',
        lastCheck: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ [SYNC] Lỗi lấy stats:', error);
    return {
      success: false,
      message: `Lỗi lấy sync stats: ${error.message}`
    };
  }
};

/**
 * Generate embedding using Google AI text-embedding-004
 * @param {String} text - Text to embed
 * @returns {Promise<Array>} - Embedding vector (768 dimensions)
 */
const generateEmbedding = async (text) => {
  try {
    const apiKey = process.env.GEMINIAPIKEY;
    if (!apiKey) {
      throw new Error('GEMINIAPIKEY không được cấu hình trong file .env');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);

    return result.embedding.values;
  } catch (error) {
    console.error('❌ [EMBEDDING] Lỗi tạo embedding:', error);
    throw new Error(`Không thể tạo embedding: ${error.message}`);
  }
};

export default {
  addPartnerPlace,
  getAllPartnerPlaces,
  getPartnerPlaceById,
  updatePartnerPlace,
  deactivatePartnerPlace,
  deletePartnerPlace,
  retryFailedSyncs,
  getSyncStats
};
