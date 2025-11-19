# Team Management Guide

**Last Updated:** 2025-11-19
**Time to Complete:** 5-10 minutes
**Difficulty:** Beginner-friendly

Invite your team members to help manage the chatbot. Control who can see what with role-based permissions.

## Why Add Team Members?

Let your team:
- Monitor conversations
- Upload documents
- Manage settings
- Respond to escalations
- View analytics

Each person logs in with their own account and can only see what they're allowed to see.

## User Roles & Permissions

### Owner
- Full access to everything
- Can invite/remove users
- Can delete workspace
- Can change billing
- Usually: You or founder

**Can do:**
- Everything

**Use for:**
- Yourself or co-founder
- Maximum of 1-2 people

### Admin
- Full access except billing
- Can invite/remove users
- Can manage settings
- Can delete documents
- Usually: Manager or team lead

**Can do:**
- Everything except billing/subscription
- Invite and remove team members

**Use for:**
- Team leads
- Managers
- Senior support staff

### Editor
- Can create/edit documents
- Can edit chatbot settings
- Can view conversations
- Cannot remove users or delete workspace
- Usually: Support team member

**Can do:**
- Upload documents
- Manage knowledge base
- Edit chatbot settings
- View all conversations
- Respond to escalations

**Use for:**
- Support agents
- Content creators
- Operational staff

### Viewer
- Can only view conversations
- Can see analytics
- Cannot edit anything
- Cannot delete
- Usually: Manager, analyst

**Can do:**
- View conversations
- See analytics
- Read documents
- Monitor performance

**Use for:**
- Managers who review quality
- Analysts
- Leadership

### Custom Roles (Enterprise)

Some plans allow custom roles. Contact sales to set up.

## Invite a Team Member

### Step 1: Go to Team Settings

1. Dashboard → Settings (gear icon)
2. Click **Team** or **Members**
3. Click **Invite User** or **Add Team Member**

### Step 2: Enter Their Email

1. Type their email address
2. Example: john@company.com
3. They must have an email address

### Step 3: Select Their Role

1. Choose from:
   - Owner
   - Admin
   - Editor
   - Viewer
2. See the permissions above
3. Select appropriate role

### Step 4: Send Invite

1. Click **Send Invite**
2. Email is sent to them
3. They receive an invitation
4. They click link to accept

### Step 5: They Create Password

When they click the invite link:
1. They see a signup form
2. They create a password
3. They click **Accept & Create Account**
4. They're now part of your team

## Managing Team Members

### View Team Members

**Go to Team settings:**
1. Settings → Team
2. See list of all members
3. Shows:
   - Name/email
   - Role
   - Date joined
   - Last login (optional)

### Change Someone's Role

If someone's role needs to change:

1. Find them in team list
2. Click **Edit** or settings icon
3. Select new role
4. Click **Save**

**Example:**
- Promoted support agent → Editor to Admin
- New analyst → No access to Admin → Viewer

### Remove a Team Member

If someone leaves or shouldn't have access:

1. Find them in list
2. Click **Remove** or delete icon
3. Confirm removal
4. They lose access immediately

**What happens:**
- They can't log in anymore
- Their conversations stay (for records)
- Their documents aren't deleted
- Admin can see what they did

### Resend Invite

If someone didn't receive or lost the email:

1. Find them in team list
2. Click **Resend Invite**
3. New invitation email is sent
4. They get 7 days to accept

## Transfer Ownership

If you need to give the workspace to someone else:

### Step 1: Go to Team Settings
1. Settings → Team
2. Find the person who will own it

### Step 2: Change Their Role
1. Click **Edit**
2. Select **Owner**
3. Click **Save**

### Step 3: They Become Owner
- They now have full control
- You become Admin (or chosen role)
- Original owner cannot be deleted

**Note:** You can make multiple owners, but you typically want just 1-2.

### Making Yourself Admin Only

After transfer:
1. Go to Team
2. Click your name
3. Change role to **Admin**
4. Click **Save**

Now you're an admin and they're the owner.

## Team Permissions Table

