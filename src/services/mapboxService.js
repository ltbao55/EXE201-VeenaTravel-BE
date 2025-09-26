const axios = require('axios');
const DirectionsService = require('./directionsService');

/**
 * Service tích hợp để tính toán ma trận thời gian di chuyển và routing
 * sử dụng Mapbox Matrix API và Directions API theo tài liệu chính thức
 *
 * Matrix API Documentation: https://docs.mapbox.com/api/navigation/matrix/
 * Directions API Documentation: https://docs.mapbox.com/api/navigation/directions/
 */
class MapboxService {
    constructor() {
        this.accessToken = process.env.MAPBOX_ACCESS_TOKEN;
        this.baseUrl = 'https://api.mapbox.com/directions-matrix/v1';

        // Tích hợp DirectionsService
        this.directionsService = new DirectionsService();

        if (!this.accessToken) {
            throw new Error('MAPBOX_ACCESS_TOKEN is required in environment variables');
        }
    }

    /**
     * Tính ma trận thời gian di chuyển giữa các địa điểm theo API chính thức
     * @param {Array} locations - Mảng các địa điểm với format [{longitude, latitude, name?}, ...]
     * @param {Object} options - Tùy chọn cho API
     * @param {string} options.profile - Profile routing (driving, walking, cycling, driving-traffic)
     * @param {string} options.annotations - duration, distance, hoặc cả hai (mặc định: duration)
     * @param {Array} options.sources - Chỉ mục các điểm nguồn
     * @param {Array} options.destinations - Chỉ mục các điểm đích
     * @param {string} options.approaches - unrestricted hoặc curb
     * @param {number} options.fallback_speed - Tốc độ dự phòng (km/h)
     * @returns {Promise<Object>} Ma trận thời gian và khoảng cách
     */
    async getMatrix(locations, options = {}) {
        try {
            // Validate input theo tài liệu API
            if (!Array.isArray(locations) || locations.length < 2) {
                throw new Error('Cần ít nhất 2 địa điểm để tính ma trận');
            }

            // Kiểm tra giới hạn theo profile
            const profile = options.profile || 'driving';
            const maxCoordinates = profile === 'driving-traffic' ? 10 : 25;
            
            if (locations.length > maxCoordinates) {
                throw new Error(`Tối đa ${maxCoordinates} địa điểm cho profile ${profile}`);
            }

            // Validate coordinates
            for (const location of locations) {
                if (!this.isValidCoordinate(location)) {
                    throw new Error(`Tọa độ không hợp lệ: ${JSON.stringify(location)}`);
                }
            }

            // Build coordinates string theo format API: {longitude},{latitude};{longitude},{latitude}
            const coordinates = locations
                .map(loc => `${loc.longitude},${loc.latitude}`)
                .join(';');

            // Validate profile
            const validProfiles = ['driving', 'walking', 'cycling', 'driving-traffic'];
            if (!validProfiles.includes(profile)) {
                throw new Error(`Profile không hợp lệ: ${profile}. Chỉ hỗ trợ: ${validProfiles.join(', ')}`);
            }

            // Build URL theo format chính thức
            let url = `${this.baseUrl}/mapbox/${profile}/${coordinates}`;
            
            // Build query parameters
            const params = new URLSearchParams({
                access_token: this.accessToken,
                annotations: options.annotations || 'duration'
            });

            // Add optional parameters theo tài liệu
            if (options.sources) {
                params.append('sources', Array.isArray(options.sources) 
                    ? options.sources.join(';') 
                    : options.sources);
            }

            if (options.destinations) {
                params.append('destinations', Array.isArray(options.destinations) 
                    ? options.destinations.join(';') 
                    : options.destinations);
            }

            if (options.approaches) {
                params.append('approaches', options.approaches);
            }

            if (options.fallback_speed) {
                params.append('fallback_speed', options.fallback_speed);
            }

            url += `?${params.toString()}`;

            console.log(`Gọi Mapbox Matrix API: ${profile} profile cho ${locations.length} địa điểm`);

            const response = await axios.get(url, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'VeenaTravel/1.0'
                }
            });

            // Kiểm tra response code theo tài liệu API
            if (response.data.code !== 'Ok') {
                throw new Error(`Mapbox API error: ${response.data.code} - ${response.data.message || 'Unknown error'}`);
            }

