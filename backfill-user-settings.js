#!/usr/bin/env node
/**
 * One-time user settings backfill for legacy MongoDB documents.
 *
 * Usage:
 *   node backfill-user-settings.js --dry-run
 *   node backfill-user-settings.js --apply
 *
 * Env:
 *   MONGODB_URI (fallback: mongodb://localhost:27017/eshopper)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eshopper';
const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run') || !args.has('--apply');

const DEFAULT_USER_SETTINGS = {
  notifications: {
    orderUpdates: true,
    deliveryUpdates: true,
    promotionalEmails: true,
    priceAlerts: false,
    wishlistAlerts: true,
    smsAlerts: false,
  },
  privacy: {
    profileVisibility: 'Private',
    personalizedRecommendations: true,
  },
  security: {
    twoFactorEnabled: false,
    loginAlerts: true,
  },
  communication: {
    newsletter: true,
    whatsappUpdates: false,
    pushNotifications: true,
  },
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(baseValue, overrideValue) {
  if (!isPlainObject(baseValue) || !isPlainObject(overrideValue)) {
    return overrideValue === undefined ? baseValue : overrideValue;
  }

  const merged = { ...baseValue };
  Object.keys(overrideValue).forEach((key) => {
    merged[key] = deepMerge(baseValue[key], overrideValue[key]);
  });
  return merged;
}

function normalizeSettings(settings) {
  return deepMerge(DEFAULT_USER_SETTINGS, isPlainObject(settings) ? settings : {});
}

function hasSettingsDiff(existingSettings, nextSettings) {
  return JSON.stringify(normalizeSettings(existingSettings)) !== JSON.stringify(normalizeSettings(nextSettings));
}

async function run() {
  try {
    await mongoose.connect(MONGO_URI);

    console.log('\n=== User Settings Backfill ===');
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);
    console.log(`Database: ${MONGO_URI}\n`);

    const users = await User.find({}).lean();
    let scanned = 0;
    let changedDocs = 0;
    let newlyCreatedSettings = 0;
    let mergedFields = 0;

    for (const user of users) {
      scanned += 1;

      const currentSettings = isPlainObject(user.settings) ? user.settings : {};
      const nextSettings = normalizeSettings(currentSettings);
      const changed = hasSettingsDiff(currentSettings, nextSettings);

      if (!changed) continue;

      changedDocs += 1;
      if (!user.settings) newlyCreatedSettings += 1;

      const countMissingKeys = (baseValue, overrideValue) => {
        if (!isPlainObject(baseValue)) return 0;

        return Object.keys(baseValue).reduce((total, key) => {
          if (!Object.prototype.hasOwnProperty.call(overrideValue || {}, key)) {
            return total + 1 + countMissingKeys(baseValue[key], {});
          }
          return total + countMissingKeys(baseValue[key], overrideValue[key]);
        }, 0);
      };

      mergedFields += countMissingKeys(DEFAULT_USER_SETTINGS, currentSettings);

      if (!isDryRun) {
        await User.updateOne({ _id: user._id }, { $set: { settings: nextSettings } });
      }
    }

    console.log(`Users scanned        : ${scanned}`);
    console.log(`Users updated        : ${changedDocs}`);
    console.log(`New settings created : ${newlyCreatedSettings}`);
    console.log(`Missing fields added  : ${mergedFields}`);
    console.log('');

    if (isDryRun) {
      console.log('Dry run complete. Use --apply to persist changes.\n');
    } else {
      console.log('Backfill applied successfully.\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error.message);
    try {
      await mongoose.disconnect();
    } catch (_) {
      // no-op
    }
    process.exit(1);
  }
}

run();