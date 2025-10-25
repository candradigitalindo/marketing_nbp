// Lightweight ULID-like generator to avoid external dependency
const ULID_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const generateULID = () => {
  // Not a strict ULID implementation; good enough for unique IDs in this app
  const now = Date.now()
  let id = now.toString(32).toUpperCase()
  while (id.length < 10) id = '0' + id
  let randomPart = ''
  for (let i = 0; i < 16; i++) {
    randomPart += ULID_CHARS[Math.floor(Math.random() * ULID_CHARS.length)]
  }
  return (id + randomPart).slice(0, 26)
}

export const isValidULID = (id: string): boolean => {
  return /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/.test(id)
}

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Add country code if not present
  if (cleaned.startsWith('8')) {
    return '62' + cleaned
  }
  
  if (cleaned.startsWith('08')) {
    return '62' + cleaned.substring(1)
  }
  
  return cleaned
}

export const validateWhatsAppNumber = (phone: string): boolean => {
  const formatted = formatPhoneNumber(phone)
  return formatted.startsWith('62') && formatted.length >= 11 && formatted.length <= 15
}

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}