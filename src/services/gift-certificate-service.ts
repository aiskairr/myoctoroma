
interface GiftCertificate {
  id: number;
  certificateNumber: string;
  amount: number;
  adminName: string;
  paymentMethod: string;
  discount: string;
  expiryDate: string;
  clientName?: string;
  phoneNumber?: string;
  serviceType?: string;
  duration?: string;
  masterName?: string;
  isUsed: boolean;
  isExpired: boolean;
  branchId: string;
  createdAt?: string; // Формат: YYYY-MM-DD HH:mm:ss
  updatedAt?: string; // Формат: YYYY-MM-DD HH:mm:ss
}

class GiftCertificateService {
  async getCertificates(branchId: string): Promise<GiftCertificate[]> {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates?branchId=${branchId}`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching gift certificates:', error);
      return [];
    }
  }

  async saveCertificate(certificate: Omit<GiftCertificate, 'id' | 'createdAt' | 'updatedAt'>): Promise<GiftCertificate | null> {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          certificateNumber: certificate.certificateNumber,
          amount: certificate.amount,
          adminName: certificate.adminName,
          paymentMethod: certificate.paymentMethod,
          discount: certificate.discount,
          expiryDate: certificate.expiryDate,
          branchId: certificate.branchId
        }),
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error saving gift certificate:', error);
      return null;
    }
  }

  async updateCertificate(id: number, updates: Partial<GiftCertificate>): Promise<GiftCertificate | null> {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error updating gift certificate:', error);
      return null;
    }
  }

  async findCertificateByNumber(certificateNumber: string, branchId: string): Promise<GiftCertificate | null> {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates/search/${certificateNumber}?branchId=${branchId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error searching gift certificate:', error);
      return null;
    }
  }

  async getActiveCertificates(branchId: string): Promise<GiftCertificate[]> {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates?branchId=${branchId}&isUsed=false`);
      if (response.ok) {
        const certificates = await response.json();
        const today = new Date();
        return certificates.filter((cert: GiftCertificate) => 
          !cert.isExpired && new Date(cert.expiryDate) >= today
        );
      }
      return [];
    } catch (error) {
      console.error('Error fetching active gift certificates:', error);
      return [];
    }
  }

  async getUsedCertificates(branchId: string): Promise<GiftCertificate[]> {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates?branchId=${branchId}&isUsed=true`);
      if (response.ok) {
        const usedCerts = await response.json();
        
        // Also get expired certificates
        const allCertsResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates?branchId=${branchId}`);
        if (allCertsResponse.ok) {
          const allCerts = await allCertsResponse.json();
          const expiredCerts = allCerts.filter((cert: GiftCertificate) => cert.isExpired);
          
          // Combine used and expired certificates, removing duplicates
          const combined = [...usedCerts, ...expiredCerts];
          const unique = combined.filter((cert, index, self) => 
            index === self.findIndex(c => c.id === cert.id)
          );
          return unique;
        }
        return usedCerts;
      }
      return [];
    } catch (error) {
      console.error('Error fetching used gift certificates:', error);
      return [];
    }
  }

  async deleteCertificate(id: number): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/gift-certificates/${id}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting gift certificate:', error);
      return false;
    }
  }
}

export const giftCertificateService = new GiftCertificateService();
