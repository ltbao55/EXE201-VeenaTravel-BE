import partnerPlacesService from '../services/partner-places-service.js';

/**
 * =================================================================
 * Admin Controller for Partner Places Management
 * =================================================================
 * Handles HTTP requests for managing partner places in the system.
 * Uses MongoDB as primary storage with auto-sync to Pinecone.
 * =================================================================
 */

/**
 * Get all partner places
 * GET /api/admin/partner-places
 */
const getAllPartnerPlaces = async (req, res) => {
  try {
    const { category, status, limit, page, minRating, sortBy, sortOrder, search } = req.query;
    
    const options = {
      category: category || null,
      status: status || 'active',
      limit: parseInt(limit) || 50,
      page: parseInt(page) || 1,
      minRating: minRating ? parseFloat(minRating) : null,
      sortBy: sortBy || 'priority',
      sortOrder: sortOrder || 'desc',
      search: search || null
    };

    const result = await partnerPlacesService.getAllPartnerPlaces(options);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách địa điểm đối tác thành công',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ Lỗi controller getAllPartnerPlaces:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách địa điểm đối tác'
    });
  }
};

/**
 * Get a single partner place by ID
 * GET /api/admin/partner-places/:id
 */
const getPartnerPlaceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID địa điểm đối tác là bắt buộc'
      });
    }

    const result = await partnerPlacesService.getPartnerPlaceById(id);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Lấy thông tin địa điểm đối tác thành công',
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ Lỗi controller getPartnerPlaceById:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin địa điểm đối tác'
    });
  }
};

/**
 * Add a new partner place
 * POST /api/admin/partner-places
 */
const addPartnerPlace = async (req, res) => {
  try {
    const placeData = req.body;
    const userId = req.user?._id || req.user?.uid || null;  // From auth middleware

    // Validate required fields
    const requiredFields = ['name', 'description', 'latitude', 'longitude', 'category'];
    const missingFields = requiredFields.filter(field => !placeData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Thiếu thông tin bắt buộc: ${missingFields.join(', ')}`
      });
    }

    const result = await partnerPlacesService.addPartnerPlace(placeData, userId);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Thêm địa điểm đối tác thành công',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ Lỗi controller addPartnerPlace:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi thêm địa điểm đối tác'
    });
  }
};

/**
 * Update a partner place
 * PUT /api/admin/partner-places/:id
 */
const updatePartnerPlace = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user?._id || req.user?.uid || null;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID địa điểm đối tác là bắt buộc'
      });
    }

    const result = await partnerPlacesService.updatePartnerPlace(id, updateData, userId);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Cập nhật địa điểm đối tác thành công',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ Lỗi controller updatePartnerPlace:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật địa điểm đối tác'
    });
  }
};

/**
 * Deactivate a partner place (soft delete)
 * PATCH /api/admin/partner-places/:id/deactivate
 */
const deactivatePartnerPlace = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.uid || null;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID địa điểm đối tác là bắt buộc'
      });
    }

    const result = await partnerPlacesService.deactivatePartnerPlace(id, userId);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Vô hiệu hóa địa điểm đối tác thành công',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ Lỗi controller deactivatePartnerPlace:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi vô hiệu hóa địa điểm đối tác'
    });
  }
};

/**
 * Delete a partner place permanently
 * DELETE /api/admin/partner-places/:id
 */
const deletePartnerPlace = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID địa điểm đối tác là bắt buộc'
      });
    }

    const result = await partnerPlacesService.deletePartnerPlace(id);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Xóa địa điểm đối tác thành công',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ Lỗi controller deletePartnerPlace:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa địa điểm đối tác'
    });
  }
};

/**
 * Get sync status statistics
 * GET /api/admin/partner-places/sync-status
 */
const getSyncStatus = async (req, res) => {
  try {
    const result = await partnerPlacesService.getSyncStats();

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Lấy trạng thái đồng bộ thành công',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ Lỗi controller getSyncStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy trạng thái đồng bộ'
    });
  }
};

/**
 * Manually retry failed syncs
 * POST /api/admin/partner-places/retry-sync
 */
const retrySyncManual = async (req, res) => {
  try {
    const { limit } = req.body;
    const result = await partnerPlacesService.retryFailedSyncs(limit || 10);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Retry đồng bộ thành công',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ Lỗi controller retrySyncManual:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi retry đồng bộ'
    });
  }
};

export default {
  getAllPartnerPlaces,
  getPartnerPlaceById,
  addPartnerPlace,
  updatePartnerPlace,
  deactivatePartnerPlace,
  deletePartnerPlace,
  getSyncStatus,
  retrySyncManual
};
