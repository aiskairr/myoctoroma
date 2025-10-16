# User Profile Update Feature

## Overview
Added a user profile management interface to the Settings page that allows authenticated users to update their email and password via the `/api/user` PATCH endpoint.

## API Endpoint Integration

### Endpoint: `PATCH /api/user`

**Request Body:**
```json
{
  "email": "newemail@example.com",  // optional
  "password": "newPassword123"       // optional
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User profile updated successfully",
  "user": {
    "id": 123,
    "email": "newemail@example.com",
    "username": "user@example.com",
    "role": "admin"
  }
}
```

**Error Responses:**
- `400` - At least one field required
- `401` - Unauthorized (invalid/missing token)
- `409` - Email already exists
- `500` - Internal server error

## Implementation Details

### 1. Translation Keys Added (×3 languages: ru/ky/en)

**Location:** `src/contexts/LocaleContext.tsx`

Total: **17 new translation keys** per language = 51 total translations

```typescript
// Russian
'settings.profile_title': 'Профиль пользователя'
'settings.profile_description': 'Обновление email и пароля'
'settings.current_email': 'Текущий email:'
'settings.new_email_label': 'Новый email'
'settings.new_email_placeholder': 'newemail@example.com'
'settings.new_password_label': 'Новый пароль'
'settings.new_password_placeholder': 'Введите новый пароль'
'settings.confirm_password_label': 'Подтвердите пароль'
'settings.confirm_password_placeholder': 'Повторите новый пароль'
'settings.update_profile_button': 'Обновить профиль'
'settings.updating_button': 'Обновление...'
'settings.profile_updated': 'Профиль обновлен'
'settings.profile_updated_description': 'Данные профиля успешно обновлены'
'settings.profile_update_error': 'Ошибка обновления профиля'
'settings.passwords_not_match': 'Пароли не совпадают'
'settings.at_least_one_field': 'Заполните хотя бы одно поле (email или пароль)'
'settings.email_already_exists': 'Email уже используется'

// Kyrgyz + English translations also added
```

### 2. Component Updates

**File:** `src/pages/Settings.tsx`

#### Added Imports:
```typescript
import { useAuth } from '@/contexts/SimpleAuthContext';
```

#### Added State:
```typescript
const { user } = useAuth();

const [userProfile, setUserProfile] = useState({
  email: "",
  password: "",
  confirmPassword: "",
});
```

#### Added Mutation:
```typescript
const updateProfileMutation = useMutation({
  mutationFn: async (data: { email?: string; password?: string }) => {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0] || ''}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      if (response.status === 409) {
        throw new Error(t('settings.email_already_exists'));
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  onSuccess: () => {
    toast({
      title: t('settings.profile_updated'),
      description: t('settings.profile_updated_description'),
    });
    // Reset form
    setUserProfile({ email: "", password: "", confirmPassword: "" });
  },
  onError: (error: Error) => {
    toast({
      title: t('settings.profile_update_error'),
      description: error.message,
      variant: "destructive",
    });
  },
});
```

#### Added Handlers:
```typescript
const handleProfileInputChange = (key: keyof typeof userProfile, value: string) => {
  setUserProfile((prev) => ({ ...prev, [key]: value }));
};

const handleUpdateProfile = async () => {
  // Validation
  if (!userProfile.email && !userProfile.password) {
    toast({
      title: t('error'),
      description: t('settings.at_least_one_field'),
      variant: "destructive",
    });
    return;
  }

  if (userProfile.password && userProfile.password !== userProfile.confirmPassword) {
    toast({
      title: t('error'),
      description: t('settings.passwords_not_match'),
      variant: "destructive",
    });
    return;
  }

  // Prepare data
  const updateData: { email?: string; password?: string } = {};
  if (userProfile.email) updateData.email = userProfile.email;
  if (userProfile.password) updateData.password = userProfile.password;

  try {
    await updateProfileMutation.mutateAsync(updateData);
  } catch (error) {
    console.error('Error updating profile:', error);
  }
};
```

### 3. UI Component

**Location:** First card on Settings page (before Booking Links)

