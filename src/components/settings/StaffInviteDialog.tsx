
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface StaffInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStaffCreated: () => void;
}

const StaffInviteDialog = ({ open, onOpenChange, onStaffCreated }: StaffInviteDialogProps) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [loading, setLoading] = useState(false);

  const generatePassword = (): string => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const createStaffMember = async () => {
    if (!email.trim() || !fullName.trim()) {
      toast.error('Email and full name are required');
      return;
    }

    setLoading(true);
    try {
      const password = generatePassword();

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.trim(),
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName.trim()
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        toast.error(`Failed to create user: ${authError.message}`);
        return;
      }

      if (!authData.user) {
        toast.error('Failed to create user');
        return;
      }

      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          full_name: fullName.trim()
        });

      if (profileError) {
        console.warn('Profile creation error:', profileError);
      }

      // Create user role entry
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: role
        });

      if (roleError) {
        console.warn('Role creation error:', roleError);
      }

      // Show success message with credentials
      toast.success(`Staff member created successfully!`);
      
      // Copy credentials to clipboard
      const credentials = `Email: ${email}\nPassword: ${password}`;
      navigator.clipboard.writeText(credentials).then(() => {
        toast.success('Login credentials copied to clipboard!');
      });

      // Reset form
      setEmail('');
      setFullName('');
      setRole('staff');
      onOpenChange(false);
      onStaffCreated();

      // Alert with credentials (as backup)
      alert(`Staff Member Created Successfully!\n\nLogin Credentials:\nEmail: ${email}\nPassword: ${password}\n\nPlease save these credentials and share them securely with the staff member.`);

    } catch (error: any) {
      console.error('Error creating staff member:', error);
      toast.error(`Failed to create staff member: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
          <DialogDescription>
            Create a new staff member account with auto-generated credentials
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff_email">Email Address *</Label>
            <Input
              id="staff_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff_name">Full Name *</Label>
            <Input
              id="staff_name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff_role">Role</Label>
            <Select value={role} onValueChange={(value: 'admin' | 'staff') => setRole(value)}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={createStaffMember} disabled={loading}>
            {loading ? 'Creating...' : 'Create Staff Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StaffInviteDialog;
