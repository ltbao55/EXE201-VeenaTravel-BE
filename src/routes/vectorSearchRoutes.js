import express from 'express';
import {
  semanticSearch,
  findSimilarPlaces,
  getPineconeIndexStats,
  searchByTagsVector
} from '../controllers/placesController.js';

const router = express.Router();

router.post('/semantic-search', semanticSearch);
router.get('/similar-places/:id', findSimilarPlaces);
router.get('/pinecone-stats', getPineconeIndexStats);
router.post('/search-by-tags', searchByTagsVector);

export default router;
