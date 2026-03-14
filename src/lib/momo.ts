/**
 * Mobile Network Detection and Styling Utility for Ghana Providers
 */

export type NetworkType = 'MTN' | 'Telecel' | 'AT' | 'Unknown';

interface NetworkStyles {
  name: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

export const getNetwork = (msisdn: string | number | undefined | null): NetworkType => {
  if (!msisdn) return 'Unknown';
  
  const cleanNum = String(msisdn).replace(/\D/g, '');
  
  // Handle local prefix (0XX...)
  const localPrefix = cleanNum.startsWith('0') ? cleanNum.slice(0, 3) : '';
  
  // Handle intl prefix (233XX...)
  const intlPrefix = cleanNum.startsWith('233') ? cleanNum.slice(0, 5) : '';
  
  // MTN Prefixes: 024, 054, 055, 059, 025, 053
  if (
    ['024', '054', '055', '059', '025', '053'].includes(localPrefix) ||
    (intlPrefix && ['23324', '23354', '23355', '23359', '23325', '23353'].includes(intlPrefix))
  ) return 'MTN';
  
  // Telecel (formerly Vodafone) Prefixes: 020, 050
  if (
    ['020', '050'].includes(localPrefix) ||
    (intlPrefix && ['23320', '23350'].includes(intlPrefix))
  ) return 'Telecel';
  
  // AT (formerly AirtelTigo) Prefixes: 027, 057, 026, 056
  if (
    ['027', '057', '026', '056'].includes(localPrefix) ||
    (intlPrefix && ['23327', '23357', '23326', '23356'].includes(intlPrefix))
  ) return 'AT';
  
  return 'MTN'; // Default to MTN which is the most common
};

export const getNetworkStyles = (network: NetworkType): NetworkStyles => {
  switch (network) {
    case 'MTN':
      return {
        name: 'MTN MoMo',
        bgColor: 'bg-[#FFCC00]',
        textColor: 'text-black',
        accentColor: '#FFCC00'
      };
    case 'Telecel':
      return {
        name: 'Telecel Cash',
        bgColor: 'bg-red-600',
        textColor: 'text-white',
        accentColor: '#E60000'
      };
    case 'AT':
      return {
        name: 'AT Money',
        bgColor: 'bg-blue-800',
        textColor: 'text-white',
        accentColor: '#003399'
      };
    default:
      return {
        name: 'Mobile Money',
        bgColor: 'bg-gray-200',
        textColor: 'text-gray-600',
        accentColor: '#E5E7EB'
      };
  }
};
