import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes, { devAuthRouter } from "./routes/auth.routes.js";
import timerRoutes from "./routes/timer.routes.js";
import categoriesRoutes from "./routes/categories.routes.js";
import tasksRoutes from "./routes/tasks.routes.js";
import activitiesRoutes from "./routes/activities.routes.js";
import gamificationRoutes from "./routes/gamification.routes.js";
import adminUsersRoutes from "./routes/admin/admin.users.routes.js";
import adminEggsRoutes from "./routes/admin/admin.eggs.routes.js";
import adminAnimalsRoutes from "./routes/admin/admin.animals.routes.js";
import adminRewardsRoutes from "./routes/admin/admin.rewards.routes.js";
import { requireAuth, requireAdmin } from "./auth/middleware.js";
import { startCleanupJob } from "./jobs/cleanup-unverified-users.js";

const PORTFRONT = process.env.FRONTEND_PORT || 6012;
const PORT = process.env.BACKEND_PORT || 3001;

const app = express();

// ==========================================
// Middlewares
// ==========================================
app.use(
  cors({
    origin: [
      `http://localhost:${PORTFRONT}`,
      "http://localhost:5173", // Vite dev server
      "http://fsg12.cpecmu.com",
      "https://fsg12.cpecmu.com",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

app.options(/.*/, cors());

app.use(express.json());

// ==========================================
// Public & User Routes
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/dev", devAuthRouter);
app.use("/api/timer", timerRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api", gamificationRoutes);

// ==========================================
// Admin Routes (Protected by requireAuth & requireAdmin)
// ==========================================
app.use("/api/admin/users", requireAuth, requireAdmin, adminUsersRoutes);
app.use("/api/admin/eggs", requireAuth, requireAdmin, adminEggsRoutes);
app.use("/api/admin/animals", requireAuth, requireAdmin, adminAnimalsRoutes);
app.use("/api/admin/egg-rewards", requireAuth, requireAdmin, adminRewardsRoutes);

// ==========================================
// Background Jobs
// ==========================================
startCleanupJob();

// ==========================================
// Start Server
// ==========================================
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
