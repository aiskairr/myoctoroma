import React from 'react';
import { Banknote, Gift } from 'lucide-react';

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
            src="/mbanklogo.png" 
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
            src="/mbusinesslogo.png" 
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
            src="/obanklogo.png" 
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
  // Наличные - иконка денег
  if (paymentMethod.includes('cash') || paymentMethod.includes('Наличные')) {
    return <Banknote className={`${className} text-green-600`} />;
  }
  
  // Подарочный сертификат - иконка подарка
  if (paymentMethod.includes('Подарочный')) {
    return <Gift className={`${className} text-purple-600`} />;
  }
  
  // МБанк - обновленное изображение из public
  if (paymentMethod.includes('mbank') || paymentMethod.includes('МБанк')) {
    return (
      <img 
        src="/mbanklogo.png" 
        alt="МБанк" 
        className={`${className} object-contain rounded-lg`}
      />
    );
  }
  
  // О!Банк - обновленное изображение из public
  if (paymentMethod.includes('О!Банк')) {
    return (
      <img 
        src="/obanklogo.png" 
        alt="О!Банк" 
        className={`${className} object-contain rounded-lg`}
      />
    );
  }
  
  // Демир Банк - изображение из public
  if (paymentMethod.includes('Демир')) {
    return (
      <img 
        src="/demirbanklogo.png" 
        alt="Демир Банк" 
        className={`${className} object-contain rounded-lg`}
      />
    );
  }
  
  // Bakai Банк - изображение из public
  if (paymentMethod.includes('Bakai')) {
    return (
      <img 
        src="/bakaibanklogo.png" 
        alt="Bakai Банк" 
        className={`${className} object-contain rounded-lg`}
      />
    );
  }
  
  // Оптима Банк - изображение из public
  if (paymentMethod.includes('Оптима')) {
    return (
      <img 
        src="/optimabanklogo.png" 
        alt="Оптима Банк" 
        className={`${className} object-contain rounded-lg`}
      />
    );
  }
  
  // МБизнес - отдельный логотип
  if (paymentMethod.includes('МБизнес') || paymentMethod.includes('mbusiness')) {
    return (
      <img 
        src="/mbusinesslogo.png" 
        alt="МБизнес" 
        className={`${className} object-contain rounded-lg`}
      />
    );
  }
  
  // Дефолтная иконка карты для остальных способов оплаты
  return <span className="text-2xl">💳</span>;
};