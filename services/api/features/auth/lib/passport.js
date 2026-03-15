const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');
const { issueToken } = require('./jwt');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';

function passportConfig() {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || `${API_BASE}/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await User.findOne({
              provider: 'google',
              providerId: profile.id,
            });
            if (!user) {
              user = await User.create({
                provider: 'google',
                providerId: profile.id,
                email: profile.emails?.[0]?.value || null,
                displayName: profile.displayName || profile.name?.givenName || 'User',
                avatar: profile.photos?.[0]?.value || null,
              });
            }
            return done(null, user);
          } catch (err) {
            return done(err, null);
          }
        }
      )
    );
  }

  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: process.env.FACEBOOK_CALLBACK_URL || `${API_BASE}/auth/facebook/callback`,
          profileFields: ['id', 'displayName', 'emails', 'photos'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await User.findOne({
              provider: 'facebook',
              providerId: profile.id,
            });
            if (!user) {
              user = await User.create({
                provider: 'facebook',
                providerId: profile.id,
                email: profile.emails?.[0]?.value || null,
                displayName: profile.displayName || 'User',
                avatar: profile.photos?.[0]?.value || null,
              });
            }
            return done(null, user);
          } catch (err) {
            return done(err, null);
          }
        }
      )
    );
  }

  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
}

function redirectWithToken(res, user) {
  const token = issueToken(user);
  const redirect = `${CLIENT_URL}/auth/callback?token=${encodeURIComponent(token)}`;
  res.redirect(redirect);
}

module.exports = { passportConfig, redirectWithToken };
