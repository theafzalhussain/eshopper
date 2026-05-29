const bcrypt = require('bcryptjs');
const { admin, firebaseAdminReady } = require('../config/firebase');
const Sentry = require('@sentry/node');
const jwt = require('jsonwebtoken');
const { sendTransactionalEmail } = require('../src/utils/email');
const { sendEmail: sendTemplatedEmail } = require('../emailService');
const { logActivity } = require('../utils/activityLogger');
const sendEmail = sendTransactionalEmail;
const mongoose = require('mongoose');
const OTPRecord = require('../models/OTPRecord');
const User = require('../models/User');

const buildAdminJwt = (user = {}) => {
    const jwtSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
    if (!jwtSecret) return '';
    return jwt.sign(
        {
            sub: String(user._id || user.id || ''),
            email: user.email || '',
            name: user.name || '',
            role: user.role || 'Admin',
            isAdmin: true
        },
        jwtSecret,
        { expiresIn: process.env.ADMIN_JWT_EXPIRES || '12h' }
    );
};

const maskEmail = (email = '') => {
    const clean = String(email || '').trim();
    const parts = clean.split('@');
    if (parts.length !== 2) return clean;
    const [local, domain] = parts;
    if (local.length <= 2) return `${local.charAt(0) || '*'}***@${domain}`;
    return `${local.slice(0, 2)}***@${domain}`;
};

