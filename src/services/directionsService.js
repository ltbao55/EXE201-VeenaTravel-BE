const axios = require('axios');

/**
 * Service để xử lý routing và directions sử dụng Mapbox Directions API
 * 
 * API Documentation: https://docs.mapbox.com/api/navigation/directions/
 * Format: GET https://api.mapbox.com/directions/v5/{profile}/{coordinates}
 */
class DirectionsService {
    constructor() {
        this.accessToken = process.env.MAPBOX_ACCESS_TOKEN;
        this.baseUrl = 'https://api.mapbox.com/directions/v5';
        
        if (!this.accessToken) {
            throw new Error('MAPBOX_ACCESS_TOKEN is required in environment variables');
        }
    }

    /**
     * Tính toán tuyến đường tối ưu giữa các điểm theo tài liệu chính thức
     * @param {Array} coordinates - Mảng tọa độ [{longitude, latitude}, ...]
     * @param {Object} options - Tùy chọn cho API
     * @param {string} options.profile - Profile routing (driving-traffic, driving, walking, cycling)
     * @param {boolean} options.alternatives - Trả về tuyến đường thay thế (mặc định: false)
     * @param {string} options.annotations - Metadata bổ sung (distance, duration, speed, congestion)
     * @param {boolean} options.steps - Trả về hướng dẫn chi tiết từng bước (mặc định: true)
     * @param {string} options.geometries - Định dạng geometry (geojson, polyline, polyline6)
     * @param {string} options.overview - Mức độ chi tiết overview (full, simplified, false)
     * @param {string} options.language - Ngôn ngữ hướng dẫn (vi, en)
     * @param {boolean} options.voice_instructions - Hướng dẫn giọng nói
     * @param {string} options.exclude - Loại trừ đường (motorway, toll, ferry)
     * @returns {Promise<Object>} Thông tin tuyến đường chi tiết
     */
    async getDirections(coordinates, options = {}) {
        try {
            // Validate input
            if (!Array.isArray(coordinates) || coordinates.length < 2) {
                throw new Error('Cần ít nhất 2 tọa độ để tính tuyến đường');
            }

            if (coordinates.length > 25) {
                throw new Error('Tối đa 25 tọa độ cho mỗi yêu cầu');
            }

            // Validate coordinates
            for (const coord of coordinates) {
                if (!this.isValidCoordinate(coord)) {
                    throw new Error(`Tọa độ không hợp lệ: ${JSON.stringify(coord)}`);
                }
            }

            // Build coordinates string theo format API
            const coordinateString = coordinates
                .map(coord => `${coord.longitude},${coord.latitude}`)
                .join(';');

            // Set default options
            const profile = options.profile || 'driving';
            
            // Validate profile
            const validProfiles = ['driving-traffic', 'driving', 'walking', 'cycling'];
            if (!validProfiles.includes(profile)) {
                throw new Error(`Profile không hợp lệ: ${profile}. Chỉ hỗ trợ: ${validProfiles.join(', ')}`);
            }

            // Build URL theo format chính thức
            let url = `${this.baseUrl}/mapbox/${profile}/${coordinateString}`;
            
            // Build query parameters
            const params = new URLSearchParams({
                access_token: this.accessToken,
                steps: options.steps !== false ? 'true' : 'false',
                geometries: options.geometries || 'geojson',
                overview: options.overview || 'full'
            });

            // Add optional parameters theo tài liệu
            if (options.alternatives) {
                params.append('alternatives', 'true');
            }

            if (options.annotations) {
                params.append('annotations', options.annotations);
            }

            if (options.language) {
                params.append('language', options.language);
            }

            if (options.voice_instructions) {
                params.append('voice_instructions', 'true');
                params.append('voice_units', 'metric');
            }

            if (options.exclude) {
                params.append('exclude', options.exclude);
            }

            if (options.approaches) {
                params.append('approaches', options.approaches);
            }

            if (options.bearings) {
                params.append('bearings', options.bearings);
            }

            url += `?${params.toString()}`;

            console.log(`Gọi Mapbox Directions API: ${profile} profile cho ${coordinates.length} điểm`);

            const response = await axios.get(url, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'VeenaTravel/1.0'
                }
            });

            // Kiểm tra response code theo tài liệu API
            if (response.data.code !== 'Ok') {
                throw new Error(`Mapbox Directions API error: ${response.data.code} - ${response.data.message || 'Unknown error'}`);
            }

