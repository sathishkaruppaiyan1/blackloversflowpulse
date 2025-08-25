
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { interaktService } from '@/services/interaktService';
import { toast } from 'sonner';

export const useInteraktIntegration = () => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const initializeInterakt = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        await interaktService.initialize(user.id);
        setIsConfigured(interaktService.isConfigured());
        setIsActive(interaktService.isActive());
      } catch (error) {
        console.error('Failed to initialize Interakt:', error);
        toast.error('Failed to initialize WhatsApp integration');
      } finally {
        setLoading(false);
      }
    };

    initializeInterakt();
  }, [user]);

  const sendTrackingNotification = async (
    orderNumber: string,
    customerName: string,
    trackingNumber: string,
    carrier: string,
    orderValue: number | string,
    shippingAddress: string,
    phoneNumber?: string
  ): Promise<boolean> => {
    if (!isActive || !phoneNumber) {
      console.log('Interakt not active or no phone number provided');
      return false;
    }

    try {
      const success = await interaktService.sendTrackingUpdateToCustomer(
        {
          orderNumber,
          customerName,
          trackingNumber,
          carrier,
          orderValue: orderValue.toString(),
          shippingAddress
        },
        phoneNumber
      );

      if (success) {
        toast.success('WhatsApp tracking notification sent successfully!');
      } else {
        toast.error('Failed to send WhatsApp notification');
      }

      return success;
    } catch (error) {
      console.error('Error sending tracking notification:', error);
      toast.error('Failed to send WhatsApp notification');
      return false;
    }
  };

  const sendResellerTrackingNotification = async (
    orderNumber: string,
    customerName: string,
    trackingNumber: string,
    carrier: string,
    orderValue: number | string,
    shippingAddress: string,
    resellerName: string,
    resellerPhone: string,
    customerPhone?: string,
    productName?: string,
    productVariant?: string
  ): Promise<boolean> => {
    if (!isActive || !resellerPhone) {
      console.log('Interakt not active or no reseller phone number provided');
      return false;
    }

    try {
      const success = await interaktService.sendTrackingUpdateToReseller(
        {
          orderNumber,
          customerName,
          trackingNumber,
          carrier,
          orderValue: orderValue.toString(),
          shippingAddress,
          resellerName,
          customerPhone,
          productName,
          productVariant
        },
        resellerPhone,
        resellerName
      );

      if (success) {
        toast.success(`WhatsApp tracking notification sent to reseller: ${resellerName}!`);
      } else {
        toast.error('Failed to send WhatsApp notification to reseller');
      }

      return success;
    } catch (error) {
      console.error('Error sending reseller tracking notification:', error);
      toast.error('Failed to send WhatsApp notification to reseller');
      return false;
    }
  };

  return {
    isConfigured,
    isActive,
    loading,
    sendTrackingNotification,
    sendResellerTrackingNotification
  };
};
