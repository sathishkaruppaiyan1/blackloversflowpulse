
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GeneralSettings from '@/components/settings/GeneralSettings';
import CourierSettings from '@/components/settings/CourierSettings';
import ApiSettings from '@/components/settings/ApiSettings';
import UserSettings from '@/components/settings/UserSettings';
import ProfileSettings from '@/components/settings/ProfileSettings';

const SettingsPage = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your application settings and integrations
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="couriers">Couriers</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

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

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
