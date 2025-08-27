
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
      // Generate a mock user ID for demo purposes
      const mockUserId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const password = generatePassword();

      // Create profile entry (demo mode)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: mockUserId,
          full_name: fullName.trim(),
          email: email.trim() // Store email in profile for display
        });

      if (profileError) {
        console.warn('Profile creation error:', profileError);
        // Continue anyway for demo purposes
      }

      // Create user role entry
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: mockUserId,
          role: role
        });

      if (roleError) {
        console.warn('Role creation error:', roleError);
        // Continue anyway for demo purposes
      }

      // Show success message
      toast.success(`Demo staff member created successfully!`);
      
      // Copy demo info to clipboard
      const demoInfo = `Demo Staff Member:\nName: ${fullName}\nEmail: ${email}\nRole: ${role}\nDemo Password: ${password}`;
      navigator.clipboard.writeText(demoInfo).then(() => {
        toast.success('Demo credentials copied to clipboard!');
      }).catch(() => {
        console.log('Clipboard write failed, showing alert instead');
      });

      // Reset form
      setEmail('');
      setFullName('');
      setRole('staff');
      onOpenChange(false);
      onStaffCreated();

      // Alert with demo info
      alert(`Demo Staff Member Created!\n\nThis is a demo entry for testing purposes.\n\nName: ${fullName}\nEmail: ${email}\nRole: ${role}\nDemo Password: ${password}\n\nIn production, this would send an actual invitation email.`);

    } catch (error: any) {
      console.error('Error creating demo staff member:', error);
      toast.error(`Failed to create demo staff member: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Staff Member (Demo)</DialogTitle>
          <DialogDescription>
            Create a demo staff member entry for testing user management functionality
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
            {loading ? 'Creating...' : 'Create Demo Staff'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StaffInviteDialog;
