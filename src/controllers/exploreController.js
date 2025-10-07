import Place from "../models/Place.js";
// Reviews are not included per latest request
import googlemapsService from "../services/googlemaps-service.js";
import cacheService from "../services/cache-service.js";

/**
 * GET /api/explore
 * Fetch curated places for Explore screen with filters and pagination
 * Query params:
 *  - page, limit
 *  - city: match by address contains city (case-insensitive)
 *  - category: restaurant|attraction|hotel|...
 *  - q: text search over name/description/tags
 *  - minRating: number 0..5
 *  - sort: rating|recent|popular (popular = rating.count desc)
 */
export const getExplorePlaces = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 24, 1), 100);
    const skip = (page - 1) * limit;

    const { city, category, q, minRating, sort } = req.query;
    const random = String(req.query.random || "false").toLowerCase() === "true";
    const includeExternalReviews = false;

    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (typeof minRating !== "undefined") {
      const value = Number(minRating);
      if (!Number.isNaN(value)) {
        filter["rating.average"] = { $gte: value };
      }
    }

    // City filter: simple case-insensitive address match
    if (city) {
      filter.address = { $regex: city, $options: "i" };
    }

    let items;
    let total;

    if (random) {
      // Random sample with filters applied
      const pipeline = [];
      if (q) pipeline.push({ $match: { $text: { $search: q }, ...filter } });
      else pipeline.push({ $match: filter });
      pipeline.push({ $sample: { size: limit } });
      items = await Place.aggregate(pipeline);
      total = await Place.countDocuments(filter);
    } else {
      const query = q
        ? Place.find({ $text: { $search: q }, ...filter })
        : Place.find(filter);

      // Sorting
      if (sort === "rating") {
        query.sort({ "rating.average": -1, "rating.count": -1 });
      } else if (sort === "popular") {
        query.sort({ "rating.count": -1, "rating.average": -1 });
      } else {
        // recent
        query.sort({ updatedAt: -1 });
      }

      const [docs, count] = await Promise.all([
        query.skip(skip).limit(limit).lean(),
        Place.countDocuments(filter)
      ]);
      items = docs;
      total = count;
    }

    const mapped = items.map((p) => {
      return {
        id: p._id,
        title: p.name,
        description: p.description,
        category: p.category,
        address: p.address,
        coordinates: { lat: p.location?.lat, lng: p.location?.lng },
        rating: { average: p.rating?.average || 0, count: p.rating?.count || 0 },
        tags: p.tags || [],
        images: Array.isArray(p.images) ? p.images : [],
        photoUrl: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
        addedAt: p.createdAt,
        updatedAt: p.updatedAt
      };
    });

    // External reviews disabled

    return res.status(200).json({
      success: true,
      message: "Explore places fetched successfully",
      data: {
        items: mapped,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        filters: { city: city || null, category: category || null, q: q || null, minRating: typeof minRating !== "undefined" ? Number(minRating) : null, sort: sort || "recent", random, includeExternalReviews }
      }
    });
  } catch (error) {
    console.error("Explore API error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch explore places" });
  }
};

export default { getExplorePlaces };


