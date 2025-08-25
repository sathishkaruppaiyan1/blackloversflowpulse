
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, Plus, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'staff';
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

const UserSettings = () => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'staff' | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'staff'>('staff');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserRoles();
      fetchCurrentUserRole();
    }
  }, [user]);

  const fetchCurrentUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentUserRole(data?.role || null);
    } catch (error: any) {
      console.error('Failed to fetch current user role:', error);
    }
  };

  const fetchUserRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles:user_id (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserRoles(data || []);
    } catch (error: any) {
      toast.error('Failed to load user roles: ' + error.message);
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
      // This would typically send an invitation email
      // For now, we'll just show a message
      toast.success('User invitation feature coming soon!');
      setDialogOpen(false);
      setInviteEmail('');
      setInviteRole('staff');
    } catch (error: any) {
      toast.error('Failed to invite user: ' + error.message);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'staff') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ 
          role: newRole,
          assigned_by: user?.id
        })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('User role updated successfully!');
      fetchUserRoles();
    } catch (error: any) {
      toast.error('Failed to update user role: ' + error.message);
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
      toast.error('Failed to remove user: ' + error.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading users...</div>;
  }

  if (currentUserRole !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Access restricted to administrators only
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You need administrator privileges to manage users.
          </p>
        </CardContent>
      </Card>
    );
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
                    Send an invitation to a new team member
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite_email">Email Address</Label>
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
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {userRoles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found. Invite team members to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {userRoles.map((userRole) => (
                <div key={userRole.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">
                        {userRole.profiles?.full_name || 'Unknown User'}
                      </h3>
                      <Badge variant={userRole.role === 'admin' ? 'default' : 'secondary'}>
                        {userRole.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Added: {new Date(userRole.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {userRole.user_id !== user?.id && (
                      <>
                        <Select
                          value={userRole.role}
                          onValueChange={(value: 'admin' | 'staff') => updateUserRole(userRole.user_id, value)}
                        >
                          <SelectTrigger className="w-32">
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
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
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