const buildOtpHtml = ({ otp, userName = 'Customer', membershipLabel = '', logoUrl = '' } = {}) => `
<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>eShopper Security Code</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;600&display=swap');
        a:hover { opacity: 0.85; }
        @media only screen and (max-width:620px) {
            .mobile-stack { display: block !important; width: 100% !important; padding: 0 !important; margin-bottom: 12px !important; box-sizing: border-box !important; }
            .mobile-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; margin: 10px 0 !important; margin-left: 0 !important; }
            .mobile-hero-title { font-size: 28px !important; line-height: 1.3 !important; }
            .mobile-section-title { font-size: 22px !important; }
            .mobile-otp { font-size: 36px !important; padding: 14px 16px !important; letter-spacing: 6px !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background:#050608;font-family:'Inter', 'Trebuchet MS', Arial, sans-serif;color:#f5f5f5;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your eShopper verification code is ${otp}. This code expires in 10 minutes.</div>
  
    <table role="presentation" width="100%" style="width:100%;background:#050608;padding:16px 6px;"><tr><td>
        <table role="presentation" align="center" style="width:100%;max-width:640px;margin:0 auto;background:#131416;border:1px solid #23262b;border-radius:18px;overflow:hidden;">
            <tr><td style="padding:16px 20px;background:linear-gradient(120deg,#0d0e10,#1a1a1c,#111113);">
                <table role="presentation" style="display:inline-table;vertical-align:middle;border-collapse:collapse;">
                    <tr>
                        <td style="padding-right:8px;vertical-align:top;">
                            <span style="background:linear-gradient(145deg,#0f172a 0%,#1e293b 55%,#0f172a 100%);color:#fff;width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:800;border-radius:4px;border-right:3px solid #d4af37;box-shadow:0 6px 16px rgba(15,23,42,0.22);line-height:34px;">E</span>
                        </td>
                        <td style="vertical-align:top;">
                            <span style="display:block;font-weight:800;letter-spacing:2.4px;font-size:18px;color:#f5f7fb;line-height:1;">SHOPPER</span>
                            <span style="display:block;font-size:7px;letter-spacing:1.8px;color:#d4af37;font-weight:700;margin-top:2px;line-height:1.1;">BOUTIQUE LUXE</span>
                        </td>
                        <td style="text-align:right;vertical-align:middle;padding-left:10px;">
                            ${logoUrl ? `<img src="${logoUrl}" alt="ESHOPPER" style="height:36px;border-radius:6px;"/>` : ''}
                        </td>
                    </tr>
                </table>
                <span style="float:right;display:inline-block;font-size:12px;font-weight:700;color:#000000;border:1px solid #d4af37;background:linear-gradient(135deg, #d4af37 0%, #aa8222 100%);padding:7px 12px;border-radius:999px;letter-spacing:0.5px;">SECURITY</span>
            </td></tr>

            <tr>
                <td style="background:linear-gradient(120deg,#111111,#1a1813);border-bottom:2px solid #d4af37;text-align:center;padding:40px 15px;">
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:42px;color:#d4af37;line-height:1;margin-bottom:16px;">&#128274;</div>
                    <div class="mobile-hero-title" style="font-family:'Playfair Display', Georgia, serif;font-size:34px;font-weight:700;line-height:1.2;letter-spacing:1.5px;text-transform:uppercase;color:#ffffff;">OTP VERIFICATION</div>
                    <div style="color:#c5a059;font-size:13px;letter-spacing:1px;text-transform:uppercase;margin-top:14px;">Official Security Message</div>
                </td>
            </tr>

            <tr>
                <td style="padding:35px 20px;border-top:1px solid #272a30;">
                    <h2 class="mobile-section-title" style="font-family:'Playfair Display', Georgia, serif; font-size:26px; color:#d4af37; font-weight:400;text-align:center;margin:0 0 14px;">Hi ${String(userName || 'Customer')},</h2>
                    <p style="color:#d6dae2;font-size:16px;line-height:1.62;margin:0 0 24px;text-align:center;">Use this one-time code to complete your secure verification.</p>
          
                    <div style="margin-top:0;border:1px solid #d4af37;border-radius:12px;padding:30px 20px;background:#1a1813;text-align:center;box-shadow: 0 4px 20px rgba(212,175,55,0.15);">
                        <h4 style="margin:0 0 20px;color:#d4af37;font-size:15px;font-family:'Inter', sans-serif;letter-spacing:1px;text-transform:uppercase;">Your Verification Code</h4>
                        <div class="mobile-otp" style="display:inline-block;background:#0a0a0c;color:#d4af37;border:1px dashed #d4af37;padding:18px 40px;font-size:46px;font-weight:800;letter-spacing:10px;border-radius:8px;font-family:'Courier New', Courier, monospace;box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);">${otp}</div>
                        <div style="margin-top:20px;color:#c5a059;font-size:13px;font-style:italic;">Expires in 10 minutes. Never share this code with anyone.</div>
                    ${membershipLabel ? `<div style="text-align:center;margin-top:16px;"><span style="display:inline-block;padding:8px 14px;background:linear-gradient(90deg,#d4af37,#b8852d);color:#071018;border-radius:999px;font-weight:700;font-size:13px;">${membershipLabel}</span></div>` : ''}
                    </div>

                    <div style="margin-top:28px;border:1px solid #2a2a2a;border-radius:12px;padding:24px;background:#0d0e10;text-align:center;">
                        <div style="color:#e8eef9;font-size:14px;line-height:1.6;margin-bottom:12px;">If you did not request this, please ignore this email and secure your account immediately.</div>
                        <div style="color:#8a93a5;font-size:13px;line-height:1.6;margin-bottom:24px;font-style:italic;">eShopper will never ask for your OTP by phone, chat, or email.</div>
            
                        <div>
                            <a class="mobile-btn" href="${process.env.FRONTEND_URL || 'https://eshopperr.me'}" style="display:inline-block;background:linear-gradient(135deg, #d4af37 0%, #aa8222 100%);color:#000;text-decoration:none;padding:16px 28px;border-radius:6px;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-size:14px;">Secure Portal</a>
                            <a class="mobile-btn" href="mailto:${process.env.SUPPORT_EMAIL || 'support@eshopperr.me'}" style="display:inline-block;background:#0a0a0c;color:#d4af37;border:1px solid #d4af37;text-decoration:none;padding:16px 28px;border-radius:6px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-left:10px;font-size:14px;">Contact Support</a>
                        </div>
                    </div>
                </td>
            </tr>

            <tr><td style="padding:24px 14px;border-top:1px solid #1a1a1a;text-align:center;color:#9ea4b2;font-size:12px;line-height:1.7;background:#0b0c0e;">
                <div style="font-family:'Playfair Display', Georgia, serif;color:#d4af37;font-size:18px;font-style:italic;margin-bottom:12px;">eShopper Security Team</div>
                <div style="margin-top:14px;">&copy; ${new Date().getFullYear()} E-Shopper Boutique Luxe. All rights reserved.</div>
                <div>${process.env.COMPANY_ADDRESS || ''}</div>
            </td></tr>
        </table>
    </td></tr></table>
</body>
</html>`;

