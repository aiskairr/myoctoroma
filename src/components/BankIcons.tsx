import React from 'react';

interface BankIconProps {
  bank: string;
  className?: string;
}

export const BankIcon: React.FC<BankIconProps> = ({ bank, className = "w-8 h-8" }) => {
  const getBankIcon = (bankName: string) => {
    switch (bankName.toLowerCase()) {
      case 'mbank':
      case 'мбанк':
        return (
          <img 
            src="/attached_assets/image_1755154671525.png" 
            alt="MBank" 
            className={`${className} object-contain`}
            style={{ 
              background: 'linear-gradient(135deg, #00A86B 0%, #008B5A 100%)',
              borderRadius: '12px',
              padding: '4px',
              width: '32px',
              height: '32px'
            }}
          />
        );
      case 'mbusiness':
      case 'мбизнес':
        return (
          <img 
            src="/attached_assets/image_1755154803129.png" 
            alt="MBusiness" 
            className={`${className} object-contain`}
            style={{ 
              background: 'linear-gradient(135deg, #1A1A1A 0%, #333 100%)',
              borderRadius: '12px',
              padding: '4px',
              width: '32px',
              height: '32px'
            }}
          />
        );
      case 'obank':
      case 'о!банк':
        return (
          <img 
            src="/attached_assets/image_1755154892998.png" 
            alt="O!Bank" 
            className={`${className} object-contain`}
            style={{ 
              background: 'linear-gradient(135deg, #E91E63 0%, #C2185B 100%)',
              borderRadius: '12px',
              padding: '4px',
              width: '32px',
              height: '32px'
            }}
          />
        );
      case 'demir':
      case 'демир':
        return (
          <img 
            src="/attached_assets/image_1755154960640.png" 
            alt="Demir Bank" 
            className={`${className} object-contain`}
            style={{ 
              background: 'linear-gradient(135deg, #8B0000 0%, #660000 100%)',
              borderRadius: '12px',
              padding: '4px',
              width: '32px',
              height: '32px'
            }}
          />
        );
      case 'bakai':
      case 'бакай':
        return (
          <img 
            src="/attached_assets/image_1755155028148.png" 
            alt="Bakai Bank" 
            className={`${className} object-contain`}
            style={{ 
              background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
              borderRadius: '12px',
              padding: '4px',
              width: '32px',
              height: '32px'
            }}
          />
        );
      case 'optima':
      case 'оптима':
        return (
          <img 
            src="/attached_assets/image_1755155095994.png" 
            alt="Optima Bank" 
            className={`${className} object-contain`}
            style={{ 
              background: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)',
              borderRadius: '12px',
              padding: '4px',
              width: '32px',
              height: '32px'
            }}
          />
        );
      default:
        return (
          <div 
            className={`${className} bg-gray-200 rounded-lg flex items-center justify-center`}
          >
            <span className="text-lg">🏦</span>
          </div>
        );
    }
  };

  return getBankIcon(bank);
};

export const PaymentMethodIcon: React.FC<{ paymentMethod: string; className?: string }> = ({ 
  paymentMethod, 
  className = "w-8 h-8" 
}) => {
  if (paymentMethod.includes('Наличные')) {
    return <span className="text-2xl">💰</span>;
  }
  
  if (paymentMethod.includes('Подарочный')) {
    return <span className="text-2xl">🎁</span>;
  }
  
  if (paymentMethod.includes('МБанк')) {
    return <BankIcon bank="mbank" className={className} />;
  }
  
  if (paymentMethod.includes('МБизнес')) {
    return <BankIcon bank="mbusiness" className={className} />;
  }
  
  if (paymentMethod.includes('О!Банк')) {
    return <BankIcon bank="obank" className={className} />;
  }
  
  if (paymentMethod.includes('Демир')) {
    return <BankIcon bank="demir" className={className} />;
  }
  
  if (paymentMethod.includes('Bakai')) {
    return <BankIcon bank="bakai" className={className} />;
  }
  
  if (paymentMethod.includes('Оптима')) {
    return <BankIcon bank="optima" className={className} />;
  }
  
  return <span className="text-2xl">💳</span>;
};