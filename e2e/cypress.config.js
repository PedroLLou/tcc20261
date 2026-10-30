const { defineConfig } = require('cypress');
const { resetDatabase } = require('./support/seed');

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    video: false,
    setupNodeEvents(on) {
      on('task', {
        resetDatabase: () => resetDatabase(),
      });
    },
  },
});
