/**
 * Validators for meeting data
 */

/**
 * Validate a single meeting object
 */
function validateMeeting(meeting) {
  const errors = [];
  
  // Required fields
  if (!meeting.name || meeting.name.trim() === '') {
    errors.push('Meeting name is required');
  }
  
  if (!meeting.day) {
    errors.push('Day is required');
  } else if (!['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(meeting.day)) {
    errors.push(`Invalid day: ${meeting.day}`);
  }
  
  if (!meeting.time) {
    errors.push('Time is required');
  } else if (!/^\d{2}:\d{2}$/.test(meeting.time)) {
    errors.push(`Invalid time format: ${meeting.time}. Expected HH:MM`);
  }
  
  // Optional fields validation
  if (meeting.duration && (isNaN(meeting.duration) || meeting.duration < 0)) {
    errors.push(`Invalid duration: ${meeting.duration}`);
  }
  
  if (meeting.url && !isValidUrl(meeting.url)) {
    errors.push(`Invalid URL: ${meeting.url}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate URL format
 */
function isValidUrl(string) {
  if (string === '#') return true; // Allow placeholder
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Validate Google Sheets configuration
 */
function validateGoogleSheetsConfig(config) {
  const errors = [];
  
  if (!config.googleSheetId) {
    errors.push('Google Sheet ID is required');
  } else if (!/^[a-zA-Z0-9-_]+$/.test(config.googleSheetId)) {
    errors.push('Invalid Google Sheet ID format');
  }
  
  if (!config.googleApiKey) {
    errors.push('Google API Key is required');
  } else if (config.googleApiKey.length < 20) {
    errors.push('Google API Key appears to be invalid');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize meeting data to prevent XSS
 */
function sanitizeMeeting(meeting) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(meeting)) {
    if (typeof value === 'string') {
      // Remove any script tags and dangerous HTML
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeMeeting({ temp: item }).temp : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

module.exports = {
  validateMeeting,
  validateGoogleSheetsConfig,
  sanitizeMeeting,
  isValidUrl
};