| Action | Owner | Admin | Editor | Viewer |
|--------|-------|-------|--------|--------|
| **Chatbot** |
| Create/delete | Yes | Yes | No | No |
| Edit settings | Yes | Yes | Yes | No |
| View | Yes | Yes | Yes | Yes |
| **Documents** |
| Upload | Yes | Yes | Yes | No |
| Edit | Yes | Yes | Yes | No |
| Delete | Yes | Yes | Yes | No |
| **Conversations** |
| View | Yes | Yes | Yes | Yes |
| Delete | Yes | Yes | No | No |
| **Team** |
| Invite users | Yes | Yes | No | No |
| Remove users | Yes | Yes | No | No |
| Change roles | Yes | Yes | No | No |
| **Billing** |
| View | Yes | No | No | No |
| Change plan | Yes | No | No | No |
| Update payment | Yes | No | No | No |
| **Workspace** |
| Delete | Yes | No | No | No |
| Transfer ownership | Yes | No | No | No |

## Best Practices

### Principle of Least Privilege

Give people the **minimum** role they need:

**Example:**
- Support agent answering chats → Editor
- Not → Admin
- Not → Owner

**Why?**
- Prevents accidents
- Improves security
- Easier to manage
- Limits damage if account compromised

### Ownership Structure

**Recommended:**
- 1 primary owner (usually CEO/founder)
- 1-2 backup admins
- Regular team members as Editors/Viewers

**Why?**
- Clear chain of command
- Easy to make decisions
- Prevents confusion
- Clear escalation path

### Security Tips

**For Team Members:**
- Use strong passwords
- Don't share login credentials
- Log out when done
- Use different passwords for work accounts

**For Admins:**
- Check team list monthly
- Remove people who left
- Update roles if responsibilities change
- Review who has access

## Removing Someone Safely

When someone leaves or you need to remove access:

### Step 1: Get Their Information
- Backup: Conversations, documents, settings
- Note: What they were responsible for

### Step 2: Reassign Work
- Transfer documents
- Assign someone to handle escalations
- Update processes

### Step 3: Remove Access
1. Go to Team
2. Find their name
3. Click **Remove**
4. Confirm

### Step 4: Verify Removed
- Try logging in as them (should fail)
- Check they don't appear in team list
- Confirm in audit log (if available)

## Activity & Audit Log

See who did what and when:

**Go to:**
1. Settings → Activity Log or Audit Log
2. See list of actions:
   - Who made the change
   - What changed
   - When it changed
   - What was before/after

**Useful for:**
- Tracking who uploaded documents
- Seeing when settings changed
- Finding who deleted something
- Compliance and security

## Troubleshooting

### Invite Email Not Received

**First check:**
1. Did you spell their email correctly?
2. Did you click "Send Invite"?
3. Check their spam/junk folder
4. Wait 5 minutes and check again

**If still missing:**
1. Go to Team
2. Find their name
3. Click **Resend Invite**
4. New email should arrive

### They Can't Log In After Accepting

**Check:**
1. Did they click the invite link?
2. Did they create a password?
3. Are they using the correct email?
4. Are they using the correct password?

**Try:**
1. Go to Settings → Team
2. Click **Resend Invite** again
3. They should get a new email
4. Follow steps again

### Wrong Permission Level

**Fix:**
1. Go to Settings → Team
2. Find their name
3. Click **Edit**
4. Change role
5. Click **Save**

Takes effect immediately.

### Can't Remove Someone

**Check:**
1. Do you have permission to remove users?
   - Only Owner and Admin can
   - Editors and Viewers cannot
2. Are you trying to remove the only owner?
   - You must transfer ownership first

**If still stuck:**
1. Email support@metachats.ai
2. Provide person's email
3. We can help

## Next Steps

Your team is set up! What's next?

### To Manage Billing
Go to: [Billing & Plans Guide](billing.md)

See your plan and manage subscriptions.

### To Set Up Integrations
Go to: [Integrations Guide](integrations.md)

Connect with other tools and systems.

## Key Takeaways

- Owner has full access
- Admin can manage everything except billing
- Editor can create content and manage docs
- Viewer can only see conversations
- Remove access immediately when someone leaves
- Check activity log for audit trail

## Questions?

- **Can't send invite?** Check email is spelled correctly
- **Permission denied?** Need to be Owner or Admin
- **Still stuck?** Email support@metachats.ai

---

**Last Updated:** 2025-11-19
**Word Count:** 1,098 words
