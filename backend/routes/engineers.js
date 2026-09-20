import express from "express";
import User from "../models/User.js";
import Assignment from "../models/Assignment.js";
import Notice from "../models/Notice.js";
import Complaint from "../models/Complaint.js";

const router = express.Router();

// GET ALL ENGINEERS (FOR ADMIN SIDEBAR)
router.get("/", async (req, res) => {
    try {
        const { department } = req.query;

        const filter = { role: "resolver" };
        if (department) {
            filter.dept_name = department;
        }

        const engineers = await User.find(filter)
            .select("name email phone dept_name activity_status experience_level gov_id area city state head_of_dept position area_expertise created_at")
            .lean();

        // Count active tasks for each engineer
        const result = await Promise.all(
            engineers.map(async (eng) => {
                const activeTasks = await Assignment.countDocuments({
                    engineer_id: eng._id,
                    status: { $in: ["Assigned", "In Progress"] }
                });
                return { ...eng, id: eng._id, active_tasks: activeTasks };
            })
        );

        // Sort: fewer active tasks first, then by activity_status
        result.sort((a, b) => {
            if (a.active_tasks !== b.active_tasks) return a.active_tasks - b.active_tasks;
            return (a.activity_status || "").localeCompare(b.activity_status || "");
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE ENGINEER
router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        
        // 1. Check if engineer has active tasks
        const activeTasks = await Assignment.countDocuments({
            engineer_id: id,
            status: { $in: ["Assigned", "In Progress"] }
        });

        if (activeTasks > 0) {
            return res.status(400).json({ error: "Cannot delete engineer with active assignments. Reassign their tasks first." });
        }

        // 2. Delete engineer
        await User.findByIdAndDelete(id);
        
        // 3. Cleanup archived assignments (optional, but good for cleanliness)
        await Assignment.deleteMany({ engineer_id: id });

        res.json({ message: "Engineer record removed successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET DISCIPLINE DATA
router.get("/discipline", async (req, res) => {
    try {
        const engineers = await User.find({ role: "resolver" }).lean();
        const allAssignments = await Assignment.find().lean();
        const allNotices = await Notice.find().lean();
        const allComplaints = await Complaint.find().lean();

        const data = await Promise.all(engineers.map(async (eng) => {
            const engAssignments = allAssignments.filter(a => a.engineer_id.toString() === eng._id.toString());
            const engNotices = allNotices.filter(n => n.engineer_id.toString() === eng._id.toString());
            
            // Violations: Rejected notices or Dissatisfied complaints where this engineer was assigned
            const rejectedNotices = engNotices.filter(n => n.admin_decision === 'Rejected').length;
            
            // For dissatisfied complaints, find which ones were assigned to this specific engineer
            const dissociatedAssignedComplaints = allAssignments
                .filter(a => a.engineer_id.toString() === eng._id.toString())
                .map(a => a.complaint_id.toString());
                
            const dissatisfiedComplaintsCount = allComplaints.filter(c => 
                c.satisfaction_status === 'Dissatisfied' && 
                dissociatedAssignedComplaints.includes(c._id.toString())
            ).length;

            const violations = rejectedNotices + dissatisfiedComplaintsCount;

            // Late tasks: UpdatedAt > Deadline (resolved tasks only)
            const lateTasks = engAssignments.filter(a => 
                a.status === 'Resolved' && 
                a.updatedAt && 
                a.deadline && 
                new Date(a.updatedAt) > new Date(a.deadline)
            ).length;

            // Intelligence Scoring logic
            const complianceScore = Math.max(0, 100 - (violations * 10) - (lateTasks * 5));

            let status = "Good";
            if (complianceScore < 50) status = "Suspend Candidate";
            else if (complianceScore < 70) status = "Critical";
            else if (complianceScore < 90) status = "Warning";

            return {
                id: eng._id,
                _id: eng._id,
                name: eng.name,
                department: eng.dept_name || "General Maintenance",
                assigned: engAssignments.length,
                violations,
                lateTasks,
                complianceScore,
                status,
                is_suspended: eng.is_suspended || false,
                suspension_until: eng.suspension_until || null,
                suspension_appeal: eng.suspension_appeal || null,
                email: eng.email,
                phone: eng.phone
            };
        }));

        const summary = {
            totalEngineers: engineers.length,
            violationsToday: allNotices.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString()).length,
            activeWarnings: allNotices.filter(n => n.admin_decision === 'Pending').length,
            suspendedEngineers: engineers.filter(e => e.is_suspended).length
        };

        res.json({ engineers: data, summary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// TAKE ACTION
router.post("/discipline/action", async (req, res) => {
    try {
        const { engineerId, action, reason } = req.body;
        if (!engineerId || !action) return res.status(400).json({ error: "Missing engineerId or action" });

        if (action === 'SUSPEND') {
            const suspensionUntil = new Date();
            suspensionUntil.setDate(suspensionUntil.getDate() + 7); // Default 7 days
            await User.findByIdAndUpdate(engineerId, { 
                is_suspended: true, 
                suspension_until: suspensionUntil,
                activity_status: "On Leave" 
            });
        }
        
        // This could be expanded to create a formal log or notice in the future
        res.json({ message: `Action ${action} recorded for engineer.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET ENGINEER LOGS
router.get("/discipline/:id/logs", async (req, res) => {
    try {
        const notices = await Notice.find({ engineer_id: req.params.id })
            .populate("complaint_id", "reference_number issue_type status")
            .sort({ created_at: -1 });
        res.json(notices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// RETURN ENGINEER TO WORK (Admin clears On Leave status)
router.patch("/:id/return-to-work", async (req, res) => {
    try {
        const engineer = await User.findById(req.params.id);
        if (!engineer) return res.status(404).json({ error: "Engineer not found" });

        await User.findByIdAndUpdate(req.params.id, {
            activity_status: "Available"
        });

        res.json({ message: `${engineer.name} has been returned to active duty.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET SINGLE ENGINEER PROFILE / STATUS
router.get("/profile/:id", async (req, res) => {
    try {
        const engineer = await User.findById(req.params.id)
            .select("-password")
            .lean();
        if (!engineer) return res.status(404).json({ error: "Engineer not found" });
        res.json({
            ...engineer,
            id: engineer._id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// REVOKE SUSPENSION (Manual Admin Action)
router.post("/discipline/:id/revoke-suspension", async (req, res) => {
    try {
        const { reason } = req.body;
        const engineer = await User.findById(req.params.id);
        if (!engineer) return res.status(404).json({ error: "Engineer not found" });
        if (!engineer.is_suspended) return res.status(400).json({ error: "Engineer is not currently suspended" });

        await User.findByIdAndUpdate(req.params.id, {
            is_suspended: false,
            suspension_letter: null,
            suspension_until: null,
            login_disabled: false,
            login_disabled_reason: null,
            activity_status: "Available",
            // Update appeal status if one was pending
            "suspension_appeal.status": "Approved",
            "suspension_appeal.admin_notes": reason || "Suspension revoked by administrator.",
            "suspension_appeal.reviewed_at": new Date()
        });

        res.json({ message: `Suspension for ${engineer.name} has been revoked. Account restored.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SUBMIT SUSPENSION APPEAL (Engineer files an appeal to withdraw their suspension)
router.post("/suspension/appeal", async (req, res) => {
    try {
        const { engineer_id, statement, supporting_document } = req.body;
        if (!engineer_id || !statement) {
            return res.status(400).json({ error: "engineer_id and statement are required" });
        }

        const engineer = await User.findById(engineer_id);
        if (!engineer) return res.status(404).json({ error: "Engineer not found" });
        if (!engineer.is_suspended) return res.status(400).json({ error: "Engineer is not currently suspended" });

        // Check if there's already a pending appeal
        if (engineer.suspension_appeal?.submitted && engineer.suspension_appeal?.status === 'Pending') {
            return res.status(400).json({ error: "An appeal is already pending review by admin" });
        }

        await User.findByIdAndUpdate(engineer_id, {
            suspension_appeal: {
                submitted: true,
                statement,
                supporting_document: supporting_document || null,
                submitted_at: new Date(),
                status: 'Pending',
                admin_notes: null,
                reviewed_at: null
            }
        });

        res.json({ message: "Suspension appeal submitted successfully. Admin will review it shortly." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// REVIEW SUSPENSION APPEAL (Admin approves or rejects the engineer's appeal)
router.post("/suspension/appeal/:engineer_id/review", async (req, res) => {
    try {
        const { action, admin_notes } = req.body; // action: 'approve' | 'reject'
        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: "action must be 'approve' or 'reject'" });
        }

        const engineer = await User.findById(req.params.engineer_id);
        if (!engineer) return res.status(404).json({ error: "Engineer not found" });
        if (!engineer.suspension_appeal?.submitted) {
            return res.status(400).json({ error: "No appeal found for this engineer" });
        }

        if (action === 'approve') {
            // Lift the suspension entirely
            await User.findByIdAndUpdate(req.params.engineer_id, {
                is_suspended: false,
                suspension_letter: null,
                suspension_until: null,
                login_disabled: false,
                login_disabled_reason: null,
                activity_status: "Available",
                "suspension_appeal.status": "Approved",
                "suspension_appeal.admin_notes": admin_notes || "Appeal approved. Suspension withdrawn.",
                "suspension_appeal.reviewed_at": new Date()
            });
            res.json({ message: "Appeal approved. Suspension has been lifted. Engineer account restored." });
        } else {
            // Reject the appeal — keep suspension
            await User.findByIdAndUpdate(req.params.engineer_id, {
                "suspension_appeal.status": "Rejected",
                "suspension_appeal.admin_notes": admin_notes || "Appeal rejected after review.",
                "suspension_appeal.reviewed_at": new Date()
            });
            res.json({ message: "Appeal rejected. Suspension remains active." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET PENDING APPEALS (Admin dashboard summary)
router.get("/suspension/appeals", async (req, res) => {
    try {
        const engineers = await User.find({
            is_suspended: true,
            "suspension_appeal.submitted": true,
            "suspension_appeal.status": "Pending"
        }).select("name email dept_name suspension_until suspension_appeal").lean();
        res.json(engineers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