            return this.formatDirectionsResponse(response.data, coordinates, options);

        } catch (error) {
            console.error('Mapbox Directions API error:', error.message);
            
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
                
                throw new Error(`Mapbox Directions API error (${status}): ${errorData.message || error.message}`);
            }
            
            throw error;
        }
    }

    /**
     * Tối ưu hóa tuyến đường cho nhiều điểm (Traveling Salesman Problem)
     * @param {Array} waypoints - Mảng các điểm cần đi qua
     * @param {Object} options - Tùy chọn tối ưu hóa
     * @param {number} options.startIndex - Chỉ mục điểm bắt đầu
     * @param {number} options.endIndex - Chỉ mục điểm kết thúc
     * @returns {Promise<Object>} Tuyến đường tối ưu
     */
    async getOptimizedRoute(waypoints, options = {}) {
        try {
            if (waypoints.length < 3) {
                // Nếu chỉ có 2 điểm, trả về tuyến đường thông thường
                return await this.getDirections(waypoints, options);
            }

            // Sử dụng waypoints parameter để tối ưu hóa
            const startIndex = options.startIndex || 0;
            const endIndex = options.endIndex || waypoints.length - 1;
            
            // Tạo waypoints string cho API
            const waypointIndices = [];
            for (let i = 0; i < waypoints.length; i++) {
                if (i === startIndex || i === endIndex) {
                    waypointIndices.push(i);
                }
            }

            const directionsOptions = {
                ...options,
                waypoints: waypointIndices.join(';')
            };

            const result = await this.getDirections(waypoints, directionsOptions);
            
            return {
                ...result,
                optimized: true,
                originalOrder: waypoints.map((_, index) => index),
                optimizedOrder: result.waypoint_order || waypoints.map((_, index) => index)
            };

        } catch (error) {
            console.error('Error optimizing route:', error.message);
            throw error;
        }
    }

    /**
     * Lấy hướng dẫn turn-by-turn chi tiết
     * @param {Array} coordinates - Mảng tọa độ
     * @param {Object} options - Tùy chọn
     * @returns {Promise<Object>} Hướng dẫn chi tiết từng bước
     */
    async getTurnByTurnInstructions(coordinates, options = {}) {
        try {
            const directionsOptions = {
                ...options,
                steps: true,
                voice_instructions: true,
                banner_instructions: true,
                language: options.language || 'vi'
            };

            const result = await this.getDirections(coordinates, directionsOptions);
            
            // Trích xuất và format hướng dẫn
            const instructions = this.extractInstructions(result);
            
            return {
                ...result,
                turnByTurnInstructions: instructions,
                totalSteps: instructions.length
            };

        } catch (error) {
            console.error('Error getting turn-by-turn instructions:', error.message);
            throw error;
        }
    }

    /**
     * Trích xuất hướng dẫn từ response
     * @param {Object} directionsResult - Kết quả từ getDirections
     * @returns {Array} Mảng hướng dẫn chi tiết
     */
    extractInstructions(directionsResult) {
        const instructions = [];
        
        if (directionsResult.routes && directionsResult.routes.length > 0) {
            const route = directionsResult.routes[0];
            
            if (route.legs) {
                route.legs.forEach((leg, legIndex) => {
                    if (leg.steps) {
                        leg.steps.forEach((step, stepIndex) => {
                            instructions.push({
                                legIndex,
                                stepIndex,
                                instruction: step.maneuver?.instruction || 'Tiếp tục',
                                distance: step.distance,
                                duration: step.duration,
                                maneuver: {
                                    type: step.maneuver?.type,
                                    modifier: step.maneuver?.modifier,
                                    bearing_after: step.maneuver?.bearing_after,
                                    bearing_before: step.maneuver?.bearing_before,
                                    location: step.maneuver?.location
                                },
                                geometry: step.geometry,
                                voiceInstructions: step.voiceInstructions,
                                bannerInstructions: step.bannerInstructions
                            });
                        });
                    }
                });
            }
        }
        
        return instructions;
    }

    /**
     * Format response từ Mapbox Directions API
     * @param {Object} data - Raw response từ Mapbox
     * @param {Array} coordinates - Tọa độ gốc
     * @param {Object} options - Tùy chọn gốc
     * @returns {Object} Formatted response
     */
    formatDirectionsResponse(data, coordinates, options) {
        const routes = data.routes?.map(route => ({
            ...route,
            durationFormatted: this.formatDuration(route.duration),
            distanceFormatted: this.formatDistance(route.distance),
            legs: route.legs?.map(leg => ({
                ...leg,
                durationFormatted: this.formatDuration(leg.duration),
                distanceFormatted: this.formatDistance(leg.distance)
            }))
        }));

        return {
            code: data.code,
            routes,
            waypoints: data.waypoints,
            uuid: data.uuid,
            requestOptions: options,
            coordinateCount: coordinates.length,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Validate tọa độ
     * @param {Object} coordinate - Tọa độ cần validate
     * @returns {boolean}
     */
    isValidCoordinate(coordinate) {
        if (!coordinate || typeof coordinate !== 'object') return false;
        
        const { longitude, latitude } = coordinate;
        
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
     * Lấy tuyến đường thay thế
     * @param {Array} coordinates - Mảng tọa độ
     * @param {Object} options - Tùy chọn
     * @returns {Promise<Object>} Các tuyến đường thay thế
     */
    async getAlternativeRoutes(coordinates, options = {}) {
        try {
            const alternativeOptions = {
                ...options,
                alternatives: true,
                steps: true
            };

            const result = await this.getDirections(coordinates, alternativeOptions);

            if (!result.routes || result.routes.length <= 1) {
                return {
                    ...result,
                    hasAlternatives: false,
                    message: 'Không có tuyến đường thay thế'
                };
            }

            // Sắp xếp routes theo thời gian
            const sortedRoutes = result.routes.sort((a, b) => a.duration - b.duration);

            return {
                ...result,
                routes: sortedRoutes,
                hasAlternatives: true,
                primaryRoute: sortedRoutes[0],
                alternativeRoutes: sortedRoutes.slice(1),
                routeComparison: this.compareRoutes(sortedRoutes)
            };

        } catch (error) {
            console.error('Error getting alternative routes:', error.message);
            throw error;
        }
    }

    /**
     * So sánh các tuyến đường
     * @param {Array} routes - Mảng các tuyến đường
     * @returns {Object} Thông tin so sánh
     */
    compareRoutes(routes) {
        if (!routes || routes.length < 2) return null;

        const primary = routes[0];
        const alternatives = routes.slice(1);

        return alternatives.map((route, index) => ({
            routeIndex: index + 1,
            durationDifference: route.duration - primary.duration,
            durationDifferenceFormatted: this.formatDuration(route.duration - primary.duration),
            distanceDifference: route.distance - primary.distance,
            distanceDifferenceFormatted: this.formatDistance(route.distance - primary.distance),
            percentageLonger: Math.round(((route.duration - primary.duration) / primary.duration) * 100)
        }));
    }

    /**
     * Chuyển đổi địa điểm từ format khác sang format Directions API
     * @param {Array} places - Mảng địa điểm với format khác nhau
     * @returns {Array} Mảng tọa độ với format chuẩn
     */
    convertToDirectionsFormat(places) {
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

    /**
     * Tính toán tuyến đường cho trip planning
     * @param {Array} places - Mảng địa điểm cần đi
     * @param {Object} options - Tùy chọn trip
     * @param {string} options.transportMode - Phương tiện (driving, walking, cycling)
     * @param {boolean} options.optimize - Có tối ưu hóa thứ tự không
     * @param {number} options.startPlaceIndex - Chỉ mục địa điểm bắt đầu
     * @returns {Promise<Object>} Kế hoạch trip hoàn chỉnh
     */
    async planTrip(places, options = {}) {
        try {
            if (!places || places.length < 2) {
                throw new Error('Cần ít nhất 2 địa điểm để lập kế hoạch trip');
            }

            // Chuyển đổi format địa điểm
            const coordinates = this.convertToDirectionsFormat(places);

            // Xác định profile dựa trên transport mode
            const profileMap = {
                'driving': 'driving',
                'walking': 'walking',
                'cycling': 'cycling',
                'car': 'driving-traffic'
            };

            const profile = profileMap[options.transportMode] || 'driving';

            const directionsOptions = {
                profile,
                steps: true,
                alternatives: true,
                annotations: 'duration,distance,speed',
                language: 'vi'
            };

            let result;

            if (options.optimize && coordinates.length > 2) {
                // Sử dụng tối ưu hóa cho nhiều điểm
                result = await this.getOptimizedRoute(coordinates, {
                    ...directionsOptions,
                    startIndex: options.startPlaceIndex || 0
                });
            } else {
                // Tuyến đường thông thường
                result = await this.getDirections(coordinates, directionsOptions);
            }

            // Tính toán thông tin bổ sung cho trip
            const tripInfo = this.calculateTripInfo(result, places);

            return {
                ...result,
                tripInfo,
                transportMode: options.transportMode || 'driving',
                optimized: options.optimize || false,
                places: places.map((place, index) => ({
                    ...place,
                    order: index,
                    coordinates: coordinates[index]
                }))
            };

        } catch (error) {
            console.error('Error planning trip:', error.message);
            throw error;
        }
    }

    /**
     * Tính toán thông tin trip
     * @param {Object} directionsResult - Kết quả từ directions API
     * @param {Array} places - Mảng địa điểm gốc
     * @returns {Object} Thông tin trip
     */
    calculateTripInfo(directionsResult, places) {
        if (!directionsResult.routes || directionsResult.routes.length === 0) {
            return null;
        }

        const primaryRoute = directionsResult.routes[0];

        return {
            totalDuration: primaryRoute.duration,
            totalDurationFormatted: this.formatDuration(primaryRoute.duration),
            totalDistance: primaryRoute.distance,
            totalDistanceFormatted: this.formatDistance(primaryRoute.distance),
            numberOfStops: places.length,
            numberOfLegs: primaryRoute.legs?.length || 0,
            estimatedFuelCost: this.estimateFuelCost(primaryRoute.distance),
            estimatedTravelTime: this.estimateTravelTime(primaryRoute.duration),
            routeComplexity: this.assessRouteComplexity(primaryRoute)
        };
    }

    /**
     * Ước tính chi phí nhiên liệu
     * @param {number} distance - Khoảng cách (mét)
     * @returns {Object} Thông tin chi phí
     */
    estimateFuelCost(distance) {
        const distanceKm = distance / 1000;
        const fuelConsumption = 8; // lít/100km (trung bình)
        const fuelPrice = 25000; // VND/lít (ước tính)

        const fuelNeeded = (distanceKm * fuelConsumption) / 100;
        const estimatedCost = fuelNeeded * fuelPrice;

        return {
            distanceKm: Math.round(distanceKm),
            fuelNeeded: Math.round(fuelNeeded * 10) / 10,
            estimatedCost: Math.round(estimatedCost),
            estimatedCostFormatted: `${Math.round(estimatedCost).toLocaleString('vi-VN')} VND`
        };
    }

    /**
     * Ước tính thời gian di chuyển với buffer
     * @param {number} duration - Thời gian (giây)
     * @returns {Object} Thông tin thời gian
     */
    estimateTravelTime(duration) {
        const bufferTime = duration * 0.2; // 20% buffer
        const totalTime = duration + bufferTime;

        return {
            baseDuration: duration,
            baseDurationFormatted: this.formatDuration(duration),
            bufferTime: bufferTime,
            bufferTimeFormatted: this.formatDuration(bufferTime),
            totalEstimatedTime: totalTime,
            totalEstimatedTimeFormatted: this.formatDuration(totalTime)
        };
    }

    /**
     * Đánh giá độ phức tạp của tuyến đường
     * @param {Object} route - Thông tin tuyến đường
     * @returns {Object} Đánh giá độ phức tạp
     */
    assessRouteComplexity(route) {
        let complexity = 'Đơn giản';
        let score = 0;

        // Đánh giá dựa trên số legs
        if (route.legs && route.legs.length > 5) {
            score += 2;
        } else if (route.legs && route.legs.length > 2) {
            score += 1;
        }

        // Đánh giá dựa trên khoảng cách
        if (route.distance > 500000) { // > 500km
            score += 2;
        } else if (route.distance > 100000) { // > 100km
            score += 1;
        }

        // Đánh giá dựa trên thời gian
        if (route.duration > 28800) { // > 8 giờ
            score += 2;
        } else if (route.duration > 7200) { // > 2 giờ
            score += 1;
        }

        if (score >= 4) {
            complexity = 'Phức tạp';
        } else if (score >= 2) {
            complexity = 'Trung bình';
        }

        return {
            complexity,
            score,
            recommendations: this.getComplexityRecommendations(score)
        };
    }

    /**
     * Đưa ra khuyến nghị dựa trên độ phức tạp
     * @param {number} score - Điểm phức tạp
     * @returns {Array} Mảng khuyến nghị
     */
    getComplexityRecommendations(score) {
        const recommendations = [];

        if (score >= 4) {
            recommendations.push('Nên chia thành nhiều chuyến đi nhỏ');
            recommendations.push('Chuẩn bị kỹ lưỡng trước khi khởi hành');
            recommendations.push('Kiểm tra điều kiện giao thông và thời tiết');
        } else if (score >= 2) {
            recommendations.push('Nên có kế hoạch dự phòng');
            recommendations.push('Chuẩn bị đủ nhiên liệu và nước uống');
        } else {
            recommendations.push('Tuyến đường đơn giản, dễ di chuyển');
        }

        return recommendations;
    }

    /**
     * Kiểm tra kết nối với Mapbox Directions API
     * @returns {Promise<boolean>} True nếu kết nối thành công
     */
    async testConnection() {
        try {
            // Test với 2 tọa độ đơn giản (Hà Nội và TP.HCM)
            const testCoordinates = [
                { longitude: 105.8542, latitude: 21.0285 },
                { longitude: 106.6297, latitude: 10.8231 }
            ];

            const result = await this.getDirections(testCoordinates, {
                profile: 'driving',
                steps: false
            });

            return result && result.code === 'Ok';

        } catch (error) {
            console.error('Mapbox Directions connection test failed:', error.message);
            return false;
        }
    }
}

module.exports = DirectionsService;
