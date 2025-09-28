/**
 * Azure Function for Schedule Updates
 * Triggered hourly to update the static site with fresh meeting data
 */

const ScheduleUpdater = require('../schedule-updater/update-schedule');

module.exports = async function (context, myTimer) {
    const timeStamp = new Date().toISOString();
    
    if (myTimer.isPastDue) {
        context.log('Timer trigger is running late!');
    }
    
    context.log('Schedule update function triggered at:', timeStamp);
    
    try {
        const updater = new ScheduleUpdater({
            platform: 'azure'
        });
        
        await updater.update();
        context.log('Schedule update completed successfully');
    } catch (error) {
        context.log.error('Schedule update failed:', error);
        throw error;
    }
};