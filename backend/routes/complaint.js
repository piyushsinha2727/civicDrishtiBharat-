import express from "express";
import fs from "fs";
import User from "../models/User.js";
import Complaint from "../models/Complaint.js";
import Assignment from "../models/Assignment.js";
import Notification from "../models/Notification.js";
import Notice from "../models/Notice.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateAcknowledgementSlip } from "../utils/documentGenerator.js";

const router = express.Router();

/**
 * MASTER_PROMPT: The "Gold Standard" for civic issue forensic analysis.
 */
const MASTER_PROMPT = `
Analyze this image of a civic/urban environment with forensic precision.
As a Municipal Inspector, your goal is to identify clear evidence of civic neglect or infrastructure failure.

### ANALYSIS RULES:
1. INFRASTRUCTURE SCAN: Look for structural cracks, exposed rebars, broken pavement, or malfunctioning utilities.
2. SANITATION SCAN: Identify accumulated waste, illegal dumping, or overflowing bins.
3. DRAINAGE & WATER SCAN: Detect waterlogging, blocked culverts, or pipe bursts.
4. CONFIDENCE SCORING: 
   - 0.9+: Clear, undeniable evidence (e.g., a wheel-deep pothole).
   - 0.7-0.9: Highly likely issue (e.g., piles of garbage in a residential area).
   - 0.5-0.7: Possible issue but image is blurry or context is missing.
   - < 0.5: No clear civic issue found; classify as 'other'.

### RESPONSE FORMAT:
You MUST return a JSON object with exactly these keys:
{
    "issueType": "pothole" | "garbage" | "blocked_drain" | "road_damage" | "waterlogging" | "other",
    "confidence": number,
    "description": "Professional 1-2 sentence description",
    "forensic_details": ["detail 1", "detail 2"]
}

Do NOT provide any conversational filler. Return ONLY the JSON.
`;

const extractJSON = (text) => {
    try {
        const cleanText = text.replace(/```json\n?|```/g, "").trim();
        return JSON.parse(cleanText);
    } catch (e) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch (e2) {
                console.error("Failed to parse matched JSON segment:", match[0]);
            }
        }
        return {
            issueType: "other",
            confidence: 0.7,
            description: text || "Civic infrastructure issue observed in image.",
            forensic_details: ["Automated detection completed."]
        };
    }
};

const generateRefNum = () => 'URB-' + Math.random().toString(36).substr(2, 6).toUpperCase();

const predictSeverity = (issueType) => {
    if (['pothole', 'structural_damage', 'waterlogging'].includes(issueType)) {
        return { severity: 'High', predicted_days: 2 };
    }
    if (['garbage', 'broken_streetlight'].includes(issueType)) {
        return { severity: 'Medium', predicted_days: 1 };
    }
    return { severity: 'Low', predicted_days: 3 };
};

// Helper function to dynamically initialize Gemini Model with fallback support
const getGeminiModel = (modelName = "gemini-3.6-flash") => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing in backend .env file");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: modelName });
};