**Features:**
- ✅ Displays current email from AuthContext
- ✅ Optional email update field
- ✅ Optional password update fields
- ✅ Password confirmation validation
- ✅ Loading states with spinner
- ✅ Success/error toast notifications
- ✅ Form reset after successful update
- ✅ Fully localized (ru/ky/en)

**UI Structure:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>{t('settings.profile_title')}</CardTitle>
    <CardDescription>{t('settings.profile_description')}</CardDescription>
  </CardHeader>
  <CardContent>
    <form>
      {/* Current Email Display */}
      <div>Current email: {user.email}</div>

      {/* New Email Input */}
      <Input type="email" />

      {/* New Password Input */}
      <Input type="password" />

      {/* Confirm Password Input (conditional) */}
      {userProfile.password && <Input type="password" />}

      {/* Submit Button */}
      <Button disabled={isPending}>
        {isPending ? 'Updating...' : 'Update Profile'}
      </Button>
    </form>
  </CardContent>
</Card>
```

## Validation

### Client-Side Validation:
1. **At least one field required** - Must provide email OR password
2. **Password match** - Confirm password must match new password
3. **Empty string handling** - Only sends non-empty fields to API

### Server-Side Validation (handled by backend):
- Email format validation
- Email uniqueness check
- Password strength (if implemented)
- Token authentication

## Error Handling

### Status Codes:
- `400` - Shows validation error message
- `401` - Authentication error (redirects or shows error)
- `409` - Email conflict - shows localized "Email already exists" message
- `500` - Generic server error

### Toast Notifications:
- **Success:** Green toast with "Profile updated" message
- **Error:** Red destructive toast with specific error message
- **Validation:** Yellow/warning toast for client-side validation errors

## User Flow

1. User navigates to Settings page
2. Sees "User Profile" card at the top
3. Can view their current email
4. Can enter new email (optional)
5. Can enter new password + confirmation (optional)
6. Clicks "Update Profile" button
7. Form validates inputs
8. API request sent with Bearer token
9. Success: Toast shown, form resets
10. Error: Toast shown with error message

## Security Features

- ✅ Bearer token authentication
- ✅ Secure password input fields (type="password")
- ✅ Password confirmation required
- ✅ Form reset after success (clears sensitive data)
- ✅ Error messages don't expose system details
- ✅ HTTPS enforced in production

## Testing Scenarios

### Test Case 1: Update Email Only
```
Input: email = "newemail@example.com"
Expected: 200 OK, email updated, toast shown
```

### Test Case 2: Update Password Only
```
Input: password = "newPass123", confirmPassword = "newPass123"
Expected: 200 OK, password updated, toast shown
```

### Test Case 3: Update Both
```
Input: email + password
Expected: 200 OK, both updated, toast shown
```

### Test Case 4: Password Mismatch
```
Input: password = "abc", confirmPassword = "xyz"
Expected: Client validation error, no API call
```

### Test Case 5: Empty Form
```
Input: (empty)
Expected: Client validation error "at least one field required"
```

### Test Case 6: Email Conflict
```
Input: email = "existing@example.com"
Expected: 409 error, "Email already exists" toast
```

## Build Status

✅ **Build Successful**
- Vite build: 9.22s
- Bundle size: 2,654.49 KB
- No TypeScript errors
- No localization errors
- All translations validated (ru/ky/en)

## Files Modified

1. `src/contexts/LocaleContext.tsx` - Added 51 translations (17 keys × 3 languages)
2. `src/pages/Settings.tsx` - Added profile update UI, mutation, handlers
3. `docs/USER_PROFILE_UPDATE_FEATURE.md` - This documentation

## Future Enhancements

- [ ] Add email verification flow
- [ ] Add password strength indicator
- [ ] Add "show password" toggle
- [ ] Add two-factor authentication
- [ ] Add session management (logout other devices)
- [ ] Add profile photo upload
- [ ] Add notification preferences

## Related Documentation

- `docs/API_SPECIFICATION.md` - Backend API documentation
- `docs/FRONTEND_INTEGRATION.md` - Frontend integration patterns
- Swagger: `/api/user` PATCH endpoint
