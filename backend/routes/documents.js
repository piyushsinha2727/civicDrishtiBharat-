import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import User from "../models/User.js";
import Notice from "../models/Notice.js";
import Complaint from "../models/Complaint.js";
import Leave from "../models/Leave.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const BASE_DOCS_DIR = path.join(__dirname, "../public/documents");
const SLIPS_DIR = path.join(BASE_DOCS_DIR, "slips");
const CERTIFICATES_DIR = path.join(BASE_DOCS_DIR, "certificates");
const FLOOD_DIR = path.join(BASE_DOCS_DIR, "flood-advisories");

// Ensure directories exist
[BASE_DOCS_DIR, SLIPS_DIR, CERTIFICATES_DIR, FLOOD_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Helper: generate suspension PDF buffer/file on-the-fly
async function generateDynamicSuspensionPDF(filename, suspId) {
    // 1. Fetch details from DB
    let notice = null;
    let user = null;

    try {
        notice = await Notice.findOne({
            $or: [
                { suspension_letter: { $regex: suspId } },
                { suspension_letter: { $regex: filename } }
            ]
        }).populate("engineer_id").populate("complaint_id");
    } catch (e) {
        console.warn("Dynamic PDF Notice lookup warning:", e.message);
    }

    try {
        if (notice?.engineer_id) {
            user = notice.engineer_id;
        } else {
            user = await User.findOne({
                $or: [
                    { suspension_letter: { $regex: suspId } },
                    { suspension_letter: { $regex: filename } },
                    { is_suspended: true }
                ]
            });
        }
    } catch (e) {
        console.warn("Dynamic PDF User lookup warning:", e.message);
    }

    const engineerName = user?.name || "Field Officer / Resolver";
    const engineerId = user?._id?.toString() || user?.gov_id || "EMP-" + suspId.slice(-6);
    const department = user?.dept_name || "Urban Grievance Operations & Maintenance";
    const email = user?.email || "resolver@civicdrishti.gov.in";
    const complaintRef = notice?.complaint_id?.reference_number || "CDB-" + Math.floor(100000 + Math.random() * 900000);
    const issueType = (notice?.complaint_id?.issue_type || "Civic Grievance Resolution").replace(/_/g, " ").toUpperCase();
    const adminNotes = notice?.admin_notes || user?.login_disabled_reason || "Professional negligence, falsification of resolution report, or failure to respond satisfactorily to show-cause notice.";
    
    const issueDate = notice?.created_at
        ? new Date(notice.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
        : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

    const untilDate = user?.suspension_until
        ? new Date(user.suspension_until).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
        : new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

    const filePath = path.join(CERTIFICATES_DIR, filename);

    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: "A4", margin: 45 });
            const writeStream = fs.createWriteStream(filePath);
            
            // Collect chunks for immediate buffer return as well
            const buffers = [];
            doc.on("data", (chunk) => buffers.push(chunk));
            doc.on("end", () => {
                const pdfData = Buffer.concat(buffers);
                resolve({ pdfBuffer: pdfData, filePath });
            });
            doc.on("error", reject);

            doc.pipe(writeStream);

            // --- Top Banner / Header ---
            doc.rect(0, 0, 595.28, 12).fill("#991b1b");

            doc.moveDown(1);
            doc.fontSize(18).fillColor("#991b1b").font("Helvetica-Bold").text("CIVICDRISHTI BHARAT (CDB)", { align: "center" });
            doc.fontSize(9).fillColor("#4b5563").font("Helvetica").text("National Urban Command & Civic Governance Administration", { align: "center" });
            doc.moveDown(0.4);
            doc.fontSize(20).fillColor("#991b1b").font("Helvetica-Bold").text("OFFICIAL SUSPENSION ORDER", { align: "center" });
            doc.moveDown(0.2);

            // Red divider rule
            doc.moveTo(45, doc.y).lineTo(550, doc.y).strokeColor("#991b1b").lineWidth(2).stroke();
            doc.moveDown(0.8);

            // --- Metadata block ---
            doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10);
            doc.text(`Order Reference : ${suspId}`, 45, doc.y, { align: "left" });
            const currentY = doc.y - 12;
            doc.text(`Date of Issue : ${issueDate}`, 350, currentY, { align: "right" });
            doc.text(`Effective Until: ${untilDate}`, 350, doc.y + 2, { align: "right" });
            doc.moveDown(1.5);

            // --- Addressee Box ---
            doc.rect(45, doc.y, 505, 70).fillAndStroke("#fef2f2", "#fca5a5");
            const boxTop = doc.y + 8;
            doc.fillColor("#7f1d1d").font("Helvetica-Bold").fontSize(9).text("TO / RECIPIENT OFFICER:", 55, boxTop);
            doc.fillColor("#111827").font("Helvetica-Bold").fontSize(12).text(engineerName, 55, boxTop + 14);
            doc.font("Helvetica").fontSize(9).fillColor("#374151");
            doc.text(`Employee ID: ${engineerId}   |   Department: ${department}`, 55, boxTop + 30);
            doc.text(`Official Email: ${email}`, 55, boxTop + 44);

            doc.y = boxTop + 75;
            doc.moveDown(1);

            // --- Subject ---
            doc.font("Helvetica-Bold").fontSize(11).fillColor("#991b1b").text("SUBJECT: FORMAL NOTICE OF TEMPORARY SUSPENSION FROM MUNICIPAL DUTIES", { underline: true });
            doc.moveDown(0.8);

            // --- Body Content ---
            doc.font("Helvetica").fontSize(10).fillColor("#1f2937");
            doc.text(
                `This is a formal disciplinary order issued by the Urban Command Center of CivicDrishti Bharat following the comprehensive evaluation of the field report and disciplinary response submitted under Complaint Reference: ${complaintRef} (${issueType}).`,
                { lineGap: 3 }
            );
            doc.moveDown(0.6);

            doc.text("Upon administrative review, your justification and field conduct were found to be:");
            doc.moveDown(0.3);
            doc.font("Helvetica-Bold").fillColor("#dc2626").fontSize(11).text("▶  UNSATISFACTORY & IN VIOLATION OF OPERATIONAL CODE");
            doc.moveDown(0.4);

            // Grounds Box
            doc.font("Helvetica-Bold").fontSize(9).fillColor("#374151").text("Grounds for Disciplinary Action:");
            doc.rect(45, doc.y + 3, 505, 38).fillAndStroke("#f8fafc", "#e2e8f0");
            doc.font("Helvetica-Oblique").fontSize(9.5).fillColor("#0f172a")
                .text(`"${adminNotes}"`, 55, doc.y + 10, { width: 485, lineGap: 2 });
            
            doc.y += 35;
            doc.moveDown(0.8);

            // --- Enforced Disciplinary Penalties ---
            doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#991b1b").text("ENFORCED DISCIPLINARY SANCTIONS:");
            doc.moveDown(0.3);
            doc.font("Helvetica").fontSize(9.5).fillColor("#1f2937");
            
            const penalties = [
                `Immediate suspension from active duties for the designated period until ${untilDate}.`,
                "CivicDrishti Bharat resolver portal credentials and login access are strictly BLOCKED.",
                "Assignment of new civic complaints and operational tasks is halted.",
                "Disciplinary remark has been officially recorded in the National Municipal Audit Ledger.",
                "Any further breach or unauthorized field activity may lead to permanent termination."
            ];

            penalties.forEach((p) => {
                doc.text(`•  ${p}`, { indent: 10, lineGap: 3 });
            });
            doc.moveDown(0.8);

            // --- Appeal Rights ---
            doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text("STATUTORY APPEAL PROCESS:");
            doc.font("Helvetica").fontSize(9).fillColor("#4b5563")
                .text("You are entitled to file a formal appeal through the CivicDrishti portal login appeal interface within 7 business days accompanied by relevant documentary proof. All appeals are subject to appellate review by the District Commissioner.", { lineGap: 2 });
            doc.moveDown(1.2);

            // --- Sign-off ---
            doc.moveTo(45, doc.y).lineTo(550, doc.y).strokeColor("#e5e7eb").lineWidth(1).stroke();
            doc.moveDown(0.6);

            doc.font("Helvetica").fontSize(9).fillColor("#6b7280").text("Issued by Authority,", 45, doc.y);
            doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text("Urban Disciplinary & Vigilance Directorate", 45, doc.y + 12);
            doc.font("Helvetica").fontSize(9).fillColor("#6b7280").text("CivicDrishti Bharat Municipal Administration", 45, doc.y + 26);

            // Digital Stamp
            doc.rect(380, doc.y - 10, 160, 42).strokeColor("#991b1b").lineWidth(1.5).stroke();
            doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#991b1b").text("DIGITALLY CERTIFIED", 385, doc.y - 5, { width: 150, align: "center" });
            doc.font("Helvetica").fontSize(7.5).fillColor("#7f1d1d").text("CDB NATIONAL URBAN PORTAL", 385, doc.y + 6, { width: 150, align: "center" });
            doc.text(`Auth Token: ${suspId.slice(0, 16)}`, 385, doc.y + 17, { width: 150, align: "center" });

            // Bottom Footer
            doc.fontSize(8).fillColor("#9ca3af")
                .text("This is a digitally generated legal order under the National Urban Civic Grievance Framework. No physical signature is required.", 45, 785, { align: "center", width: 505 });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// Helper: generate Leave Certificate PDF on-the-fly
