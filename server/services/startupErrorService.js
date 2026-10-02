const redactMongoCredentials = (message) => String(message || 'Unknown startup error')
  .replace(/(mongodb(?:\+srv)?:\/\/)[^@\s]+@/gi, '$1[redacted]@');

export function startupErrorMessages(error, port) {
  if (error?.code === 'EADDRINUSE') {
    return [
      `FATAL ERROR: Port ${port} is already in use.`,
      'Stop the process using that port, or change PORT.',
    ];
  }
  if (error?.startupStage === 'database') {
    return [
      'Server startup failed: Database configuration is invalid or database is unavailable.',
      'Verify MONGO_URI and MongoDB availability.',
    ];
  }
  return [
    `Server startup failed: ${redactMongoCredentials(error?.message)}`,
    'Review service configuration and startup logs.',
  ];
}
