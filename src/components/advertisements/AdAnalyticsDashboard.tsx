import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  MousePointer, 
  Clock,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { 
  AdvertisementAnalytics,
  getAdvertisementAnalytics,
  getAdvertisementSummary,
  getAllAdvertisements,
  Advertisement
} from '../../lib/advertisements';

interface AdAnalyticsDashboardProps {
  className?: string;
}

const AdAnalyticsDashboard: React.FC<AdAnalyticsDashboardProps> = ({ className = '' }) => {
  const [analytics, setAnalytics] = useState<AdvertisementAnalytics[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAd, setSelectedAd] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, [selectedAd, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Convert date strings to Date objects
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end + 'T23:59:59.999');
      
      const [analyticsData, adsData] = await Promise.all([
        getAdvertisementAnalytics(
          selectedAd === 'all' ? undefined : selectedAd,
          startDate,
          endDate
        ),
        getAllAdvertisements()
      ]);
      
      setAnalytics(analyticsData);
      setAdvertisements(adsData);
      
      // Try to load summary separately and handle errors gracefully
      try {
        const summaryData = await getAdvertisementSummary();
        setSummary(summaryData);
      } catch (summaryError) {
        console.warn('Failed to load advertisement summary:', summaryError);
        // Set a fallback summary or leave it null
        setSummary(null);
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getTotalMetrics = () => {
    return analytics.reduce((totals, ad) => ({
      impressions: totals.impressions + ad.total_impressions,
      clicks: totals.clicks + ad.total_clicks,
      uniqueUsers: totals.uniqueUsers + ad.unique_users,
      avgCTR: analytics.length > 0 ? 
        analytics.reduce((sum, a) => sum + a.click_through_rate, 0) / analytics.length : 0
    }), { impressions: 0, clicks: 0, uniqueUsers: 0, avgCTR: 0 });
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const exportData = () => {
    const csvContent = [
      ['Advertisement', 'Impressions', 'Clicks', 'CTR', 'Unique Users', 'Avg View Duration'],
      ...analytics.map(ad => [
        ad.advertisement_title,
        ad.total_impressions,
        ad.total_clicks,
        ad.click_through_rate + '%',
        ad.unique_users,
        ad.avg_view_duration + 'ms'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ad-analytics-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = getTotalMetrics();

  if (loading) {
    return (
      <div className={`p-8 ${className}`}>
        <div className="flex items-center justify-center min-h-64">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-8 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-medium text-red-900">Error Loading Analytics</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={`p-8 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Advertisement Analytics</h1>
            <p className="text-gray-600">Monitor ad performance and user engagement</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportData}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button
              onClick={loadData}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={selectedAd}
              onChange={(e) => setSelectedAd(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Advertisements</option>
              {advertisements.map(ad => (
                <option key={ad.id} value={ad.id}>{ad.title}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Impressions</p>
              <p className="text-3xl font-bold text-blue-600">
                {formatNumber(summary?.total_impressions || totals.impressions)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Eye className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clicks</p>
              <p className="text-3xl font-bold text-green-600">
                {formatNumber(summary?.total_clicks || totals.clicks)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <MousePointer className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average CTR</p>
              <p className="text-3xl font-bold text-purple-600">
                {(summary?.overall_ctr || totals.avgCTR).toFixed(2)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Users</p>
              <p className="text-3xl font-bold text-orange-600">
                {formatNumber(summary?.unique_users_reached || totals.uniqueUsers)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Performance by Advertisement */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Performance by Advertisement</h3>
          </div>
          
          <div className="space-y-4">
            {analytics.slice(0, 5).map((ad) => (
              <div key={ad.advertisement_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{ad.advertisement_title}</h4>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span>{formatNumber(ad.total_impressions)} impressions</span>
                    <span>{ad.total_clicks} clicks</span>
                    <span>{ad.click_through_rate}% CTR</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {ad.click_through_rate}%
                  </div>
                  <div className="text-xs text-gray-500">CTR</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Globe className="h-6 w-6 text-green-600" />
            <h3 className="text-xl font-semibold text-gray-900">Device Breakdown</h3>
          </div>
          
          <div className="space-y-4">
            {analytics.length > 0 && (() => {
              const deviceTotals: Record<string, number> = {};
              analytics.forEach(ad => {
                Object.entries(ad.device_breakdown).forEach(([device, count]) => {
                  deviceTotals[device] = (deviceTotals[device] || 0) + count;
                });
              });

              const totalDeviceImpressions = Object.values(deviceTotals).reduce((sum, count) => sum + count, 0);

              return Object.entries(deviceTotals)
                .sort(([,a], [,b]) => b - a)
                .map(([device, count]) => {
                  const percentage = totalDeviceImpressions > 0 ? (count / totalDeviceImpressions) * 100 : 0;
                  return (
                    <div key={device} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getDeviceIcon(device)}
                        <span className="font-medium text-gray-900 capitalize">{device}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-12 text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                });
            })()}
          </div>
        </div>
      </div>

      {/* No Data Message */}
      {analytics.length === 0 && !loading && (
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-600 mb-4">
            {advertisements.length === 0 
              ? 'No advertisements have been created yet.' 
              : 'No analytics data available for the selected filters. Sample data has been created to demonstrate the analytics features.'}
          </p>
          {advertisements.length === 0 && (
            <p className="text-sm text-gray-500">
              Create some advertisements first to see analytics data here.
            </p>
          )}
          {advertisements.length > 0 && (
            <div className="mt-4">
              <button
                onClick={loadData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Data
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detailed Table */}
      {analytics.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Analytics</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Advertisement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impressions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clicks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CTR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unique Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg View Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.map((ad) => (
                  <tr key={ad.advertisement_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{ad.advertisement_title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{formatNumber(ad.total_impressions)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{ad.total_clicks}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`font-medium ${
                        ad.click_through_rate >= 2 ? 'text-green-600' :
                        ad.click_through_rate >= 1 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {ad.click_through_rate}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{ad.unique_users}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{(ad.avg_view_duration / 1000).toFixed(1)}s</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdAnalyticsDashboard;