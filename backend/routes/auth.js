import express from "express";
import User from "../models/User.js";
import Notice from "../models/Notice.js";
import OTP from "../models/OTP.js";
import { sendOTP } from "../utils/mailer.js";

const router = express.Router();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// REGISTER
router.post("/register", async (req, res) => {
    try {
        const {
            name, email, password, role,
            phone, mobile,
            gov_id_type, id_type,
            gov_id_number, id_number,
            area, block, district, state, pincode,
            dept_name, head_of_dept, experience_level,
            position, area_expertise, otp
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required fields." });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists with this email address." });
        }

        /* TEMPORARILY BYPASSED OTP
        if (!otp) {
            // Generate and send OTP
            const code = generateOTP();
            await OTP.findOneAndUpdate({ email }, { otp: code }, { upsert: true, new: true, setDefaultsOnInsert: true });

            const emailSent = await sendOTP(email, code);
            if (!emailSent) {
                return res.status(500).json({ message: "Failed to send OTP email. Please ensure your Google App Password is correct." });
            }
            return res.json({ requireOtp: true, message: "OTP sent to your email for verification. Code expires in 5 minutes." });
        }

        // Verify OTP
        const otpRecord = await OTP.findOne({ email });
        if (!otpRecord) return res.status(400).json({ message: "OTP expired or missing. Please request a new one." });
        if (otpRecord.otp !== otp) return res.status(401).json({ message: "Invalid OTP code." });
        */

        // Create the user
        const user = await User.create({
            name: name || email.split("@")[0],
            email,
            password,
            role: role || "Citizen",
            phone: phone || mobile || null,
            gov_id_type: gov_id_type || id_type || null,
            gov_id_number: gov_id_number || id_number || null,
            area: area || block || null,
            district: district || null,
            state: state || null,
            pincode: pincode || null,
            dept_name: dept_name || null,
            head_of_dept: head_of_dept || null,
            experience_level: experience_level || null,
            position: position || null,
            area_expertise: area_expertise || null
        });

        // Delete consumed OTP safely if exists
        try {
            await OTP.deleteOne({ email });
        } catch (otpErr) {
            console.warn("OTP cleanup warning:", otpErr.message);
        }

        return res.status(201).json({ message: "User registered successfully", id: user._id, user });
    } catch (err) {
        console.error("Registration Error:", err);
        return res.status(500).json({ message: err.message || "Internal server error during registration" });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const user = await User.findOne({ email, password });
        if (!user) return res.status(401).json({ message: "Invalid email or password" });

        // --- Disciplinary Gate: Block login if account is disabled due to suspension ---
        if (user.login_disabled || user.is_suspended) {
            let suspensionLetter = user.suspension_letter;
            let disciplinaryNoticeUrl = user.disciplinary_notice_url;

            if (!suspensionLetter) {
                const latestNotice = await Notice.findOne({ 
                    engineer_id: user._id, 
                    suspension_letter: { $ne: null } 
                }).sort({ created_at: -1 });
                if (latestNotice) {
                    suspensionLetter = latestNotice.suspension_letter;
                    disciplinaryNoticeUrl = disciplinaryNoticeUrl || latestNotice.disciplinary_notice_url;
                }
            }

            const untilDate = user.suspension_until
                ? new Date(user.suspension_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                : 'further administrative notice';

            return res.status(403).json({
                message: `⛔ Account Suspended. Your account access has been revoked due to official disciplinary action. Suspended until: ${untilDate}.`,
                is_suspended: true,
                suspension_letter: suspensionLetter,
                disciplinary_notice_url: disciplinaryNoticeUrl,
                suspension_until: user.suspension_until,
                engineer_id: user._id,
                engineer_name: user.name,
                login_disabled_reason: user.login_disabled_reason || "Disciplinary penalty enforced by Municipal Command Center.",
                suspension_appeal: user.suspension_appeal || null
            });
        }

        return res.json(user);
    } catch (err) {
        console.error("Login Error:", err);
        return res.status(500).json({ message: err.message || "Internal server error during login" });
    }
});

// UPDATE PROFILE
router.put("/profile", async (req, res) => {
    try {
        const { id, name, email, phone, avatar, password, oldPassword } = req.body;

        if (!id) return res.status(400).json({ message: "User ID is required" });

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // If password change is requested, verify old password
        if (password) {
            if (!oldPassword) return res.status(400).json({ message: "Old password is required to set a new password" });
            if (user.password !== oldPassword) return res.status(401).json({ message: "Incorrect old password" });
            user.password = password;
        }

        // Update other fields if provided
        if (name) user.name = name;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (avatar) user.avatar = avatar;

        await user.save();

        return res.json({ message: "Profile updated successfully", user });
    } catch (err) {
        console.error("Profile Update Error:", err);
        return res.status(500).json({ message: err.message || "Internal server error during profile update" });
    }
});

export default router;