const mapTierToLabel = (tier) => {
    const t = String(tier || '').toLowerCase();
    if (t === 'elite') return 'Luxury';
    if (t === 'gold') return 'Professional';
    return 'Premium'; // silver or default
};

const sendOtpMail = async ({ toEmail, toName, otp, membershipType, logoUrl }) => {
    const hasBrevoKey = Boolean((process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || '').trim());
    const membershipLabel = mapTierToLabel(membershipType);
    const resolvedLogo = logoUrl || process.env.LOGO_URL || '';

    if (hasBrevoKey) {
        return sendEmail({
            toEmail,
            toName,
            subject: `eShopper Security Code: ${otp}`,
            htmlContent: buildOtpHtml({ otp, userName: toName || 'Customer', membershipLabel, logoUrl: resolvedLogo })
        });
    }

    return sendTemplatedEmail({
        to: toEmail,
        subject: `eShopper Security Code: ${otp}`,
        template: 'otp-email.hbs',
        context: {
            otp,
            userName: toName || 'Customer',
            membershipLabel,
            logoUrl: resolvedLogo,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@eshopperr.me',
            supportPhone: process.env.SUPPORT_PHONE || '+91 8447859784',
            websiteUrl: process.env.FRONTEND_URL || 'https://eshopperr.me',
            companyAddress: process.env.COMPANY_ADDRESS || 'Eshopper Boutique Luxe, New Delhi, India',
            year: new Date().getFullYear()
        }
    });
};

const isBcryptHash = (value = '') => {
    const text = String(value || '');
    return text.startsWith('$2a$') || text.startsWith('$2b$') || text.startsWith('$2y$');
};

const passwordMatches = async (candidate, storedPassword) => {
    const normalizedCandidate = String(candidate || '').trim();
    const normalizedStored = String(storedPassword || '');
    if (!normalizedCandidate || !normalizedStored) return false;

    if (isBcryptHash(normalizedStored)) {
        return bcrypt.compare(normalizedCandidate, normalizedStored);
    }

    return normalizedStored === normalizedCandidate || normalizedStored.trim() === normalizedCandidate;
};

const resolveOtpVerification = async (user, otp) => {
    const now = Date.now();
    const normalizedUserEmail = String(user.email || '').toLowerCase().trim();
    const inputOtp = String(otp || '').replace(/\D/g, '').trim();
    const storedOtp = String(user.otp || '').replace(/\D/g, '').trim();
    const hasUserOtp = Boolean(storedOtp && user.otpExpires);
    const isUserOtpExpired = hasUserOtp ? now > new Date(user.otpExpires).getTime() : false;

    const otpRecord = normalizedUserEmail
        ? await OTPRecord.findOne({ email: normalizedUserEmail }).sort({ createdAt: -1 })
        : null;
    const recordOtp = String(otpRecord?.otp || '').replace(/\D/g, '').trim();
    const hasRecordOtp = Boolean(recordOtp);

    if (!inputOtp) {
        return { ok: false, reason: 'invalid' };
    }

    const matchesUserOtp = hasUserOtp && !isUserOtpExpired && storedOtp === inputOtp;
    const matchesRecordOtp = hasRecordOtp && recordOtp === inputOtp;

    if (matchesUserOtp || matchesRecordOtp) {
        return { ok: true, reason: 'verified' };
    }

    if (!hasUserOtp && !hasRecordOtp) {
        return { ok: false, reason: 'missing' };
    }

    if (isUserOtpExpired && !hasRecordOtp) {
        return { ok: false, reason: 'expired' };
    }

    return { ok: false, reason: 'invalid' };
};