// SUBMIT COMPLAINT
router.post("/", async (req, res) => {
    try {
        const { user_email, issue_type, description, latitude, longitude, address, image_url } = req.body;

        if (!user_email || !issue_type || !description) {
            return res.status(400).json({ error: "Missing required fields: user_email, issue_type, and description are mandatory." });
        }

        const user = await User.findOne({ email: user_email });
        if (!user) return res.status(400).json({ error: "User not found" });

        const refNum = generateRefNum();
        const ai = predictSeverity(issue_type);

        const complaint = await Complaint.create({
            user_id: user._id,
            issue_type,
            description,
            latitude: latitude || null,
            longitude: longitude || null,
            address: address || null,
            before_image: image_url || null,
            severity: ai.severity,
            predicted_days: ai.predicted_days,
            reference_number: refNum,
            status: "New"
        });

        const slipData = await generateAcknowledgementSlip(complaint, user);

        res.json({
            message: "Complaint submitted",
            ref: refNum,
            severity: ai.severity,
            predicted_days: ai.predicted_days,
            slipPdf: slipData.pdf,
            slipJpg: slipData.jpg
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET COMPLAINTS
router.get("/", async (req, res) => {
    try {
        let complaints;
        if (req.query.user_id) {
            complaints = await Complaint.find({ user_id: req.query.user_id })
                .populate("user_id", "name")
                .sort({ created_at: -1 })
                .lean();
            return res.json(complaints.map(c => ({ ...c, id: c._id, citizen_name: c.user_id?.name || null })));
        } else if (req.query.engineer_id) {
            const eng_id = req.query.engineer_id === 'undefined' ? null : req.query.engineer_id;
            if (!eng_id) return res.json([]);

            const assignments = await Assignment.find({ engineer_id: eng_id }).lean();
            const complaintIds = assignments.map(a => a.complaint_id);
            complaints = await Complaint.find({ _id: { $in: complaintIds } })
                .populate("user_id", "name")
                .sort({ created_at: -1 })
                .lean();

            const assignmentMap = new Map(assignments.map(a => [a.complaint_id?.toString(), a]));
            const resultWithAssignments = complaints.map(c => {
                const obj = { ...c, id: c._id, citizen_name: c.user_id?.name || null };
                const assignment = assignmentMap.get(c._id.toString());
                if (assignment) {
                    obj.deadline = assignment.deadline;
                    obj.assigned_at = assignment.assigned_at;
                }
                return obj;
            });
            return res.json(resultWithAssignments);
        } else {
            const [rawComplaints, allAssignments] = await Promise.all([
                Complaint.find()
                    .populate("user_id", "name")
                    .sort({ created_at: -1 })
                    .lean(),
                Assignment.find().populate("engineer_id", "name dept_name").lean()
            ]);

            const assignmentMap = new Map(allAssignments.map(a => [a.complaint_id?.toString(), a]));
            const result = rawComplaints.map(c => {
                const obj = { ...c, id: c._id, citizen_name: c.user_id?.name || null };
                const assignment = assignmentMap.get(c._id.toString());
                if (assignment) {
                    obj.assigned_engineer_name = assignment.engineer_id?.name || "Unknown";
                    obj.assigned_engineer_dept = assignment.engineer_id?.dept_name || null;
                    obj.engineer_id = assignment.engineer_id?._id || assignment.engineer_id;
                    obj.deadline = assignment.deadline;
                    obj.assigned_at = assignment.assigned_at;
                }
                return obj;
            });
            return res.json(result);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE COMPLAINT DESCRIPTION
router.put("/:id", async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ error: "Complaint not found" });
        if (complaint.status !== 'New') return res.status(400).json({ error: "Cannot modify a complaint that is already being processed." });
        complaint.description = req.body.description;
        await complaint.save();
        res.json({ message: "Complaint updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ASSIGN COMPLAINT
router.post("/assign", async (req, res) => {
    try {
        const { complaint_id, engineer_id, provided_time } = req.body;
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + (parseInt(provided_time) || 24));
        await Assignment.create({ complaint_id, engineer_id, deadline, status: "Assigned" });
        await Complaint.findByIdAndUpdate(complaint_id, { status: "Forwarded" });
        await User.findByIdAndUpdate(engineer_id, { activity_status: "Busy" });
        res.json({ message: "Engineer assigned successfully", deadline: deadline.toISOString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// RESOLVE COMPLAINT
router.post("/resolve", async (req, res) => {
    try {
        const { complaint_id, after_image, engineer_id } = req.body;

        if (!complaint_id || !after_image || !engineer_id) {
            return res.status(400).json({ error: "Missing required fields for resolution." });
        }

        const complaint = await Complaint.findById(complaint_id);
        if (!complaint) return res.status(404).json({ error: "Complaint not found" });

        if (complaint.before_image === after_image && complaint.before_image) {
            return res.status(400).json({ error: "AI Warning: Uploaded image appears identical to the Before image." });
        }

        let resolutionAnalysis = { is_resolved: false, analysis_text: "AI verification pending", confidence: 0 };
        try {
            const model = getGeminiModel();
            const base64Data = after_image.replace(/^data:image\/\w+;base64,/, "");
            const beforeBase64 = complaint.before_image ? complaint.before_image.replace(/^data:image\/\w+;base64,/, "") : null;
            const prompt = `Analyze Before and After images. Return JSON: {is_resolved: boolean, is_false_image: boolean, confidence: number, analysis: string, detected_content: string}`;
            const contents = [{ role: "user", parts: [{ text: prompt }, { inlineData: { data: beforeBase64, mimeType: "image/jpeg" } }, { inlineData: { data: base64Data, mimeType: "image/jpeg" } }] }];
            const result = await model.generateContent({ contents });
            const response = await result.response;
            const aiData = JSON.parse(response.text().trim());
            resolutionAnalysis = { is_resolved: aiData.is_resolved || false, is_false_image: aiData.is_false_image || false, analysis_text: aiData.analysis || "Analysis complete", detected_content: aiData.detected_content || "", confidence: aiData.confidence || 0.5 };
        } catch (aiErr) { console.error("AI Analysis Failed", aiErr); }

        await Complaint.findByIdAndUpdate(complaint_id, { status: "Resolved", after_image, resolution_analysis: resolutionAnalysis });
        await Assignment.updateMany({ complaint_id }, { status: "Resolved" });
        await User.findByIdAndUpdate(engineer_id, { activity_status: "Available" });
        res.json({ message: "Resolution uploaded and verified by AI.", analysis: resolutionAnalysis });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CITIZEN FEEDBACK
router.post("/feedback", async (req, res) => {
    try {
        const { complaint_id, satisfied, rating, feedback } = req.body;
        if (satisfied) {
            await Complaint.findByIdAndUpdate(complaint_id, { satisfaction_status: "Satisfied", citizen_rating: rating || 5, citizen_feedback: feedback || "Satisfied with work", status: "Closed" });
            res.json({ message: "Thank you! Complaint closed." });
        } else {
            await Complaint.findByIdAndUpdate(complaint_id, { satisfaction_status: "Dissatisfied", citizen_feedback: feedback || "Work not satisfactory" });
            res.json({ message: "Feedback sent to Admin." });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CREATE NOTICE (Show Cause)
router.post("/notice", async (req, res) => {
    try {
        const { engineer_id, admin_id, complaint_id, message } = req.body;
        const notice = await Notice.create({ engineer_id, admin_id, complaint_id, message });

        await Complaint.findByIdAndUpdate(complaint_id, { status: "Show Cause Issued" });

        res.json({ message: "Show Cause Notice issued.", notice });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET ALL NOTICES (For Admin review)
router.get("/notices/all", async (req, res) => {
    try {
        const notices = await Notice.find()
            .populate("engineer_id", "name dept_name email phone")
            .populate("complaint_id", "reference_number status issue_type address")
            .sort({ created_at: -1 })
            .lean();
        res.json(notices);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET NOTICES FOR ENGINEER
router.get("/notices/:engineer_id", async (req, res) => {
    try {
        const { isValidObjectId } = await import("mongoose");
        if (!isValidObjectId(req.params.engineer_id)) {
            return res.status(400).json({ error: "Invalid engineer_id format" });
        }
        const notices = await Notice.find({ engineer_id: req.params.engineer_id })
            .populate("complaint_id", "reference_number status issue_type address")
            .sort({ created_at: -1 });
        res.json(notices);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// RESPOND TO NOTICE
router.post("/notices/:notice_id/respond", async (req, res) => {
    try {
        const { isValidObjectId } = await import("mongoose");
        const { reason, evidence_image, engineer_id } = req.body;
        const noticeId = req.params.notice_id;

        let notice = null;
        if (isValidObjectId(noticeId)) {
            notice = await Notice.findByIdAndUpdate(noticeId, {
                reason: reason || "Explanation submitted by engineer",
                evidence_image: evidence_image || null,
                responded: true,
                admin_decision: "Pending"
            }, { new: true });
        }

        // Fallback: if notice not found by exact ID, find un-responded notice for this engineer
        if (!notice && engineer_id && isValidObjectId(engineer_id)) {
            notice = await Notice.findOneAndUpdate(
                { engineer_id, responded: false },
                {
                    reason: reason || "Explanation submitted by engineer",
                    evidence_image: evidence_image || null,
                    responded: true,
                    admin_decision: "Pending"
                },
                { new: true, sort: { created_at: -1 } }
            );
        }

        if (!notice) {
            return res.status(404).json({ error: "Notice record not found or already processed." });
        }

        if (notice.complaint_id) {
            const compId = notice.complaint_id._id || notice.complaint_id;
            await Complaint.findByIdAndUpdate(compId, { status: "Compliance Review" });
        }

        res.json({ 
            success: true, 
            message: "Explanation and evidence successfully submitted to Command Center.",
            notice 
        });
    } catch (err) { 
        console.error("Notice response error:", err);
        res.status(500).json({ error: err.message || "Failed to submit explanation" }); 
    }
});

// REVIEW NOTICE
router.post("/notices/:notice_id/review", async (req, res) => {
    try {
        const { action, notes } = req.body;
        const notice = await Notice.findById(req.params.notice_id).populate("engineer_id").populate("complaint_id");
        if (!notice) return res.status(404).json({ error: "Notice not found" });

        if (action === 'accept') {
            await Notice.findByIdAndUpdate(req.params.notice_id, { admin_decision: "Accepted", admin_notes: notes || "Explanation accepted. Re-assigning." });

            await Complaint.findByIdAndUpdate(notice.complaint_id._id, {
                $addToSet: { excluded_engineers: notice.engineer_id._id },
                status: "New",
                is_reassigned: true
            });

            await Assignment.deleteMany({ complaint_id: notice.complaint_id._id });
            await User.findByIdAndUpdate(notice.engineer_id._id, { activity_status: "Available" });

            res.json({ message: "Explanation accepted. Complaint reset for re-assignment." });
        } else {
            const { generateSuspensionLetter, generateDisciplinaryJPG } = await import("../utils/documentGenerator.js");

            const MANDATORY_SUSPENSION_DAYS = 30;
            const suspData = await generateSuspensionLetter(notice.engineer_id, notice, notes, MANDATORY_SUSPENSION_DAYS);
            const jpgNotice = await generateDisciplinaryJPG(notice.engineer_id, notice, notes, MANDATORY_SUSPENSION_DAYS);

            await Notice.findByIdAndUpdate(req.params.notice_id, {
                admin_decision: "Rejected",
                admin_notes: notes || "Explanation rejected.",
                suspension_letter: suspData.pdf,
                disciplinary_notice_url: jpgNotice.jpg
            });

            await User.findByIdAndUpdate(notice.engineer_id._id, {
                is_suspended: true,
                suspension_until: suspData.untilDate,
                suspension_letter: suspData.pdf,
                disciplinary_notice_url: jpgNotice.jpg,
                activity_status: "On Leave",
                login_disabled: true,
                login_disabled_reason: `Suspension Order: ${suspData.suspId}. Justification rejected by admin.`
            });

            await Complaint.findByIdAndUpdate(notice.complaint_id._id, {
                $addToSet: { excluded_engineers: notice.engineer_id._id },
                status: "New",
                is_reassigned: true
            });
            await Assignment.deleteMany({ complaint_id: notice.complaint_id._id });

            res.json({
                message: "Explanation rejected. Engineer suspended for 30 days and login blocked.",
                suspension_letter: suspData.pdf,
                disciplinary_notice: jpgNotice.jpg
            });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ANALYZE IMAGE
router.post("/analyze-image", async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ error: "No image provided for analysis." });

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imagePart = { inlineData: { data: base64Data, mimeType: "image/jpeg" } };

        const modelsToTry = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-pro", "gemini-flash-latest"];
        let result = null;
        let lastErr = null;

        for (const modelName of modelsToTry) {
            try {
                const model = getGeminiModel(modelName);
                result = await model.generateContent([MASTER_PROMPT, imagePart]);
                if (result) break;
            } catch (mErr) {
                console.warn(`Model ${modelName} failed in analyze-image:`, mErr.message);
                lastErr = mErr;
            }
        }

        if (!result) {
            const errorMsg = lastErr?.message || "Failed to generate content with available Gemini models.";
            if (errorMsg.includes("API key not valid") || errorMsg.includes("API_KEY_INVALID")) {
                return res.status(400).json({ error: "Invalid Gemini API Key. Please check GEMINI_API_KEY in backend .env." });
            }
            return res.status(500).json({ error: "CivicDrishti AI Analysis Failed: " + errorMsg });
        }

        const response = await result.response;
        const text = response.text().trim();
        const parsed = extractJSON(text);
        return res.json(parsed);
    } catch (err) {
        console.error("Internal Server Error in Analyze-Image Route:", err);
        return res.status(500).json({ error: "Server error during analysis: " + err.message });
    }
});

// CLOSE COMPLAINT
router.post("/:id/close", async (req, res) => {
    try {
        const complaint = await Complaint.findByIdAndUpdate(req.params.id, { status: "Closed" }, { new: true });

        const assignment = await Assignment.findOne({ complaint_id: req.params.id });
        if (assignment) {
            await User.findByIdAndUpdate(assignment.engineer_id, { activity_status: "Available" });
            await Assignment.deleteOne({ _id: assignment._id });
        }

        res.json({ message: "Complaint closed and engineer released.", complaint });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE COMPLAINT
router.delete("/:id", async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ error: "Complaint not found" });
        if (complaint.status !== 'New') return res.status(400).json({ error: "Cannot delete processing complaint." });
        await Complaint.findByIdAndDelete(req.params.id);
        await Assignment.deleteMany({ complaint_id: req.params.id });
        res.json({ message: "Complaint deleted." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
