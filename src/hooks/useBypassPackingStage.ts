import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useBypassPackingStage = () => {
  const [bypassPackingStage, setBypassPackingStage] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchSetting = async () => {
      try {
        const { data, error } = await supabase
          .from('company_settings')
          .select('bypass_packing_stage')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching bypass packing stage setting:', error);
          setBypassPackingStage(false);
        } else {
          setBypassPackingStage(data?.bypass_packing_stage ?? false);
        }
      } catch (error) {
        console.error('Error fetching bypass packing stage setting:', error);
        setBypassPackingStage(false);
      } finally {
        setLoading(false);
      }
    };

    fetchSetting();

    // Subscribe to changes in company_settings
    const channel = supabase
      .channel('company_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_settings',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.new && 'bypass_packing_stage' in payload.new) {
            setBypassPackingStage((payload.new as any).bypass_packing_stage ?? false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { bypassPackingStage, loading };
};