// FIREBASE AUTH SYNC
exports.authSync = async (req, res) => {
    // ...existing code from /api/auth-sync...
};

// SEND OTP
exports.sendOtp = async (req, res) => {
    try {
        const { email, identifier, type } = req.body || {};
        if (!(email || identifier) || !type) return res.status(400).json({ message: 'Email/username and type are required.' });

        const normalizedEmail = String(email || identifier).toLowerCase().trim();
        const normalizedType = String(type).toLowerCase().trim();

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        if (normalizedType === 'forget') {
            const forgetUser = await User.findOne({ $or: [{ email: normalizedEmail }, { username: normalizedEmail }] });
            if (!forgetUser) {
                return res.status(404).json({ message: 'Email or username is not registered.' });
            }

            await User.updateOne(
                { _id: forgetUser._id },
                {
                    $set: {
                        otp,
                        otpExpires: new Date(Date.now() + 10 * 60000)
                    }
                }
            );

            await OTPRecord.findOneAndUpdate(
                { email: String(forgetUser.email || '').toLowerCase().trim() },
                { otp, email: String(forgetUser.email || '').toLowerCase().trim(), createdAt: new Date() },
                { upsert: true, new: true }
            );

            await sendOtpMail({
                toEmail: forgetUser.email,
                toName: forgetUser.name || 'Customer',
                otp
            });

            return res.json({ result: 'Done', message: 'OTP sent successfully' });
        }

        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
        if (!isValidEmail) {
            return res.status(400).json({ message: 'Invalid email format.' });
        }

        const user = await User.findOne({ $or: [{ email: normalizedEmail }, { username: normalizedEmail }] });
        if (normalizedType === 'signup' && user) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        if (user) {
            await User.updateOne(
                { _id: user._id },
                {
                    $set: {
                        otp,
                        otpExpires: new Date(Date.now() + 10 * 60000)
                    }
                }
            );
        } else {
            await OTPRecord.findOneAndUpdate(
                { email: normalizedEmail },
                { otp, email: normalizedEmail, createdAt: new Date() },
                { upsert: true, new: true }
            );
        }

        await sendOtpMail({
            toEmail: normalizedEmail,
            toName: user?.name || 'Customer',
            otp
        });

        return res.json({ result: 'Done', message: 'OTP sent successfully' });
    } catch (err) {
        console.error('sendOtp error:', err && err.message ? err.message : err);
        return res.status(500).json({ message: err?.message || 'Failed to send OTP.' });
    }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
    try {
        const { username, email, identifier, password, otp } = req.body || {};
        const requestedIdentifier = username || email || identifier;
        console.log('[AUTH_CONTROLLER] resetPassword called for:', { identifier: requestedIdentifier, otp });
        if (!requestedIdentifier || !password || !otp) return res.status(400).json({ message: 'email/username, password and otp are required' });

        const lookup = String(requestedIdentifier).toLowerCase().trim();
        const user = await User.findOne({ $or: [{ email: lookup }, { username: lookup }] });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const verification = await resolveOtpVerification(user, otp);
        if (!verification.ok) {
            if (verification.reason === 'missing') return res.status(400).json({ message: 'No OTP found for this user' });
            if (verification.reason === 'expired') return res.status(400).json({ message: 'OTP expired' });
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        const normalizedNewPassword = String(password || '').trim();
        const currentStoredPassword = String(user.password || '');

        if (currentStoredPassword) {
            const sameAsCurrent = await passwordMatches(normalizedNewPassword, currentStoredPassword);
            if (sameAsCurrent) {
                return res.status(400).json({ message: 'This is your current password. Please choose a different new password.' });
            }
        }

        const previousPasswords = Array.isArray(user.passwordHistory) ? user.passwordHistory : [];
        for (const item of previousPasswords) {
            const historyHash = String(item?.hash || '').trim();
            if (!historyHash) continue;
            const alreadyUsed = await passwordMatches(normalizedNewPassword, historyHash);
            if (alreadyUsed) {
                return res.status(400).json({ message: 'This password was used previously. Please create a new password you have not used before.' });
            }
        }

        // hash password and update immediately
        const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
        const hashed = await bcrypt.hash(normalizedNewPassword, saltRounds);
        console.log('[AUTH_CONTROLLER] Stored OTP for user:', { storedOtp: user.otp, otpExpires: user.otpExpires });

        let nextPasswordHistory = Array.isArray(user.passwordHistory) ? [...user.passwordHistory] : [];
        if (currentStoredPassword) {
            const previousHash = isBcryptHash(currentStoredPassword)
                ? currentStoredPassword
                : await bcrypt.hash(String(currentStoredPassword).trim(), saltRounds);
            nextPasswordHistory.push({ hash: previousHash, createdAt: new Date() });
        }
        if (nextPasswordHistory.length > 5) {
            nextPasswordHistory = nextPasswordHistory.slice(nextPasswordHistory.length - 5);
        }

        user.password = hashed;
        user.passwordHistory = nextPasswordHistory;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // emit realtime event so frontend can update instantly
        try {
            const io = req.app && req.app.get ? req.app.get('io') : null;
            if (io) {
                io.emit('userPasswordReset', { userId: user._id.toString(), email: user.email });
            }
        } catch (e) { console.warn('Realtime emit failed', e && e.message ? e.message : e); }

        // run any external sync (e.g., firebase) asynchronously without blocking response
        (async () => {
            try {
                if (firebaseAdminReady && admin) {
                    // best-effort: update the firebase user's password if exists
                    const fbUser = await admin.auth().getUserByEmail(user.email).catch(() => null);
                    if (fbUser) {
                        await admin.auth().updateUser(fbUser.uid, { password: password }).catch(() => null);
                    }
                }
                // clear any OTPRecord entry
                await OTPRecord.deleteMany({ email: user.email }).catch(() => null);
            } catch (err) {
                console.warn('Post-reset async tasks failed', err && err.message ? err.message : err);
            }
        })();

        return res.json({ result: 'Done', message: 'Password updated' });
    } catch (err) {
        console.error('resetPassword error:', err && err.message ? err.message : err);
        return res.status(500).json({ message: err?.message || 'Failed to reset password.' });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { username, email, identifier, otp } = req.body || {};
        const requestedIdentifier = username || email || identifier;

        if (!requestedIdentifier || !otp) {
            return res.status(400).json({ message: 'email/username and otp are required' });
        }

        const lookup = String(requestedIdentifier).toLowerCase().trim();
        const user = await User.findOne({ $or: [{ email: lookup }, { username: lookup }] });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const verification = await resolveOtpVerification(user, otp);
        if (!verification.ok) {
            if (verification.reason === 'missing') return res.status(400).json({ verified: false, message: 'No OTP found for this user' });
            if (verification.reason === 'expired') return res.status(400).json({ verified: false, message: 'OTP expired' });
            return res.status(400).json({ verified: false, message: 'Invalid OTP' });
        }

        return res.json({ verified: true, message: 'OTP verified successfully' });
    } catch (err) {
        console.error('verifyOtp error:', err && err.message ? err.message : err);
        return res.status(500).json({ verified: false, message: err?.message || 'Failed to verify OTP.' });
    }
};

// CHECK USERNAME
exports.checkUsername = async (req, res) => {
    // ...existing code from /api/check-username...
};

// LOGIN
exports.login = async (req, res) => {
    try {
        const searchTerm = String(req.body.username || req.body.email || '').toLowerCase().trim();
        const plainPassword = String(req.body.password || '');
        const normalizedPassword = plainPassword.trim();
        const user = await User.findOne({ $or: [{ username: searchTerm }, { email: searchTerm }] });

        if (user && user.lockUntil && Date.now() < user.lockUntil) {
            const minutesRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
            return res.status(403).json({
                message: `Account temporarily locked due to multiple failed login attempts. Try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`,
                remainingMinutes: minutesRemaining
            });
        }

        if (user) {
            if (!user.password) {
                const authMethod = user.provider === 'google' ? 'Google Login' :
                    user.provider === 'phone' ? 'Phone Login' :
                        'your authentication provider';

                return res.status(403).json({
                    message: `This account uses ${authMethod}. Use ${authMethod} to sign in or set a password using Forgot Password.`,
                    provider: user.provider,
                    requiresFirebaseAuth: true
                });
            }

            const storedPassword = String(user.password || '');
            const isBcryptHash = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$');
            const passwordMatches = isBcryptHash
                ? (await bcrypt.compare(plainPassword, storedPassword) || await bcrypt.compare(normalizedPassword, storedPassword))
                : (storedPassword === plainPassword || storedPassword === normalizedPassword || storedPassword.trim() === normalizedPassword);

            if (passwordMatches && !isBcryptHash) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(normalizedPassword, salt);
                await user.save();
            }

            if (passwordMatches) {
                const twoFactorEnabled = Boolean(user?.settings?.security?.twoFactorEnabled);
                const normalizedEmail = String(user.email || '').trim().toLowerCase();

                if (twoFactorEnabled) {
                    if (!normalizedEmail) {
                        return res.status(400).json({
                            message: '2FA is enabled but no verified email is available for this account.'
                        });
                    }

                    const otp = Math.floor(100000 + Math.random() * 900000).toString();
                    await OTPRecord.findOneAndUpdate(
                        { email: normalizedEmail },
                        { email: normalizedEmail, otp, createdAt: new Date() },
                        { upsert: true, new: true }
                    );

                    await sendOtpMail({
                        toEmail: normalizedEmail,
                        toName: user.name || 'Customer',
                        otp,
                        membershipType: user.membershipType,
                        logoUrl: user.pic
                    });
                    return res.json({
                        requiresTwoFactor: true,
                        message: `Verification code sent to ${maskEmail(normalizedEmail)}`,
                        maskedEmail: maskEmail(normalizedEmail)
                    });
                }

                user.failedAttempts = 0;
                user.lockUntil = undefined;
                user.lastLogin = new Date();
                await user.save();

                const io = req.app && req.app.get ? req.app.get('io') : null;
                if (io) io.emit('dashboardUpdate');

                await logActivity(req, {
                    action: 'User logged in',
                    userId: user._id,
                    userEmail: user.email,
                    meta: { method: 'password' }
                }).catch(() => null);

                const { password: _pw, otp: _otp, otpExpires: _exp, failedAttempts: _fa, lockUntil: _lu, ...safeUser } = user.toJSON();
                const adminToken = String(safeUser.role || '').toLowerCase() === 'admin' ? buildAdminJwt(safeUser) : '';
                return res.json({ ...safeUser, ...(adminToken ? { adminToken } : {}) });
            }
        }

        if (user) {
            user.failedAttempts = (user.failedAttempts || 0) + 1;

            if (user.failedAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 15 * 60000);
                await user.save();
                return res.status(403).json({
                    message: 'Too many failed login attempts. Account locked for 15 minutes.',
                    remainingMinutes: 15
                });
            }

            await user.save();
        }

        return res.status(401).json({ message: 'Invalid Credentials' });
    } catch (e) {
        console.error('Login Error:', e.message);
        return res.status(500).json({ message: 'Something went wrong.' });
    }
};

// USER SIGNUP (with OTP)
exports.signup = async (req, res) => {
    // ...existing code from /user POST handler...
    // Emit dashboard update event after user signup
    if (typeof req.app.get === 'function') {
        const io = req.app.get('io');
        if (io) io.emit('dashboardUpdate');
    }
};