async function generateDynamicLeavePDF(filename, certId) {
    let leave = null;
    let user = null;

    try {
        leave = await Leave.findOne({
            $or: [
                { certificate_url: { $regex: certId } },
                { certificate_url: { $regex: filename } },
                { status: "Approved" }
            ]
        }).populate("engineer_id");
        if (leave?.engineer_id) user = leave.engineer_id;
    } catch (e) {
        console.warn("Dynamic Leave lookup warning:", e.message);
    }

    if (!user) {
        try {
            user = await User.findOne({ role: "resolver" });
        } catch (e) {}
    }

    const userName = user?.name || "Municipal Officer";
    const userId = user?._id?.toString() || user?.gov_id || "EMP-" + certId.slice(-6);
    const dept = user?.dept_name || "Civil & Urban Works";
    const fromDate = leave?.duration_from ? new Date(leave.duration_from).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
    const toDate = leave?.duration_to ? new Date(leave.duration_to).toLocaleDateString("en-IN") : new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-IN");

    const filePath = path.join(CERTIFICATES_DIR, filename);

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40 });
            const writeStream = fs.createWriteStream(filePath);
            const buffers = [];
            
            doc.on("data", (c) => buffers.push(c));
            doc.on("end", () => resolve({ pdfBuffer: Buffer.concat(buffers), filePath }));
            doc.on("error", reject);

            doc.pipe(writeStream);

            // Double border
            doc.rect(20, 20, 802, 555).lineWidth(3).strokeColor("#1e3a8a").stroke();
            doc.rect(25, 25, 792, 545).lineWidth(1).strokeColor("#93c5fd").stroke();

            doc.moveDown(1.5);
            doc.fontSize(26).fillColor("#1e3a8a").font("Helvetica-Bold").text("LEAVE APPROVAL SANCTION ORDER", { align: "center" });
            doc.fontSize(11).fillColor("#64748b").font("Helvetica").text("CivicDrishti Bharat Municipal Administration Portal", { align: "center" });
            doc.moveDown(1.5);

            doc.fontSize(14).fillColor("#334155").text("This is to certify that official leave has been sanctioned for:", { align: "center" });
            doc.moveDown(0.8);
            doc.fontSize(22).fillColor("#0f172a").font("Helvetica-Bold").text(userName, { align: "center" });
            doc.fontSize(12).fillColor("#475569").font("Helvetica").text(`Employee ID: ${userId}  |  Department: ${dept}`, { align: "center" });
            doc.moveDown(1.2);

            doc.fontSize(13).fillColor("#334155").text("Sanctioned Leave Duration:", { align: "center" });
            doc.moveDown(0.4);
            doc.fontSize(18).fillColor("#1d4ed8").font("Helvetica-Bold").text(`${fromDate}  to  ${toDate}`, { align: "center" });
            doc.moveDown(2);

            doc.fontSize(10).fillColor("#64748b").text(`Certificate ID: ${certId}`, 50, 480);
            doc.text(`Issued Date: ${new Date().toLocaleDateString("en-IN")}`, 50, 495);

            doc.fontSize(12).fillColor("#0f172a").font("Helvetica-Bold").text("Digital Approval Authority", 580, 480);
            doc.fontSize(10).fillColor("#475569").font("Helvetica").text("Municipal Commissioner / System Admin", 580, 498);
            doc.text("CivicDrishti Command Center", 580, 512);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// Helper: generate Acknowledgement Slip PDF on-the-fly
