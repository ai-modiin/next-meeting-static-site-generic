// Gulpfile for building template HTML (without schedule data)
// This template is used by the schedule updater service

require('dotenv').config();

const fs = require("fs");
const path = require("path");
const { src, dest, series, parallel } = require('gulp');
const sass = require('gulp-dart-sass');
const postcss = require('gulp-postcss');
const replace = require('gulp-replace');
const clean = require('gulp-clean');
const concat = require('gulp-concat');
const uglifycss = require('gulp-uglifycss');
const terser = require('gulp-terser');
const rename = require("gulp-rename");

// Load configuration
const CONFIG_FILE = process.env.BUILD_CONFIG_FILE || 'demo.js';
const CONFIG_PATH = './configs/' + CONFIG_FILE;
const TEXT_REPLACEMENT_CONFIG = require(CONFIG_PATH).default;

// Clean dist directory
function cleanDist() {
  return src('dist', {read: false, allowEmpty: true})
    .pipe(clean());
}

// Process styles
function styles() {
  return src('src/styles.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss([require('tailwindcss')]))
    .pipe(uglifycss())
    .pipe(rename('styles.css'))
    .pipe(dest('dist'));
}

// Process JavaScript
function scripts() {
  const jsFiles = [
    'node_modules/alpinejs/dist/cdn.min.js',
    'node_modules/clipboard/dist/clipboard.min.js',
    'src/javascript/*.js'
  ];
  
  return src(jsFiles)
    .pipe(concat('scripts.js'))
    .pipe(terser())
    .pipe(dest('dist'));
}

// Process HTML as template (schedule will be injected later)
function htmlTemplate() {
  let stream = src('src/index.html');
  
  // Replace all configuration variables
  Object.entries(TEXT_REPLACEMENT_CONFIG).forEach(([key, value]) => {
    stream = stream.pipe(replace(key, value));
  });
  
  // Add script/style references but leave injection points
  stream = stream
    .pipe(replace('<!-- JS_INLINE -->', '<link rel="stylesheet" href="styles.css"><script src="scripts.js" defer></script>'))
    .pipe(replace('<!-- TAILWIND_DEV -->', ''))
    // Keep the injection points for the updater service
    .pipe(rename('template.html'))
    .pipe(dest('dist'));
    
  return stream;
}

// Also create a version with demo data for immediate use
function htmlWithDemoData() {
  const demoSchedule = generateDemoSchedule();
  const scheduleScript = `
    const JSON_SCHEDULE = ${JSON.stringify(demoSchedule)};
    const BUILD_INFO = {
      version: '${TEXT_REPLACEMENT_CONFIG.$DEPLOY_ID}',
      built: '${new Date().toISOString()}'
    };
  `;
  
  let stream = src('src/index.html');
  
  // Replace all configuration variables
  Object.entries(TEXT_REPLACEMENT_CONFIG).forEach(([key, value]) => {
    stream = stream.pipe(replace(key, value));
  });
  
  // Inject demo schedule and scripts
  stream = stream
    .pipe(replace('/* INJECT_SCHEDULE_JSON */', scheduleScript))
    .pipe(replace('/* INJECT_BUILD_INFO */', ''))
    .pipe(replace('<!-- JS_INLINE -->', '<link rel="stylesheet" href="styles.css"><script src="scripts.js" defer></script>'))
    .pipe(replace('<!-- TAILWIND_DEV -->', ''))
    .pipe(rename('index.html'))
    .pipe(dest('dist'));
    
  return stream;
}

// Generate demo schedule data
function generateDemoSchedule() {
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

// Copy assets
function copyAssets() {
  return src('assets/**/*')
    .pipe(dest('dist/assets'));
}

// Build task - creates both template and demo version
exports.build = series(
  cleanDist,
  parallel(styles, scripts, htmlTemplate, htmlWithDemoData, copyAssets)
);

// Build template only
exports.template = series(
  cleanDist,
  parallel(styles, scripts, htmlTemplate, copyAssets)
);

// Default task
exports.default = exports.build;