
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import StaffInviteDialog from './StaffInviteDialog';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'staff';
  created_at: string;
}

const UserSettings = () => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { role: currentUserRole, loading: roleLoading } = useUserRole();

  useEffect(() => {
    if (user && currentUserRole === 'admin') {
      fetchUserRoles();
    }
  }, [user, currentUserRole]);

  const fetchUserRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          profiles:user_id(
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user roles:', error);
        setUserRoles([]);
        return;
      }
      
      const typedData = (data || []).map(item => ({
        ...item,
        role: item.role as 'admin' | 'staff'
      }));
      
      setUserRoles(typedData);
    } catch (error: any) {
      console.error('Error fetching user roles:', error);
      toast.error('Failed to load user roles');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'staff') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('User role updated successfully!');
      fetchUserRoles();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const removeUser = async (userId: string) => {
    if (userId === user?.id) {
      toast.error('Cannot remove yourself');
      return;
    }

    try {
      // Remove from user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) throw roleError;

      // Remove from profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) {
        console.warn('Profile deletion error:', profileError);
      }

      // Delete user from auth (admin function)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.warn('Auth deletion error:', authError);
      }

      toast.success('User removed successfully!');
      fetchUserRoles();
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast.error('Failed to remove user');
    }
  };

  // Show loading while checking role
  if (roleLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Checking permissions...</p>
      </div>
    );
  }

  // Only show this tab to admins
  if (currentUserRole !== 'admin') {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            <p className="text-muted-foreground">You don't have permission to access user management.</p>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Current user: {user?.email}</p>
              <p className="text-sm text-gray-600">Current role: {currentUserRole || 'None'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage staff members and their access levels
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {userRoles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No staff members found. Add your first team member to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {userRoles.map((userRole) => (
                <div key={userRole.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">
                        {(userRole as any).profiles?.full_name || `User ID: ${userRole.user_id}`}
                      </h3>
                      <Badge variant={userRole.role === 'admin' ? 'default' : 'secondary'}>
                        {userRole.role}
                      </Badge>
                      {userRole.user_id === user?.id && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Added: {new Date(userRole.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={userRole.role}
                      onValueChange={(value: 'admin' | 'staff') => updateUserRole(userRole.user_id, value)}
                      disabled={userRole.user_id === user?.id}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeUser(userRole.user_id)}
                      disabled={userRole.user_id === user?.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <StaffInviteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onStaffCreated={fetchUserRoles}
      />
    </div>
  );
};

export default UserSettings;
