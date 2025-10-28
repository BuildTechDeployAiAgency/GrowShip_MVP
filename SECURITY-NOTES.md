# Security Notes for GrowShip

## 🚨 Known Vulnerabilities

### High Severity

**Package:** `xlsx` (0.18.5)

- **Issue 1:** Prototype Pollution vulnerability
  - Advisory: https://github.com/advisories/GHSA-4r6h-8v6p-xvw6
- **Issue 2:** Regular Expression Denial of Service (ReDoS)
  - Advisory: https://github.com/advisories/GHSA-5pgg-2g8v-p4x9
- **Status:** No fix available as of October 2025
- **Impact:** Used for Excel file import/export functionality
- **Mitigation:**
  - Only allow trusted users to upload Excel files
  - Implement file size limits
  - Consider alternative libraries (e.g., `exceljs`)
  - Monitor for package updates

**Recommendation:** Consider replacing `xlsx` with a safer alternative like `exceljs` or `xlsx-populate` if security is critical for your use case.

## 🔐 Security Best Practices Implemented

### 1. Authentication & Authorization

- ✅ Supabase authentication with email/password
- ✅ Row Level Security (RLS) policies on database
- ✅ Role-based access control (RBAC)
- ✅ User status management (pending/approved/suspended)
- ✅ Middleware-level route protection
- ✅ Session validation on every request

### 2. Data Protection

- ✅ Environment variables for sensitive keys
- ✅ Service role key never exposed to client
- ✅ API keys stored server-side only
- ✅ Secure cookie handling via Supabase SSR
- ✅ HTTPS enforcement (in production)

### 3. Input Validation

- ✅ Zod schema validation on all forms
- ✅ React Hook Form for controlled inputs
- ✅ Type safety with TypeScript
- ✅ Parameterized queries (Supabase client)

### 4. XSS Prevention

- ✅ React's built-in XSS protection
- ✅ No `dangerouslySetInnerHTML` usage
- ✅ Sanitized user inputs

### 5. CSRF Protection

- ✅ Supabase handles CSRF tokens
- ✅ SameSite cookie attributes
- ✅ Token-based authentication

## 🔒 Security Recommendations

### For Development

1. **Never commit `.env.local` to git**

   - Already in `.gitignore`
   - Use `env.example` as template

2. **Use environment-specific keys**

   - Separate Supabase projects for dev/staging/prod
   - Different API keys per environment

3. **Regular dependency updates**

   ```bash
   npm audit
   npm update
   ```

4. **Code reviews for security**
   - Check for hardcoded secrets
   - Verify permission checks
   - Review database query patterns

### For Production

1. **Enable Supabase Security Features**

   - Rate limiting on auth endpoints
   - Email verification required
   - Password complexity requirements
   - Account lockout after failed attempts

2. **Configure CORS properly**

   - Whitelist only your domains
   - No wildcard (`*`) origins

3. **Database Security**

   - Enable RLS on ALL tables
   - Test RLS policies thoroughly
   - Regular security audits
   - Backup encryption

4. **Monitoring & Logging**

   - Set up Supabase audit logs
   - Monitor failed auth attempts
   - Track permission violations
   - Alert on suspicious activity

5. **Content Security Policy**

   - Add CSP headers in `next.config.ts`
   - Restrict inline scripts
   - Control resource loading

6. **API Rate Limiting**
   - Implement rate limiting for API routes
   - Use Vercel's rate limiting features
   - Monitor for abuse patterns

## 🛡️ Supabase RLS Policy Examples

### User Profiles Table

```sql
-- Users can only read their own profile
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
ON user_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role_name = 'super_admin'
  )
);
```

### Organization Data

```sql
-- Users can only access data from their organization
CREATE POLICY "Organization member access"
ON orders FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_memberships
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);
```

## 🚫 What NOT to Do

❌ **Don't expose service role key to client**

```typescript
// BAD - Never do this
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
```

❌ **Don't bypass RLS**

```typescript
// BAD - Avoid service role client unless necessary
const supabase = createServiceRoleClient();
```

❌ **Don't trust client-side permission checks alone**

```typescript
// BAD - Always verify server-side
if (userRole === "admin") {
  deleteUser(); // This can be bypassed on client
}
```

❌ **Don't store sensitive data in localStorage**

```typescript
// BAD
localStorage.setItem("creditCard", cardNumber);

// GOOD - Only cache non-sensitive display data
localStorage.setItem("userPreferences", JSON.stringify(prefs));
```

## ✅ What TO Do

✅ **Always verify permissions server-side**

```typescript
// GOOD - Server-side API route with permission check
export async function DELETE(request: Request) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response("Unauthorized", { status: 401 });

  // Check permissions before action
  const hasPermission = await checkUserPermission(user.id, "delete_users");
  if (!hasPermission) return new Response("Forbidden", { status: 403 });

  // Perform action
}
```

✅ **Use parameterized queries**

```typescript
// GOOD - Supabase automatically parameterizes
await supabase.from("users").select().eq("email", userEmail); // Safe from SQL injection
```

✅ **Validate all inputs**

```typescript
// GOOD - Zod validation
const schema = z.object({
  email: z.string().email(),
  age: z.number().min(0).max(120),
});

const validated = schema.parse(userInput);
```

## 📋 Security Audit Checklist

Before deploying to production:

- [ ] All environment variables configured correctly
- [ ] RLS enabled on all Supabase tables
- [ ] RLS policies tested for each role
- [ ] No hardcoded secrets in code
- [ ] CORS configured (no wildcard origins)
- [ ] HTTPS enforced
- [ ] Rate limiting configured
- [ ] Error messages don't leak sensitive info
- [ ] File upload limits in place
- [ ] Input validation on all forms
- [ ] Dependencies audited (`npm audit`)
- [ ] Sensitive logging removed
- [ ] Auth redirect URLs whitelisted
- [ ] Session timeout configured
- [ ] Password requirements enforced
- [ ] Email verification required
- [ ] Account lockout after failed attempts

## 🔄 Regular Maintenance

**Weekly:**

- Review Supabase auth logs
- Check for failed authentication attempts
- Monitor API usage patterns

**Monthly:**

- Run `npm audit` and update dependencies
- Review and rotate API keys if needed
- Check for new security advisories

**Quarterly:**

- Full security audit
- Penetration testing
- Update security documentation

## 📞 Security Incident Response

If you discover a security vulnerability:

1. **Do not** post publicly
2. Document the issue privately
3. Assess impact and affected users
4. Develop and test a fix
5. Deploy fix to production
6. Notify affected users if needed
7. Update security documentation

---

**Last Updated:** October 27, 2025
**Security Review Date:** October 27, 2025
