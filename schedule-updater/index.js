#!/usr/bin/env node

/**
 * Cron Job Service for Schedule Updates
 * Runs on Fly.io, Azure Container Instances, or locally
 */

const cron = require('node-cron');
const ScheduleUpdater = require('./update-schedule');

// Get cron schedule from environment or default to hourly
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 * * * *'; // Every hour
const UPDATE_ON_START = process.env.UPDATE_ON_START !== 'false';

console.log('🚀 Next Meeting Schedule Updater Service');
console.log(`⏰ Cron Schedule: ${CRON_SCHEDULE}`);
console.log(`📍 Platform: ${process.env.DEPLOYMENT_PLATFORM || 'local'}`);

const updater = new ScheduleUpdater();

// Schedule the updates
const task = cron.schedule(CRON_SCHEDULE, async () => {
  console.log(`\n⏰ [${new Date().toISOString()}] Running scheduled update...`);
  try {
    await updater.update();
  } catch (error) {
    console.error('Failed to update schedule:', error);
  }
});

// Run immediately on startup if configured
if (UPDATE_ON_START) {
  console.log('\n🔄 Running initial update...');
  updater.update()
    .then(() => console.log('✅ Initial update complete'))
    .catch(err => console.error('❌ Initial update failed:', err));
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 SIGTERM received, shutting down gracefully...');
  task.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down gracefully...');
  task.stop();
  process.exit(0);
});

console.log('✅ Service is running. Press Ctrl+C to stop.\n');