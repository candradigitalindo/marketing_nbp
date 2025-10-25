# WhatsApp Number Validation - Test Cases

## Validation Rules

### 1. Length Check
- ✅ Minimum: 10 digits
- ✅ Maximum: 15 digits
- ❌ Less than 10: "Nomor telepon terlalu pendek (minimal 10 digit)"
- ❌ More than 15: "Nomor telepon terlalu panjang (maksimal 15 digit)"

### 2. Format Validation (Indonesian Numbers)
Untuk nomor dengan 10 digit:
- ✅ Harus dimulai dengan digit 8 (format 08xx)
- ❌ Tidak dimulai dengan 8: Invalid

Untuk nomor dengan 11 digit:
- ✅ Harus dimulai dengan 62 (format 62xxx)
- ❌ Tidak dimulai dengan 62: Invalid

Untuk nomor dengan 12+ digit:
- ✅ Harus dimulai dengan 62 (format 62xxx)
- ❌ Tidak dimulai dengan 62: Invalid

### 3. Pattern Check
- ❌ Semua digit sama (0888888888, 1111111111): Invalid
- ✅ Digit bervariasi: Valid

## Test Cases

### Valid Numbers ✅
```
08123456789         → Format: 08xx (10 digit)
6281234567890       → Format: 62xxx (11 digit)
+6281234567890      → Format: +62xxx (12 digit dengan +)
+62-812-34567890    → Format: +62-xxx (dengan separator)
08812345678901      → Format: 08xxx (14 digit)
```

### Invalid Numbers ❌

#### Too Short
```
12345               → "Nomor telepon terlalu pendek (minimal 10 digit)"
08123               → "Nomor telepon terlalu pendek (minimal 10 digit)"
```

#### Too Long
```
081234567890123456  → "Nomor telepon terlalu panjang (maksimal 15 digit)"
621234567890123456  → "Nomor telepon terlalu panjang (maksimal 15 digit)"
```

#### Invalid Format (10 digit but not start with 8)
```
01234567890         → "Format nomor tidak valid. Gunakan format: +628xx atau 08xx"
02234567890         → "Format nomor tidak valid. Gunakan format: +628xx atau 08xx"
05123456789         → "Format nomor tidak valid. Gunakan format: +628xx atau 08xx"
```

#### Invalid Format (11 digit but not start with 62)
```
01812345678         → "Format nomor tidak valid. Gunakan format: +628xx atau 08xx"
81234567890         → "Format nomor tidak valid. Gunakan format: +628xx atau 08xx"
```

#### All Same Digits
```
08888888888         → "Format nomor tidak valid. Gunakan format: +628xx atau 08xx"
06666666666         → "Format nomor tidak valid. Gunakan format: +628xx atau 08xx"
11111111111         → "Format nomor tidak valid. Gunakan format: +628xx atau 08xx"
```

#### Not Numbers
```
abc123              → "Format nomor tidak valid. Gunakan format: +628xx atau 08xx"
08abc123456         → "Format nomor tidak valid. Gunakan format: +628xx atau 08xx"
```

## Flow Diagram

```
User Input Nomor
    ↓
Step 1: Length Check
    ├─ < 10 digit → ❌ "Terlalu pendek"
    ├─ > 15 digit → ❌ "Terlalu panjang"
    └─ 10-15 digit → Continue
    ↓
Step 2: Format Validation (Indonesia)
    ├─ 10 digit: Must start with 8 → Valid/Invalid
    ├─ 11+ digit: Must start with 62 → Valid/Invalid
    └─ All same digit → ❌ Invalid
    ↓
Step 3: Session Check
    ├─ Session connected → Check with onWhatsApp API
    │   ├─ Active → ✅ "Nomor WhatsApp aktif ✓"
    │   └─ Not found → ❌ "Nomor tidak terdaftar di WhatsApp"
    └─ No session → ✅ "Format valid. Hubungkan akun WhatsApp..."
```

## Implementation in Code

### isValidPhoneFormat() method:
```typescript
private isValidPhoneFormat(phoneNumber: string): boolean {
  const digits = phoneNumber.replace(/\D/g, '')
  
  // Check length
  if (digits.length < 10 || digits.length > 15) return false
  
  // Check format for Indonesian numbers
  if (digits.length === 10 && !digits.startsWith('8')) return false
  if (digits.length === 11 && !digits.startsWith('62')) return false
  if (digits.length > 12 && !digits.startsWith('62')) return false
  
  // Check for all same digit pattern
  if (/^(\d)\1{7,}$/.test(digits)) return false
  
  return true
}
```

### checkPhoneNumberValid() flow:
```typescript
// 1. Basic length check
if (digits.length < 10) → Return error

// 2. Format validation
if (!this.isValidPhoneFormat(phoneNumber)) → Return error

// 3. Session check & WhatsApp verification
if (session connected) → Use onWhatsApp API
else → Return "format valid, hubungkan..."
```

## User Experience

### Before Fix:
- Input: "12345" → ✅ Valid (WRONG!)
- Input: "abc123" → ✅ Valid (WRONG!)
- Input: "08888888888" → ✅ Valid (WRONG!)

### After Fix:
- Input: "12345" → ❌ "Terlalu pendek"
- Input: "abc123" → ❌ "Format tidak valid"
- Input: "08888888888" → ❌ "Format tidak valid"
- Input: "08123456789" → ✅ "Format valid. Hubungkan WhatsApp..."
- Input: "08123456789" (session connected) → ✅ "Nomor WhatsApp aktif ✓" or ❌ "Tidak terdaftar"