            return this.formatMatrixResponse(response.data, locations);

        } catch (error) {
            console.error('Mapbox Matrix API error:', error.message);
            
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
                
                // Xử lý các lỗi theo tài liệu API
                const status = error.response.status;
                const errorData = error.response.data;
                
                if (status === 401) {
                    throw new Error('Lỗi xác thực: Kiểm tra MAPBOX_ACCESS_TOKEN');
                } else if (status === 403) {
                    throw new Error('Lỗi quyền truy cập: Kiểm tra tài khoản Mapbox');
                } else if (status === 404) {
                    throw new Error('Profile không tồn tại');
                } else if (status === 422) {
                    throw new Error(`Dữ liệu đầu vào không hợp lệ: ${errorData.message || 'Unknown validation error'}`);
                }
                
                throw new Error(`Mapbox API error (${status}): ${errorData.message || error.message}`);
            }
            
            throw error;
        }
    }

    /**
     * Tính lộ trình tối ưu giữa nhiều địa điểm sử dụng thuật toán Nearest Neighbor
     * @param {Array} locations - Mảng các địa điểm
     * @param {Object} options - Tùy chọn
     * @param {number} options.startIndex - Chỉ mục điểm bắt đầu (mặc định: 0)
     * @returns {Promise<Object>} Lộ trình tối ưu và tổng thời gian
     */
    async getOptimalRoute(locations, options = {}) {
        try {
            if (locations.length < 2) {
                throw new Error('Cần ít nhất 2 địa điểm để tính lộ trình');
            }

            // Lấy ma trận thời gian và khoảng cách
            const matrixResult = await this.getMatrix(locations, {
                ...options,
                annotations: 'duration,distance'
            });

            // Áp dụng thuật toán Nearest Neighbor
            const startIndex = options.startIndex || 0;
            const route = this.findOptimalRoute(matrixResult.durations, startIndex);
            
            // Tính tổng thời gian và khoảng cách
            let totalDuration = 0;
            let totalDistance = 0;
            
            for (let i = 0; i < route.length - 1; i++) {
                const from = route[i];
                const to = route[i + 1];
                totalDuration += matrixResult.durations[from][to] || 0;
                totalDistance += matrixResult.distances[from][to] || 0;
            }

            return {
                route: route.map(index => ({
                    index,
                    location: locations[index]
                })),
                totalDuration,
                totalDistance,
                totalDurationFormatted: this.formatDuration(totalDuration),
                totalDistanceFormatted: this.formatDistance(totalDistance),
                matrix: matrixResult
            };

        } catch (error) {
            console.error('Error calculating optimal route:', error.message);
            throw error;
        }
    }

    /**
     * Thuật toán Nearest Neighbor để tìm lộ trình ngắn nhất
     * @param {Array} durations - Ma trận thời gian
     * @param {number} startIndex - Chỉ mục điểm bắt đầu
     * @returns {Array} Mảng chỉ mục theo thứ tự tối ưu
     */
    findOptimalRoute(durations, startIndex = 0) {
        const n = durations.length;
        if (n <= 2) return Array.from({length: n}, (_, i) => i);

        const visited = new Set();
        const route = [startIndex];
        visited.add(startIndex);

        let current = startIndex;
        
        // Thuật toán nearest neighbor
        while (visited.size < n) {
            let nearest = -1;
            let minDuration = Infinity;

            for (let i = 0; i < n; i++) {
                if (!visited.has(i) && durations[current][i] !== null) {
                    if (durations[current][i] < minDuration) {
                        minDuration = durations[current][i];
                        nearest = i;
                    }
                }
            }

            if (nearest !== -1) {
                route.push(nearest);
                visited.add(nearest);
                current = nearest;
            } else {
                // Nếu không tìm thấy điểm kế tiếp, thêm điểm chưa thăm đầu tiên
                for (let i = 0; i < n; i++) {
                    if (!visited.has(i)) {
                        route.push(i);
                        visited.add(i);
                        current = i;
                        break;
                    }
                }
            }
        }

        return route;
    }

    /**
     * Format response từ Mapbox API theo cấu trúc chuẩn
     * @param {Object} data - Raw response từ Mapbox
     * @param {Array} locations - Mảng địa điểm gốc
     * @returns {Object} Formatted response
     */
    formatMatrixResponse(data, locations) {
        return {
            code: data.code,
            durations: data.durations,
            distances: data.distances,
            sources: data.sources?.map((source, index) => ({
                ...source,
                originalLocation: locations[index]
            })),
            destinations: data.destinations?.map((dest, index) => ({
                ...dest,
                originalLocation: locations[index]
            })),
            locationCount: locations.length,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Validate tọa độ theo chuẩn Mapbox
     * @param {Object} location - Địa điểm cần validate
     * @returns {boolean}
     */
    isValidCoordinate(location) {
        if (!location || typeof location !== 'object') return false;
        
        const { longitude, latitude } = location;
        
        return (
            typeof longitude === 'number' &&
            typeof latitude === 'number' &&
            longitude >= -180 && longitude <= 180 &&
            latitude >= -90 && latitude <= 90 &&
            !isNaN(longitude) && !isNaN(latitude)
        );
    }

    /**
     * Chuyển đổi thời gian từ giây sang định dạng dễ đọc
     * @param {number} seconds - Thời gian tính bằng giây
     * @returns {string} Thời gian định dạng
     */
    formatDuration(seconds) {
        if (!seconds || seconds === null) return 'N/A';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    /**
     * Chuyển đổi khoảng cách từ mét sang km
     * @param {number} meters - Khoảng cách tính bằng mét
     * @returns {string} Khoảng cách định dạng
     */
    formatDistance(meters) {
        if (!meters || meters === null) return 'N/A';

        if (meters >= 1000) {
            return `${(meters / 1000).toFixed(1)} km`;
        }
        return `${Math.round(meters)} m`;
    }

    /**
     * Lấy thông tin giới hạn API theo tài liệu chính thức
     * @returns {Object} Thông tin giới hạn
     */
    getApiLimits() {
        return {
            maxCoordinates: {
                driving: 25,
                walking: 25,
                cycling: 25,
                'driving-traffic': 10
            },
            maxRequestsPerMinute: {
                driving: 60,
                walking: 60,
                cycling: 60,
                'driving-traffic': 30
            },
            maxElements: 625, // 25 x 25
            minCoordinates: 2
        };
    }

    /**
     * Kiểm tra kết nối với Mapbox API
     * @returns {Promise<boolean>} True nếu kết nối thành công
     */
    async testConnection() {
        try {
            // Test với 2 tọa độ đơn giản (Hà Nội và TP.HCM)
            const testLocations = [
                { longitude: 105.8542, latitude: 21.0285, name: 'Hà Nội' },
                { longitude: 106.6297, latitude: 10.8231, name: 'TP.HCM' }
            ];

            const result = await this.getMatrix(testLocations, {
                profile: 'driving',
                annotations: 'duration'
            });

            return result && result.code === 'Ok';

        } catch (error) {
            console.error('Mapbox connection test failed:', error.message);
            return false;
        }
    }

    /**
     * Chuyển đổi địa điểm từ format khác sang format Mapbox
     * @param {Array} places - Mảng địa điểm với format khác nhau
     * @returns {Array} Mảng địa điểm với format chuẩn Mapbox
     */
    convertToMapboxFormat(places) {
        return places.map(place => {
            let longitude, latitude, name;

            // Xử lý các format khác nhau
            if (place.location && place.location.coordinates) {
                // MongoDB GeoJSON format: [lng, lat]
                [longitude, latitude] = place.location.coordinates;
                name = place.name || place.title || 'Unknown';
            } else if (place.coordinates) {
                // Direct coordinates array
                [longitude, latitude] = place.coordinates;
                name = place.name || place.title || 'Unknown';
            } else if (place.lng && place.lat) {
                // Direct lng/lat properties
                longitude = place.lng;
                latitude = place.lat;
                name = place.name || place.title || 'Unknown';
            } else if (place.longitude && place.latitude) {
                // longitude/latitude properties
                longitude = place.longitude;
                latitude = place.latitude;
                name = place.name || place.title || 'Unknown';
            } else {
                throw new Error(`Không thể chuyển đổi địa điểm: ${JSON.stringify(place)}`);
            }

            return {
                longitude,
                latitude,
                name,
                originalData: place
            };
        });
    }

    // ========== TÍCH HỢP DIRECTIONS API ==========

    /**
     * Lấy tuyến đường chi tiết giữa các điểm (sử dụng Directions API)
     * @param {Array} places - Mảng địa điểm
     * @param {Object} options - Tùy chọn routing
     * @returns {Promise<Object>} Thông tin tuyến đường chi tiết
     */
    async getDetailedRoute(places, options = {}) {
        try {
            const coordinates = this.convertToMapboxFormat(places);
            return await this.directionsService.getDirections(coordinates, options);
        } catch (error) {
            console.error('Error getting detailed route:', error.message);
            throw error;
        }
    }

    /**
     * Lập kế hoạch trip hoàn chỉnh kết hợp Matrix và Directions API
     * @param {Array} places - Mảng địa điểm
     * @param {Object} options - Tùy chọn trip planning
     * @param {boolean} options.optimize - Có tối ưu hóa thứ tự không
     * @param {string} options.transportMode - Phương tiện di chuyển
     * @param {boolean} options.includeMatrix - Có bao gồm ma trận thời gian không
     * @param {boolean} options.includeInstructions - Có bao gồm hướng dẫn chi tiết không
     * @returns {Promise<Object>} Kế hoạch trip hoàn chỉnh
     */
    async planCompleteTrip(places, options = {}) {
        try {
            console.log(`Lập kế hoạch trip cho ${places.length} địa điểm`);

            const coordinates = this.convertToMapboxFormat(places);
            const results = {};

            // 1. Lấy ma trận thời gian nếu được yêu cầu
            if (options.includeMatrix !== false && places.length <= 10) {
                console.log('Tính ma trận thời gian...');
                results.matrix = await this.getMatrix(coordinates, {
                    profile: options.transportMode || 'driving',
                    annotations: 'duration,distance'
                });
            }

            // 2. Lập kế hoạch trip với directions
            console.log('Lập kế hoạch tuyến đường...');
            results.tripPlan = await this.directionsService.planTrip(places, {
                transportMode: options.transportMode || 'driving',
                optimize: options.optimize || false,
                startPlaceIndex: options.startPlaceIndex || 0
            });

            // 3. Lấy hướng dẫn chi tiết nếu được yêu cầu
            if (options.includeInstructions) {
                console.log('Tạo hướng dẫn chi tiết...');
                const instructionCoordinates = results.tripPlan.optimized
                    ? results.tripPlan.optimizedOrder.map(index => coordinates[index])
                    : coordinates;

                results.instructions = await this.directionsService.getTurnByTurnInstructions(
                    instructionCoordinates,
                    {
                        profile: options.transportMode || 'driving',
                        language: 'vi'
                    }
                );
            }

            // 4. Tổng hợp thông tin
            const summary = this.createTripSummary(results, places, options);

            return {
                ...results,
                summary,
                requestOptions: options,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error planning complete trip:', error.message);
            throw error;
        }
    }

    /**
     * Tạo tóm tắt trip
     * @param {Object} results - Kết quả từ các API
     * @param {Array} places - Mảng địa điểm gốc
     * @param {Object} options - Tùy chọn gốc
     * @returns {Object} Tóm tắt trip
     */
    createTripSummary(results, places, options) {
        const summary = {
            totalPlaces: places.length,
            transportMode: options.transportMode || 'driving',
            optimized: options.optimize || false,
            hasMatrix: !!results.matrix,
            hasInstructions: !!results.instructions
        };

        // Thông tin từ trip plan
        if (results.tripPlan && results.tripPlan.tripInfo) {
            const tripInfo = results.tripPlan.tripInfo;
            summary.totalDuration = tripInfo.totalDuration;
            summary.totalDurationFormatted = tripInfo.totalDurationFormatted;
            summary.totalDistance = tripInfo.totalDistance;
            summary.totalDistanceFormatted = tripInfo.totalDistanceFormatted;
            summary.estimatedCost = tripInfo.estimatedFuelCost;
            summary.complexity = tripInfo.routeComplexity;
        }

        // Thông tin từ matrix (nếu có)
        if (results.matrix) {
            summary.matrixCalculated = true;
            summary.matrixSize = `${results.matrix.locationCount}x${results.matrix.locationCount}`;
        }

        // Thông tin từ instructions (nếu có)
        if (results.instructions) {
            summary.totalSteps = results.instructions.totalSteps;
            summary.hasVoiceInstructions = true;
        }

        return summary;
    }

    /**
     * So sánh các phương tiện di chuyển khác nhau
     * @param {Array} places - Mảng địa điểm
     * @param {Array} transportModes - Mảng các phương tiện cần so sánh
     * @returns {Promise<Object>} Kết quả so sánh
     */
    async compareTransportModes(places, transportModes = ['driving', 'walking', 'cycling']) {
        try {
            console.log(`So sánh ${transportModes.length} phương tiện di chuyển`);

            const coordinates = this.convertToMapboxFormat(places);
            const comparisons = {};

            // Tính toán cho từng phương tiện
            for (const mode of transportModes) {
                try {
                    console.log(`Tính toán cho phương tiện: ${mode}`);

                    const profile = mode === 'driving' ? 'driving-traffic' : mode;
                    const result = await this.directionsService.getDirections(coordinates, {
                        profile,
                        steps: false
                    });

                    if (result.routes && result.routes.length > 0) {
                        const route = result.routes[0];
                        comparisons[mode] = {
                            duration: route.duration,
                            durationFormatted: this.formatDuration(route.duration),
                            distance: route.distance,
                            distanceFormatted: this.formatDistance(route.distance),
                            profile: profile
                        };
                    }
                } catch (error) {
                    console.warn(`Không thể tính toán cho phương tiện ${mode}:`, error.message);
                    comparisons[mode] = {
                        error: error.message,
                        available: false
                    };
                }
            }

            // Tìm phương tiện tốt nhất
            const bestOption = this.findBestTransportOption(comparisons);

            return {
                comparisons,
                bestOption,
                recommendations: this.getTransportRecommendations(comparisons),
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error comparing transport modes:', error.message);
            throw error;
        }
    }

    /**
     * Tìm phương tiện tốt nhất
     * @param {Object} comparisons - Kết quả so sánh
     * @returns {Object} Phương tiện tốt nhất
     */
    findBestTransportOption(comparisons) {
        const validOptions = Object.entries(comparisons)
            .filter(([_, data]) => !data.error && data.duration)
            .sort(([_, a], [__, b]) => a.duration - b.duration);

        if (validOptions.length === 0) {
            return { mode: null, reason: 'Không có phương tiện khả dụng' };
        }

        const [bestMode, bestData] = validOptions[0];
        return {
            mode: bestMode,
            duration: bestData.duration,
            durationFormatted: bestData.durationFormatted,
            distance: bestData.distance,
            distanceFormatted: bestData.distanceFormatted,
            reason: 'Thời gian di chuyển ngắn nhất'
        };
    }

    /**
     * Đưa ra khuyến nghị về phương tiện
     * @param {Object} comparisons - Kết quả so sánh
     * @returns {Array} Mảng khuyến nghị
     */
    getTransportRecommendations(comparisons) {
        const recommendations = [];

        // Kiểm tra từng phương tiện
        Object.entries(comparisons).forEach(([mode, data]) => {
            if (data.error) return;

            const distanceKm = data.distance / 1000;
            const durationHours = data.duration / 3600;

            if (mode === 'walking') {
                if (distanceKm <= 2) {
                    recommendations.push(`Đi bộ phù hợp cho khoảng cách ngắn (${data.distanceFormatted})`);
                } else {
                    recommendations.push(`Đi bộ khá xa (${data.distanceFormatted}), cân nhắc phương tiện khác`);
                }
            } else if (mode === 'cycling') {
                if (distanceKm <= 10) {
                    recommendations.push(`Xe đạp là lựa chọn tốt cho khoảng cách trung bình (${data.distanceFormatted})`);
                }
            } else if (mode === 'driving') {
                if (durationHours > 8) {
                    recommendations.push(`Lái xe khá lâu (${data.durationFormatted}), nên nghỉ giữa đường`);
                }
            }
        });

        return recommendations;
    }
}

module.exports = MapboxService;
