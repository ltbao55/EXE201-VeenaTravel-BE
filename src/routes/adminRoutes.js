import express from 'express';
import adminController from '../controllers/adminController.js';
// import { protect, admin } from '../middleware/auth.js'; // Middleware for security

const router = express.Router();

/**
 * =================================================================
 * Admin Routes for Partner Places Management
 * =================================================================
 * Base Path: /api/admin/partner-places
 * 
 * Security Note: These endpoints should be protected by authentication
 * and authorization middleware (e.g., protect, admin) in a production environment.
 * 
 * Storage Architecture:
 * - MongoDB = Source of Truth (primary storage)
 * - Pinecone = Search Index (auto-synced from MongoDB)
 * =================================================================
 */

// ============= Sync Management =============
// NOTE: These must come BEFORE /:id routes to avoid parameter conflicts

// Get sync status statistics (synced/pending/failed counts)
router.get('/sync-status', adminController.getSyncStatus);

// Manually trigger retry for failed syncs
router.post('/retry-sync', adminController.retrySyncManual);

// ============= CRUD Operations =============

// Get all partner places (with pagination, filters, search)
router.get('/', adminController.getAllPartnerPlaces);

// Get a single partner place by ID
router.get('/:id', adminController.getPartnerPlaceById);

// Add a new partner place (saves to MongoDB → auto-syncs to Pinecone)
router.post('/', adminController.addPartnerPlace);

// Update a partner place (updates MongoDB → auto-syncs to Pinecone)
router.put('/:id', adminController.updatePartnerPlace);

// Deactivate (soft delete) a partner place
router.patch('/:id/deactivate', adminController.deactivatePartnerPlace);

// Delete a partner place permanently (deletes from both MongoDB and Pinecone)
router.delete('/:id', adminController.deletePartnerPlace);

export default router;
