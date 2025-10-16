/**
 * =================================================================
 * Logging and Monitoring Service
 * =================================================================
 * Provides comprehensive logging for hybrid search operations.
 * Tracks performance metrics, error rates, and data source health.
 * =================================================================
 */

class LoggingService {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 logs in memory
    this.metrics = {
      searches: {
        total: 0,
        successful: 0,
        failed: 0,
        cached: 0
      },
      dataSources: {
        pinecone: {
          requests: 0,
          successes: 0,
          failures: 0,
          avgResponseTime: 0
        },
        googleMaps: {
          requests: 0,
          successes: 0,
          failures: 0,
          avgResponseTime: 0
        }
      },
      performance: {
        avgSearchTime: 0,
        slowQueries: []
      }
    };
  }

  /**
   * Log a search operation
   * @param {Object} logData - Log data
   */
  logSearch(logData) {
    const log = {
      timestamp: new Date().toISOString(),
      type: 'SEARCH',
      level: logData.success ? 'INFO' : 'ERROR',
      ...logData
    };

    this.addLog(log);
    this.updateSearchMetrics(logData);

    // Console output with appropriate level
    if (logData.success) {
      console.log(`🔍 [SEARCH] ${logData.query} - ${logData.resultCount} results in ${logData.duration}ms`);
    } else {
      console.error(`❌ [SEARCH ERROR] ${logData.query} - ${logData.error}`);
    }
  }

  /**
   * Log data source operation
   * @param {string} source - Data source name (pinecone/googleMaps)
   * @param {Object} logData - Log data
   */
  logDataSource(source, logData) {
    const log = {
      timestamp: new Date().toISOString(),
      type: 'DATA_SOURCE',
      source,
      level: logData.success ? 'INFO' : 'WARN',
      ...logData
    };

    this.addLog(log);
    this.updateDataSourceMetrics(source, logData);

    // Console output
    const status = logData.success ? '✅' : '⚠️';
    console.log(`${status} [${source.toUpperCase()}] ${logData.operation} - ${logData.duration}ms`);
  }

  /**
   * Log admin operation
   * @param {Object} logData - Log data
   */
  logAdmin(logData) {
    const log = {
      timestamp: new Date().toISOString(),
      type: 'ADMIN',
      level: logData.success ? 'INFO' : 'ERROR',
      ...logData
    };

    this.addLog(log);

    // Console output
    const status = logData.success ? '✅' : '❌';
    console.log(`${status} [ADMIN] ${logData.operation} - ${logData.details}`);
  }

  /**
   * Log cache operation
   * @param {Object} logData - Log data
   */
  logCache(logData) {
    const log = {
      timestamp: new Date().toISOString(),
      type: 'CACHE',
      level: 'INFO',
      ...logData
    };

    this.addLog(log);

    // Console output for cache hits/misses
    if (logData.operation === 'hit') {
      console.log(`🎯 [CACHE HIT] ${logData.key}`);
    } else if (logData.operation === 'miss') {
      console.log(`💾 [CACHE MISS] ${logData.key}`);
    }
  }

  /**
   * Add log to memory storage
   * @param {Object} log - Log entry
   */
  addLog(log) {
    this.logs.push(log);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Update search metrics
   * @param {Object} logData - Log data
   */
  updateSearchMetrics(logData) {
    this.metrics.searches.total++;
    
    if (logData.success) {
      this.metrics.searches.successful++;
    } else {
      this.metrics.searches.failed++;
    }

    if (logData.cached) {
      this.metrics.searches.cached++;
    }

    // Update average search time
    if (logData.duration) {
      const totalTime = this.metrics.performance.avgSearchTime * (this.metrics.searches.total - 1);
      this.metrics.performance.avgSearchTime = (totalTime + logData.duration) / this.metrics.searches.total;

      // Track slow queries (>2 seconds)
      if (logData.duration > 2000) {
        this.metrics.performance.slowQueries.push({
          query: logData.query,
          duration: logData.duration,
          timestamp: new Date().toISOString()
        });

        // Keep only last 10 slow queries
        if (this.metrics.performance.slowQueries.length > 10) {
          this.metrics.performance.slowQueries = this.metrics.performance.slowQueries.slice(-10);
        }
      }
    }
  }

  /**
   * Update data source metrics
   * @param {string} source - Data source name
   * @param {Object} logData - Log data
   */
  updateDataSourceMetrics(source, logData) {
    const sourceMetrics = this.metrics.dataSources[source];
    if (!sourceMetrics) return;

    sourceMetrics.requests++;
    
    if (logData.success) {
      sourceMetrics.successes++;
    } else {
      sourceMetrics.failures++;
    }

    // Update average response time
    if (logData.duration) {
      const totalTime = sourceMetrics.avgResponseTime * (sourceMetrics.requests - 1);
      sourceMetrics.avgResponseTime = (totalTime + logData.duration) / sourceMetrics.requests;
    }
  }

  /**
   * Get recent logs
   * @param {number} limit - Number of logs to return
   * @param {string} level - Log level filter
   * @param {string} type - Log type filter
   * @returns {Array} - Recent logs
   */
  getRecentLogs(limit = 50, level = null, type = null) {
    let filteredLogs = [...this.logs];

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (type) {
      filteredLogs = filteredLogs.filter(log => log.type === type);
    }

    return filteredLogs.slice(-limit).reverse();
  }

  /**
   * Get system metrics
   * @returns {Object} - System metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get health status
   * @returns {Object} - Health status
   */
  getHealthStatus() {
    const metrics = this.getMetrics();
    const errorRate = metrics.searches.total > 0 ? 
      (metrics.searches.failed / metrics.searches.total) * 100 : 0;
    
    const pineconeHealthy = metrics.dataSources.pinecone.requests === 0 || 
      (metrics.dataSources.pinecone.successes / metrics.dataSources.pinecone.requests) > 0.8;
    
    const googleMapsHealthy = metrics.dataSources.googleMaps.requests === 0 || 
      (metrics.dataSources.googleMaps.successes / metrics.dataSources.googleMaps.requests) > 0.8;

    return {
      status: errorRate < 10 && pineconeHealthy && googleMapsHealthy ? 'healthy' : 'degraded',
      errorRate: Math.round(errorRate * 100) / 100,
      dataSources: {
        pinecone: pineconeHealthy ? 'healthy' : 'degraded',
        googleMaps: googleMapsHealthy ? 'healthy' : 'degraded'
      },
      performance: {
        avgSearchTime: Math.round(metrics.performance.avgSearchTime),
        slowQueriesCount: metrics.performance.slowQueries.length
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear all logs and reset metrics
   */
  reset() {
    this.logs = [];
    this.metrics = {
      searches: { total: 0, successful: 0, failed: 0, cached: 0 },
      dataSources: {
        pinecone: { requests: 0, successes: 0, failures: 0, avgResponseTime: 0 },
        googleMaps: { requests: 0, successes: 0, failures: 0, avgResponseTime: 0 }
      },
      performance: { avgSearchTime: 0, slowQueries: [] }
    };
    console.log('🔄 Logging service reset');
  }
}

// Create singleton instance
const loggingService = new LoggingService();

export default {
  logSearch: loggingService.logSearch.bind(loggingService),
  logDataSource: loggingService.logDataSource.bind(loggingService),
  logAdmin: loggingService.logAdmin.bind(loggingService),
  logCache: loggingService.logCache.bind(loggingService),
  getRecentLogs: loggingService.getRecentLogs.bind(loggingService),
  getMetrics: loggingService.getMetrics.bind(loggingService),
  getHealthStatus: loggingService.getHealthStatus.bind(loggingService),
  reset: loggingService.reset.bind(loggingService)
};
