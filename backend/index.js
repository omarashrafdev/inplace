// Libraries
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const { APIDocs } = require("./core/swagger");
require("express-async-errors");
require("dotenv").config();

// Custom modules
const sequelize = require("./core/db");
const { errorHandler } = require("./core/middlewares");
const { authRouter } = require("./authentication/router");
const { privateOffersRouter, publicOffersRouter } = require("./offers/routes");
const { userRouter } = require("./users/routes");
const { likesRouter } = require("./likes/routes");
const {
	attachUserInfoToReq,
	jwtFilter
} = require("./authentication/middlewares");

const app = express();

// Ensure required env variables exist
const requiredEnvVars = ["DB_HOST", "DB_NAME", "DB_USERNAME", "DB_PASSWORD", "PORT"];
requiredEnvVars.forEach((key) => {
	if (!process.env[key]) {
		console.error(`⚠️ Missing required environment variable: ${key}`);
		process.exit(1); // Exit process if a required variable is missing
	}
});

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(attachUserInfoToReq());

// Public Routes (No Authentication Required)
app.get("/", (req, res) => res.send("ok"));
app.use("/auth", authRouter);
app.use("/offers", publicOffersRouter);

// API Docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(APIDocs.get()));

// Private Routes (Requires Authentication)
app.use(jwtFilter());
app.get("/private", (req, res) => res.send("Welcome to inPlace"));
app.use("/offers", privateOffersRouter);
app.use("/users", userRouter);
app.use("/likes", likesRouter);

// Error Handling Middleware
app.use(errorHandler());

const PORT = process.env.PORT || process.env.DEFAULT_PORT || 3000;

// Function to Start the Server After DB Connection
const startServer = async () => {
	try {
		await sequelize.authenticate();
		console.log("✅ Database connection established successfully");

		await sequelize.sync(); // Sync models before server starts
		console.log("✅ All models were synchronized successfully");

		app.listen(PORT, () => {
			console.log(`🚀 Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error("❌ Error connecting to the database:", error);
		process.exit(1); // Exit if DB connection fails
	}
};

startServer();
