import React from 'react';
import type { CardStatus, Badge as BadgeType, Trend } from './analytics.types';
import { Loader2 } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  subtext: string;
  trend?: { direction: 'up' | 'down' | 'flat'; value: string; label: string };
  badge?: { text: string; variant: 'green' | 'red' | 'amber' | 'neutral' };
  status: CardStatus;
  icon?: React.ReactNode;
  loading?: boolean;
}

export function KpiCard({ label, value, subtext, trend, badge, status, icon, loading }: Props) {
  if (loading) {
    return (
      <div 
        className="animate-pulse flex items-center justify-center relative"
        style={{
          height: '160px', // rough height
          backgroundColor: '#F1EFE8',
          border: '1px solid #D3D1C7',
          borderRadius: '14px',
          padding: '20px 20px 16px'
        }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-[#D3D1C7]" />
      </div>
    );
  }

  // Card Backgrounds
  const cardBgColor = status === 'green' ? '#E1F5EE' : status === 'red' ? '#FCEBEB' : '#F1EFE8';
  const cardBorderColor = status === 'green' ? '#9FE1CB' : status === 'red' ? '#F7C1C1' : '#D3D1C7';

  // Label Colors
  const labelColor = status === 'green' ? '#0F6E56' : status === 'red' ? '#A32D2D' : '#5F5E5A';
  
  // Value Colors
  const valueColor = status === 'green' ? '#085041' : status === 'red' ? '#791F1F' : '#2C2C2A';

  // Badge Colors map
  const getBadgeColors = (variant: string) => {
    switch (variant) {
      case 'green': return { bg: '#9FE1CB', text: '#085041' };
      case 'red': return { bg: '#F7C1C1', text: '#791F1F' };
      case 'amber': return { bg: '#FAC775', text: '#633806' };
      default: return { bg: '#D3D1C7', text: '#444441' }; // neutral
    }
  };

  // Icon container Colors
  const iconBgColor = status === 'green' ? '#9FE1CB' : status === 'red' ? '#F7C1C1' : '#D3D1C7';
  // Note: the prompt didn't specify icon SVG text color, let's use the value color or label color to blend nicely, or default it to inherit.
  const iconColor = status === 'green' ? '#085041' : status === 'red' ? '#791F1F' : '#2C2C2A';

  // Trend Colors
  const getTrendColor = (dir: string) => {
    if (dir === 'up') return '#0F6E56';
    if (dir === 'down') return '#A32D2D';
    return '#888780';
  };
  const getTrendPrefix = (dir: string) => {
    if (dir === 'up') return '↑';
    if (dir === 'down') return '↓';
    return '→';
  };

  return (
    <div 
      style={{
        backgroundColor: cardBgColor,
        border: `1px solid ${cardBorderColor}`,
        borderRadius: '14px',
        padding: '20px 20px 16px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '160px'
      }}
    >
      {/* Icon Container absolute positioned */}
      {icon && (
        <div 
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            backgroundColor: iconBgColor,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </div>
      )}

      <div>
        <h3 
          style={{
            fontSize: '11px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: labelColor,
            margin: '0 0 8px 0',
            maxWidth: icon ? 'calc(100% - 40px)' : '100%' // avoid text overlap with icon
          }}
        >
          {label}
        </h3>
        
        <div 
          style={{
            fontSize: '28px',
            fontWeight: 500,
            color: valueColor,
            margin: '0 0 4px 0',
            lineHeight: 1
          }}
        >
          {value}
        </div>

        <div 
          style={{
            fontSize: '12px',
            color: labelColor,
            margin: '0 0 8px 0'
          }}
        >
          {subtext}
        </div>

        {trend && (
          <div 
            style={{
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              margin: '0 0 12px 0'
            }}
          >
            <span style={{ color: getTrendColor(trend.direction), fontWeight: 500 }}>
              {getTrendPrefix(trend.direction)} {trend.value}
            </span>
            <span style={{ color: '#888780', fontSize: '11px' }}>
              {trend.label}
            </span>
          </div>
        )}
      </div>

      <div>
        {badge && badge.text && (
          <span 
            style={{
              display: 'inline-block',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'uppercase',
              backgroundColor: getBadgeColors(badge.variant).bg,
              color: getBadgeColors(badge.variant).text
            }}
          >
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
}
