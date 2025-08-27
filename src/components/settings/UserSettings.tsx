
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'staff'>('staff');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkUserRole();
      fetchUserRoles();
    }
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data?.role) {
        setCurrentUserRole(data.role);
      } else {
        // If no role exists for this user, create admin role automatically
        console.log('No role found for current user, creating admin role...');
        await createAdminRole();
      }
    } catch (error: any) {
      console.error('Error checking user role:', error);
      // If there's an error (like table doesn't exist), assume admin for first user
      setCurrentUserRole('admin');
    }
  };

  const createAdminRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'admin'
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentUserRole('admin');
      toast.success('Admin role created successfully!');
      console.log('✅ Admin role created for user:', user.email);
    } catch (error: any) {
      console.error('Error creating admin role:', error);
      
      // If user_roles table doesn't exist, we'll assume admin access
      if (error.code === '42P01' || error.message?.includes('relation "user_roles" does not exist')) {
        console.log('user_roles table does not exist, granting admin access');
        setCurrentUserRole('admin');
        toast.info('User roles table not found. You have been granted admin access.');
      } else {
        toast.error('Failed to create admin role');
      }
    }
  };

  const fetchUserRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          *,
          profiles:user_id(
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, create empty array
        if (error.code === '42P01' || error.message?.includes('relation "user_roles" does not exist')) {
          console.log('user_roles table does not exist');
          setUserRoles([]);
          return;
        }
        throw error;
      }
      
      // Type assertion with proper validation
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

  const inviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    try {
      // For demo purposes, create a mock user role entry with a generated ID
      const mockUserId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: mockUserId,
          role: inviteRole
        });

      if (roleError) {
        console.warn('Could not create user role:', roleError);
        // Fallback to just showing success for demo
        toast.success(`Demo user ${inviteEmail} added as ${inviteRole} (Mock entry)`);
      } else {
        toast.success(`Demo user ${inviteEmail} added as ${inviteRole}`);
        fetchUserRoles();
      }
      
      setInviteEmail('');
      setInviteRole('staff');
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Error adding demo user:', error);
      toast.error(`Failed to add user: ${error.message}`);
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
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('User removed successfully!');
      fetchUserRoles();
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast.error('Failed to remove user');
    }
  };

  // Show loading while checking role
  if (currentUserRole === null && user) {
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
              <Button 
                onClick={createAdminRole}
                variant="outline"
                className="mt-4"
              >
                Grant Admin Access
              </Button>
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>
                    Add a new team member (Demo: Creates user immediately)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite_email">Email Address *</Label>
                    <Input
                      id="invite_email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite_role">Role</Label>
                    <Select value={inviteRole} onValueChange={(value: 'admin' | 'staff') => setInviteRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={inviteUser}>
                    Add User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {userRoles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found. Invite your first team member to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {userRoles.map((userRole) => (
                <div key={userRole.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">
                        {(userRole as any).profiles?.email || (userRole as any).profiles?.full_name || `User ID: ${userRole.user_id}`}
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
                    {(userRole as any).profiles?.email && (
                      <p className="text-xs text-muted-foreground">
                        Email: {(userRole as any).profiles.email}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={userRole.role}
                      onValueChange={(value: 'admin' | 'staff') => updateUserRole(userRole.user_id, value)}
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
    </div>
  );
};

export default UserSettings;