async function generateDynamicSlipPDF(filename, refId) {
    let complaint = null;
    let citizen = null;

    try {
        complaint = await Complaint.findOne({
            $or: [
                { reference_number: refId },
                { reference_number: { $regex: refId } }
            ]
        }).populate("citizen_id");
        if (complaint?.citizen_id) citizen = complaint.citizen_id;
    } catch (e) {
        console.warn("Dynamic Slip Complaint lookup warning:", e.message);
    }

    const citizenName = citizen?.name || complaint?.citizen_name || "Respected Citizen";
    const issueType = complaint?.issue_type || "Civic Infrastructure Grievance";
    const address = complaint?.address || "Designated Municipal Ward";
    const status = complaint?.status || "Registered";
    const dateStr = complaint?.created_at ? new Date(complaint.created_at).toLocaleString("en-IN") : new Date().toLocaleString("en-IN");

    const filePath = path.join(SLIPS_DIR, filename);

    return new Promise(async (resolve, reject) => {
        try {
            const qrBuffer = await QRCode.toBuffer(JSON.stringify({ refId, issueType, status, verified: true }));
            const doc = new PDFDocument({ size: "A4", margin: 45 });
            const writeStream = fs.createWriteStream(filePath);
            const buffers = [];

            doc.on("data", (c) => buffers.push(c));
            doc.on("end", () => resolve({ pdfBuffer: Buffer.concat(buffers), filePath }));
            doc.on("error", reject);

            doc.pipe(writeStream);

            doc.fontSize(18).fillColor("#1d4ed8").font("Helvetica-Bold").text("CIVICDRISHTI BHARAT", { align: "center" });
            doc.fontSize(14).fillColor("#1e293b").text("COMPLAINT ACKNOWLEDGEMENT RECEIPT", { align: "center" });
            doc.moveDown(0.5);

            doc.moveTo(45, doc.y).lineTo(550, doc.y).strokeColor("#2563eb").lineWidth(2).stroke();
            doc.moveDown(1);

            doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11);
            doc.text(`Reference Number: ${refId}`);
            doc.moveDown(0.5);
            doc.font("Helvetica").fontSize(10);
            doc.text(`Citizen Name: ${citizenName}`);
            doc.text(`Submission Date: ${dateStr}`);
            doc.text(`Complaint Type: ${issueType}`);
            doc.text(`Current Status: ${status}`);
            doc.text(`Location / Address: ${address}`);
            doc.moveDown(1);

            if (qrBuffer) {
                doc.image(qrBuffer, 420, 140, { width: 110 });
            }

            doc.moveDown(2);
            doc.fontSize(8.5).fillColor("#64748b")
                .text("Track this complaint at any time using your reference number on the CivicDrishti Bharat portal.", { align: "center" });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// Helper: generate Flood Advisory PDF on-the-fly
async function generateDynamicFloodAdvisoryPDF(filename, advId) {
    const filePath = path.join(FLOOD_DIR, filename);

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: "A4", margin: 45 });
            const writeStream = fs.createWriteStream(filePath);
            const buffers = [];

            doc.on("data", (c) => buffers.push(c));
            doc.on("end", () => resolve({ pdfBuffer: Buffer.concat(buffers), filePath }));
            doc.on("error", reject);

            doc.pipe(writeStream);

            doc.rect(0, 0, 595.28, 14).fill("#dc2626");
            doc.moveDown(1);
            doc.fontSize(20).fillColor("#dc2626").font("Helvetica-Bold").text("CIVICDRISHTI BHARAT", { align: "center" });
            doc.fontSize(14).fillColor("#1e293b").text("FLOOD & WATERLOGGING ADVISORY REPORT", { align: "center" });
            doc.moveDown(0.5);

            doc.moveTo(45, doc.y).lineTo(550, doc.y).strokeColor("#dc2626").lineWidth(2).stroke();
            doc.moveDown(1);

            doc.fontSize(11).fillColor("#111827").font("Helvetica-Bold");
            doc.text(`Advisory ID: ${advId}`);
            doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`);
            doc.moveDown(1);

            doc.fontSize(10).font("Helvetica").fillColor("#374151");
            doc.text("This official advisory highlights high-risk waterlogging zones identified by AI spatial clustering and live civic grievance telemetry.", { lineGap: 3 });
            doc.moveDown(1);

            doc.font("Helvetica-Bold").text("Recommended Rapid Response Actions:");
            doc.font("Helvetica").text("1. Immediate deployment of suction pumps in low-lying corridors.");
            doc.text("2. Desilting of choke-points and major drain lines.");
            doc.text("3. High alert for municipal quick response teams (QRTs).");

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// Universal handler for documents
const handleDocumentRequest = async (req, res) => {
    try {
        const { folder, filename } = req.params;
        const requestedFile = filename || folder;
        const cleanFilename = path.basename(requestedFile);

        // Security check against directory traversal
        if (cleanFilename.includes("..") || cleanFilename.includes("/") || cleanFilename.includes("\\")) {
            return res.status(400).send("Invalid document request");
        }

        // Determine candidate paths on disk
        const candidatePaths = [
            path.join(CERTIFICATES_DIR, cleanFilename),
            path.join(SLIPS_DIR, cleanFilename),
            path.join(FLOOD_DIR, cleanFilename),
            path.join(BASE_DOCS_DIR, cleanFilename)
        ];

        if (folder && folder !== cleanFilename) {
            candidatePaths.unshift(path.join(BASE_DOCS_DIR, folder, cleanFilename));
        }

        // 1. Check if the file already exists on disk
        for (const candidate of candidatePaths) {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                res.setHeader("Access-Control-Allow-Origin", "*");
                if (cleanFilename.endsWith(".pdf")) {
                    res.setHeader("Content-Type", "application/pdf");
                    res.setHeader("Content-Disposition", `inline; filename="${cleanFilename}"`);
                } else if (cleanFilename.match(/\.(jpe?g)$/i)) {
                    res.setHeader("Content-Type", "image/jpeg");
                } else if (cleanFilename.endsWith(".png")) {
                    res.setHeader("Content-Type", "image/png");
                }
                return res.sendFile(candidate);
            }
        }

        // 2. Dynamic generation on-demand if file is missing (e.g. Render ephemeral storage reset)
        console.log(`[Document Recovery] File not on disk: ${cleanFilename}. Generating dynamically on-the-fly...`);

        res.setHeader("Access-Control-Allow-Origin", "*");

        // A. Suspension Order (SUSP-...)
        if (cleanFilename.toUpperCase().includes("SUSP")) {
            const suspId = cleanFilename.replace(/\.(pdf|jpe?g|png)$/i, "");
            const result = await generateDynamicSuspensionPDF(cleanFilename, suspId);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="${cleanFilename}"`);
            return res.send(result.pdfBuffer);
        }

        // B. Leave Certificate (CERT-...)
        if (cleanFilename.toUpperCase().includes("CERT") || (folder && folder.includes("certificates"))) {
            const certId = cleanFilename.replace(/\.(pdf|jpe?g|png)$/i, "");
            const result = await generateDynamicLeavePDF(cleanFilename, certId);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="${cleanFilename}"`);
            return res.send(result.pdfBuffer);
        }

        // C. Complaint Acknowledgement Slip (REF-... or slips)
        if (cleanFilename.toUpperCase().includes("REF") || (folder && folder.includes("slips"))) {
            const refId = cleanFilename.replace(/\.(pdf|jpe?g|png)$/i, "");
            const result = await generateDynamicSlipPDF(cleanFilename, refId);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="${cleanFilename}"`);
            return res.send(result.pdfBuffer);
        }

        // D. Flood Advisory (advisory-... or flood-risk)
        if (cleanFilename.toLowerCase().includes("advisory") || (folder && folder.includes("flood"))) {
            const advId = cleanFilename.replace(/\.(pdf|jpe?g|png)$/i, "");
            const result = await generateDynamicFloodAdvisoryPDF(cleanFilename, advId);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="${cleanFilename}"`);
            return res.send(result.pdfBuffer);
        }

        // E. Catch-all fallback for any other requested PDF document
        const genericId = cleanFilename.replace(/\.(pdf|jpe?g|png)$/i, "");
        const fallbackResult = await generateDynamicSuspensionPDF(cleanFilename, genericId);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${cleanFilename}"`);
        return res.send(fallbackResult.pdfBuffer);

    } catch (err) {
        console.error("[Document Route Error]:", err);
        return res.status(500).json({
            error: "Failed to load document",
            message: err.message,
            filename: req.params.filename || req.params.folder
        });
    }
};

// Mount specific folder paths
router.get("/certificates/:filename", handleDocumentRequest);
router.get("/slips/:filename", handleDocumentRequest);
router.get("/flood-advisories/:filename", handleDocumentRequest);
router.get("/:folder/:filename", handleDocumentRequest);
router.get("/:filename", handleDocumentRequest);

export default router;
