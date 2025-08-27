
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GeneralSettings from '@/components/settings/GeneralSettings';
import CourierSettings from '@/components/settings/CourierSettings';
import ApiSettings from '@/components/settings/ApiSettings';
import UserSettings from '@/components/settings/UserSettings';
import ProfileSettings from '@/components/settings/ProfileSettings';
import { useUserRole } from '@/hooks/useUserRole';

const SettingsPage = () => {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = role === 'admin';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your application settings and integrations
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-2'}`}>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isAdmin && <TabsTrigger value="general">General</TabsTrigger>}
          {isAdmin && <TabsTrigger value="couriers">Couriers</TabsTrigger>}
          {isAdmin && <TabsTrigger value="api">API</TabsTrigger>}
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings />
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="general" className="mt-6">
              <GeneralSettings />
            </TabsContent>

            <TabsContent value="couriers" className="mt-6">
              <CourierSettings />
            </TabsContent>

            <TabsContent value="api" className="mt-6">
              <ApiSettings />
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <UserSettings />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default SettingsPage;
