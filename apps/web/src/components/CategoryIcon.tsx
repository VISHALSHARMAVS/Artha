import React from 'react';
import {
  Briefcase,
  TrendingUp,
  Laptop,
  Home,
  ShoppingBag,
  Utensils,
  Car,
  Zap,
  HeartPulse,
  Film,
  Package,
  Landmark,
  MoreHorizontal,
  CreditCard,
  Wallet,
  ArrowLeftRight,
} from 'lucide-react';

interface CategoryIconProps {
  iconName?: string;
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  colorHex?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  iconName,
  type = 'EXPENSE',
  colorHex,
  size = 'md',
}) => {
  const getIcon = () => {
    switch (iconName) {
      case 'Briefcase': return <Briefcase className="w-4 h-4" />;
      case 'TrendingUp': return <TrendingUp className="w-4 h-4" />;
      case 'Laptop': return <Laptop className="w-4 h-4" />;
      case 'Home': return <Home className="w-4 h-4" />;
      case 'ShoppingBag': return <ShoppingBag className="w-4 h-4" />;
      case 'Utensils': return <Utensils className="w-4 h-4" />;
      case 'Car': return <Car className="w-4 h-4" />;
      case 'Zap': return <Zap className="w-4 h-4" />;
      case 'HeartPulse': return <HeartPulse className="w-4 h-4" />;
      case 'Film': return <Film className="w-4 h-4" />;
      case 'Package': return <Package className="w-4 h-4" />;
      case 'Landmark': return <Landmark className="w-4 h-4" />;
      case 'CreditCard': return <CreditCard className="w-4 h-4" />;
      case 'Wallet': return <Wallet className="w-4 h-4" />;
      case 'ArrowLeftRight': return <ArrowLeftRight className="w-4 h-4" />;
      default:
        if (type === 'INCOME') return <TrendingUp className="w-4 h-4" />;
        if (type === 'TRANSFER') return <ArrowLeftRight className="w-4 h-4" />;
        return <MoreHorizontal className="w-4 h-4" />;
    }
  };

  const containerSizes = {
    sm: 'w-9 h-9 rounded-xl',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
  };

  const effectiveColor = colorHex || (type === 'INCOME' ? '#10B981' : type === 'TRANSFER' ? '#6366F1' : '#F43F5E');

  return (
    <div
      className={`shrink-0 flex items-center justify-center transition-transform duration-200 shadow-sm ${containerSizes[size]}`}
      style={{
        backgroundColor: `${effectiveColor}18`,
        border: `1px solid ${effectiveColor}35`,
        color: effectiveColor,
      }}
    >
      {getIcon()}
    </div>
  );
};
