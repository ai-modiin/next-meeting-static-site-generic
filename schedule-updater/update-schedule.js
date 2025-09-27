#!/usr/bin/env node

/**
 * Universal Schedule Updater for Next Meeting Site
 * 
 * This script fetches meeting data from Google Sheets (or other sources)
 * and updates the static HTML with fresh data.
 * 
 * Supports multiple deployment platforms:
 * - Fly.io (via volumes)
 * - Azure Static Web Apps (via blob storage)
 * - AWS S3 + CloudFront
 * - Local filesystem
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { google } = require('googleapis');
const { validateMeeting, validateGoogleSheetsConfig, sanitizeMeeting } = require('./validators');

// Platform-specific imports
let S3Client, PutObjectCommand, GetObjectCommand, CloudFrontClient, CreateInvalidationCommand;
let BlobServiceClient;

// Conditionally load AWS SDK if using AWS
if (process.env.DEPLOYMENT_PLATFORM === 'aws') {
  const awsS3 = require('@aws-sdk/client-s3');
  const awsCF = require('@aws-sdk/client-cloudfront');
  S3Client = awsS3.S3Client;
  PutObjectCommand = awsS3.PutObjectCommand;
  GetObjectCommand = awsS3.GetObjectCommand;
  CloudFrontClient = awsCF.CloudFrontClient;
  CreateInvalidationCommand = awsCF.CreateInvalidationCommand;
}

// Conditionally load Azure SDK if using Azure
if (process.env.DEPLOYMENT_PLATFORM === 'azure') {
  const azureStorage = require('@azure/storage-blob');
  BlobServiceClient = azureStorage.BlobServiceClient;
}

class ScheduleUpdater {
  constructor(config) {
    this.config = {
      platform: process.env.DEPLOYMENT_PLATFORM || 'local',
      googleSheetId: process.env.GOOGLE_SHEET_ID,
      googleApiKey: process.env.GOOGLE_API_KEY,
      templatePath: process.env.TEMPLATE_PATH || './dist/template.html',
      outputPath: process.env.OUTPUT_PATH || './dist/index.html',
      deployId: process.env.DEPLOY_ID || 'default',
      ...config
    };

    // AWS specific config
    if (this.config.platform === 'aws') {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: process.env.AWS_PROFILE ? undefined : {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      
      this.cloudFrontClient = new CloudFrontClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: process.env.AWS_PROFILE ? undefined : {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
    }

    // Azure specific config
    if (this.config.platform === 'azure') {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING
      );
      this.containerClient = this.blobServiceClient.getContainerClient(
        process.env.AZURE_CONTAINER_NAME || '$web'
      );
    }
  }

  /**
   * Fetch meeting data from Google Sheets
   */
  async fetchMeetingData() {
    console.log('📊 Fetching meeting data from Google Sheets...');
    
    if (this.config.googleSheetId && this.config.googleApiKey) {
      try {
        const sheets = google.sheets({ version: 'v4', auth: this.config.googleApiKey });
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.config.googleSheetId,
          range: 'A:Z', // Adjust range as needed
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
          console.log('No data found in sheet.');
          return this.generateDemoData();
        }

        // Parse the sheet data into meeting format
        const headers = rows[0];
        const meetings = rows.slice(1).map(row => {
          const meeting = {};
          headers.forEach((header, index) => {
            meeting[header.toLowerCase().replace(/\s+/g, '_')] = row[index] || '';
          });
          return this.transformMeetingData(meeting);
        });

        return {
          version: '1.0.0',
          generated: new Date().toISOString(),
          source: 'google_sheets',
          meetings: meetings.filter(m => m.valid)
        };
      } catch (error) {
        console.error('Error fetching from Google Sheets:', error);
        return this.generateDemoData();
      }
    } else {
      console.log('📝 Using demo data (no Google Sheets configured)');
      return this.generateDemoData();
    }
  }

  /**
   * Transform raw sheet data to meeting format
   */
  transformMeetingData(rawMeeting) {
    // Customize this based on your sheet structure
    const meeting = {
      id: rawMeeting.id || `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: rawMeeting.meeting_name || rawMeeting.name || 'Unnamed Meeting',
      day: rawMeeting.day || 'Monday',
      time: rawMeeting.time || '12:00',
      timezone: rawMeeting.timezone || 'America/New_York',
      duration: parseInt(rawMeeting.duration) || 60,
      url: rawMeeting.zoom_url || rawMeeting.url || '#',
      passcode: rawMeeting.passcode || '',
      description: rawMeeting.description || '',
      tags: (rawMeeting.tags || '').split(',').map(t => t.trim()).filter(Boolean)
    };
    
    // Validate and sanitize the meeting data
    const validation = validateMeeting(meeting);
    if (!validation.valid) {
      console.warn(`Meeting validation failed: ${validation.errors.join(', ')}`);
      meeting.valid = false;
    } else {
      meeting.valid = true;
    }
    
    return sanitizeMeeting(meeting);
  }

  /**
   * Generate demo meeting data
   */
  generateDemoData() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const times = ['07:00', '09:00', '12:00', '15:00', '18:00', '20:00'];
    const topics = ['Beginners', 'Discussion', 'Step Study', 'Big Book', 'Speaker', 'Open Discussion'];
    const meetings = [];
    
    days.forEach((day, dayIndex) => {
      times.forEach((time, timeIndex) => {
        if (Math.random() > 0.3) {
          meetings.push({
            id: `meeting-${dayIndex}-${timeIndex}`,
            name: `${topics[timeIndex % topics.length]} Meeting`,
            day: day,
            time: time,
            timezone: 'America/New_York',
            duration: 60,
            url: 'https://zoom.us/j/123456789',
            passcode: '123456',
            description: `Join us for our ${topics[timeIndex % topics.length]} meeting`,
            tags: [topics[timeIndex % topics.length].toLowerCase(), 'online']
          });
        }
      });
    });
    
    return {
      version: '1.0.0',
      generated: new Date().toISOString(),
      source: 'demo',
      meetings: meetings
    };
  }

  /**
   * Read HTML template
   */
  async readTemplate() {
    switch (this.config.platform) {
      case 'aws':
        return await this.readTemplateFromS3();
      case 'azure':
        return await this.readTemplateFromAzure();
      case 'fly':
      case 'local':
      default:
        return await fs.readFile(this.config.templatePath, 'utf-8');
    }
  }

  /**
   * Read template from S3
   */
  async readTemplateFromS3() {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: `${this.config.deployId}.template.html`
    });
    
    const response = await this.s3Client.send(command);
    return await streamToString(response.Body);
  }

  /**
   * Read template from Azure Blob Storage
   */
  async readTemplateFromAzure() {
    const blobClient = this.containerClient.getBlobClient(`${this.config.deployId}.template.html`);
    const downloadResponse = await blobClient.download(0);
    return await streamToString(downloadResponse.readableStreamBody);
  }

  /**
   * Inject schedule into HTML template
   */
  injectSchedule(template, scheduleData) {
    // Sanitize the data to prevent XSS
    const sanitizedData = JSON.parse(JSON.stringify(scheduleData));
    
    // Escape any potential script tags in the JSON
    const jsonString = JSON.stringify(sanitizedData)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
    
    const scheduleScript = `
    const JSON_SCHEDULE = ${jsonString};
    const BUILD_INFO = {
      version: '${this.config.deployId.replace(/['"]/g, '')}',
      built: '${new Date().toISOString()}',
      lastUpdated: '${new Date().toISOString()}'
    };
    `;

    // Replace the injection point
    let html = template.replace('/* INJECT_SCHEDULE_JSON */', scheduleScript);
    
    // Also update the build info
    html = html.replace('/* INJECT_BUILD_INFO */', '');
    
    return html;
  }

  /**
   * Write updated HTML
   */
  async writeOutput(html) {
    console.log(`📝 Writing updated HTML to ${this.config.platform}...`);
    
    switch (this.config.platform) {
      case 'aws':
        return await this.writeToS3(html);
      case 'azure':
        return await this.writeToAzure(html);
      case 'fly':
        // On Fly.io, write to persistent volume
        const flyPath = '/data/index.html';
        await fs.writeFile(flyPath, html);
        console.log(`✅ Updated ${flyPath}`);
        break;
      case 'local':
      default:
        await fs.writeFile(this.config.outputPath, html);
        console.log(`✅ Updated ${this.config.outputPath}`);
    }
  }

  /**
   * Write to S3 and invalidate CloudFront
   */
  async writeToS3(html) {
    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: 'index.html',
      Body: html,
      ContentType: 'text/html',
      CacheControl: 'max-age=300' // 5 minutes cache
    });
    
    await this.s3Client.send(putCommand);
    console.log('✅ Uploaded to S3');

    // Invalidate CloudFront cache
    if (process.env.CLOUDFRONT_DISTRIBUTION_ID) {
      const invalidationCommand = new CreateInvalidationCommand({
        DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
        InvalidationBatch: {
          CallerReference: Date.now().toString(),
          Paths: {
            Quantity: 1,
            Items: ['/index.html']
          }
        }
      });
      
      await this.cloudFrontClient.send(invalidationCommand);
      console.log('✅ CloudFront cache invalidated');
    }
  }

  /**
   * Write to Azure Blob Storage
   */
  async writeToAzure(html) {
    const blobClient = this.containerClient.getBlockBlobClient('index.html');
    await blobClient.upload(html, html.length, {
      blobHTTPHeaders: {
        blobContentType: 'text/html',
        blobCacheControl: 'max-age=300'
      }
    });
    console.log('✅ Uploaded to Azure Blob Storage');
  }

  /**
   * Main update process
   */
  async update() {
    try {
      console.log('🔄 Starting schedule update...');
      console.log(`📍 Platform: ${this.config.platform}`);
      
      // Fetch fresh meeting data
      const scheduleData = await this.fetchMeetingData();
      console.log(`📊 Fetched ${scheduleData.meetings.length} meetings`);
      
      // Read template
      const template = await this.readTemplate();
      console.log('📄 Template loaded');
      
      // Inject schedule
      const updatedHtml = this.injectSchedule(template, scheduleData);
      console.log('💉 Schedule injected');
      
      // Write output
      await this.writeOutput(updatedHtml);
      
      console.log('✅ Schedule update complete!');
      return true;
    } catch (error) {
      console.error('❌ Update failed:', error);
      throw error;
    }
  }
}

// Helper function to convert stream to string
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// Run if called directly
if (require.main === module) {
  const updater = new ScheduleUpdater();
  updater.update()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = ScheduleUpdater;