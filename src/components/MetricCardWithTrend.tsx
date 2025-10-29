import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type {
  MetricWithTrend,
} from '@/services/trend-comparison';
import {
  getTrendColor,
  getTrendBgColor,
} from '@/services/trend-comparison';

interface MetricCardWithTrendProps {
  title: string;
  value: number;
  metric: MetricWithTrend;
  icon: React.ReactNode;
  bgGradient: string;
  borderColor: string;
  isPositiveGood?: boolean;
  format?: 'currency' | 'count';
}

const MetricCardWithTrend: React.FC<MetricCardWithTrendProps> = ({
  title,
  value,
  metric,
  icon,
  bgGradient,
  borderColor,
  isPositiveGood = true,
  format = 'currency',
}) => {
  const getTrendIcon = () => {
    if (metric.trend === 'up') return <TrendingUp className="h-4 w-4" />;
    if (metric.trend === 'down') return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const trendColor = getTrendColor(metric.trend, isPositiveGood);
  const trendBgColor = getTrendBgColor(metric.trend, isPositiveGood);

  const formatNumber = (num: number) => {
    if (format === 'count') return num.toString();
    return num.toLocaleString();
  };

  return (
    <Card className={`${bgGradient} ${borderColor} transition-all hover:shadow-md`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            <div className="flex items-baseline gap-3">
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(value)}
                {format === 'currency' && <span className="text-lg"> сом</span>}
              </p>
              {metric.trend !== 'neutral' && (
                <div className={`${trendBgColor} px-2 py-1 rounded-lg flex items-center gap-1`}>
                  <span className={`${trendColor} flex items-center gap-1`}>
                    {getTrendIcon()}
                    <span className="text-xs font-semibold">
                      {metric.percentChange.toFixed(1)}%
                    </span>
                  </span>
                </div>
              )}
            </div>
            {metric.trend !== 'neutral' && (
              <p className={`text-xs mt-2 ${trendColor}`}>
                {metric.trend === 'up' ? '↑' : '↓'} вчера было{' '}
                {formatNumber(metric.previous)}
                {format === 'currency' && ' сом'}
              </p>
            )}
          </div>
          <div className="p-3 bg-white rounded-lg opacity-80">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCardWithTrend;
