import { ulid } from 'ulid'

export const generateULID = () => ulid()

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