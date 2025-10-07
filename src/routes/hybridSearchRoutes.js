import express from 'express';
import hybridSearchController from '../controllers/hybridSearchController.js';

const router = express.Router();

/**
 * =================================================================
 * Hybrid Search Routes
 * =================================================================
 * Base Path: /api/hybrid-search
 * 
 * Provides endpoints for the hybrid search functionality that combines
 * partner places from Pinecone with general places from Google Maps.
 * =================================================================
 */

// Main hybrid search endpoint
router.post('/search', hybridSearchController.hybridSearch);

// Search with location context
router.post('/search-near', hybridSearchController.searchNearLocation);

// Get search statistics and health
router.get('/stats', hybridSearchController.getSearchStats);

// Get system health status
router.get('/health', hybridSearchController.getHealthStatus);

// Cache management endpoints
router.delete('/cache', hybridSearchController.clearCache);
router.get('/cache/stats', hybridSearchController.getCacheStats);

// Logging endpoints
router.get('/logs', hybridSearchController.getRecentLogs);

export default router;
