import Student from './Student.js';

export const startCleanupTask = () => {
  // Run once immediately on startup, then every 24 hours
  const cleanup = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const result = await Student.deleteMany({
        status: 'registration',
        createdAt: { $lt: thirtyDaysAgo }
      });

      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} abandoned applicant drafts.`);
      }
    } catch (err) {
      console.error('Error running abandoned application cleanup task:', err.message);
    }
  };

  // Run cleanup now
  cleanup();

  // Schedule to run every 24 hours
  setInterval(cleanup, 1000 * 60 * 60 * 24);
};
