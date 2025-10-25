/**
 * Test script to verify WhatsApp phone number validation logic
 * Run with: node test-validation.js
 */

// Replicate the validation logic from baileys.service.ts
function isValidPhoneFormat(phoneNumber) {
  const digits = phoneNumber.replace(/\D/g, '')
  
  // Must be 10-15 digits (standard international range)
  if (digits.length < 10 || digits.length > 15) {
    return false
  }

  // Indonesian numbers can be in two formats:
  // 1. Local format with leading 0: starts with 08 (e.g., 08xxx) - 10-14 digits
  // 2. Local format without leading 0: starts with 8 (e.g., 8xxx) - 9-13 digits (but we need 10+ so 10-13)
  // 3. International format: starts with 62 (e.g., 62xxx) - 11-15 digits
  
  const startsWithZeroEight = digits.startsWith('08')
  const startsWithEight = digits.startsWith('8') && !startsWithZeroEight // 8 but not 08
  const startsWith62 = digits.startsWith('62')
  
  if (startsWithZeroEight) {
    // Local format with leading 0: 10-14 digits
    if (digits.length < 10 || digits.length > 14) {
      return false
    }
  } else if (startsWithEight) {
    // Local format without leading 0: 10-13 digits (since we need 10+ total digits and it starts with 8)
    if (digits.length < 10 || digits.length > 13) {
      return false
    }
  } else if (startsWith62) {
    // International format: 11-15 digits
    if (digits.length < 11 || digits.length > 15) {
      return false
    }
  } else {
    // Must start with either 08, 8, or 62
    return false
  }

  // Additional check: no all same digit (e.g., 08888888888, 11111111111)
  // Pattern explanation: (^|\D)(\d)\2{7,}(\D|$) matches 8 or more consecutive same digits
  // But we already removed non-digits, so simpler: check if 8+ same consecutive digits
  if (/(.)\1{7,}/.test(digits)) {
    return false
  }

  return true
}

// Test cases
const testCases = [
  // Valid numbers
  { input: '08123456789', expected: true, category: 'Valid - 11 digit local (08xxx)' },
  { input: '6281234567890', expected: true, category: 'Valid - 13 digit international (62xxx)' },
  { input: '+6281234567890', expected: true, category: 'Valid - with +62 (13 digit)' },
  { input: '+62-812-34567890', expected: true, category: 'Valid - with separators (13 digit)' },
  { input: '08812345678901', expected: true, category: 'Valid - 14 digit local (08xxx)' },
  { input: '081260268381', expected: true, category: 'Valid - 12 digit local (08xxx)' },
  { input: '81234567890', expected: true, category: 'Valid - 11 digit local (8xxx, no 0)' },
  
  // Too short
  { input: '12345', expected: false, category: 'Invalid - too short (5 digit)' },
  { input: '08123', expected: false, category: 'Invalid - too short (5 digit)' },
  
  // Too long
  { input: '081234567890123456', expected: false, category: 'Invalid - too long (17 digit)' },
  { input: '621234567890123456', expected: false, category: 'Invalid - too long (17 digit)' },
  
  // Wrong format for 10 digit
  { input: '01234567890', expected: false, category: 'Invalid - 10 digit starts with 0 not 8' },
  { input: '02234567890', expected: false, category: 'Invalid - 10 digit starts with 0 not 8' },
  { input: '05123456789', expected: false, category: 'Invalid - 10 digit starts with 5' },
  
  // Wrong format for 11 digit
  { input: '01812345678', expected: false, category: 'Invalid - 11 digit starts with 0 not 8' },
  { input: '71234567890', expected: false, category: 'Invalid - 11 digit starts with 7 not 8 or 62' },
  
  // All same digit
  { input: '08888888888', expected: false, category: 'Invalid - all same digit (8)' },
  { input: '06666666666', expected: false, category: 'Invalid - all same digit (6)' },
  { input: '11111111111', expected: false, category: 'Invalid - all same digit (1)' },
  { input: '00000000000', expected: false, category: 'Invalid - all same digit (0)' },
  
  // Invalid characters (should fail after removal)
  { input: 'abc123', expected: false, category: 'Invalid - too short after removing letters' },
  { input: '08abc123456', expected: false, category: 'Invalid - contains letters' },
]

console.log('='.repeat(80))
console.log('WhatsApp Phone Number Validation Test')
console.log('='.repeat(80))
console.log()

let passed = 0
let failed = 0

testCases.forEach((testCase) => {
  const result = isValidPhoneFormat(testCase.input)
  const status = result === testCase.expected ? '✅ PASS' : '❌ FAIL'
  
  if (result === testCase.expected) {
    passed++
  } else {
    failed++
  }
  
  const digits = testCase.input.replace(/\D/g, '')
  const digitsInfo = `(${digits.length} digits: ${digits})`
  
  console.log(`${status} | ${testCase.category}`)
  console.log(`     Input: "${testCase.input}" ${digitsInfo}`)
  console.log(`     Expected: ${testCase.expected} | Got: ${result}`)
  
  if (result !== testCase.expected) {
    console.log(`     ❌ MISMATCH!`)
  }
  console.log()
})

console.log('='.repeat(80))
console.log(`Test Results: ${passed} passed, ${failed} failed out of ${testCases.length}`)
console.log('='.repeat(80))

if (failed === 0) {
  console.log('✅ All tests passed!')
  process.exit(0)
} else {
  console.log('❌ Some tests failed!')
  process.exit(1)
}
