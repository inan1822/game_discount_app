import express from "express";
import authRouter from "./src/featchers/auth/auth.routes.js";
import userRouter from "./src/featchers/users/users.routes.js";
import productrout from "./src/featchers/products/Product.Routes.js";
import orderRouter from "./src/featchers/order/order.routes.js";
import cartRouter from "./src/featchers/cart/cart.routes.js";
import mongoConnect from "./src/config/db.js";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import { createServer } from "http";
import { initSocket } from "./src/config/socket.js";
import errorHandler from "./src/shared/middlewares/errorHandler.js";
import morgan from "morgan";
dotenv.config();
const app = express();
const httpServer = createServer(app);
initSocket(httpServer);
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
const allowedOrigins = ["http://127.0.0.1:5500", "http://localhost:5173"];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Origin not allowed"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
}));
const blockOriginForPost = ["http://127.0.0.1:5500", "http://127.0.0.1:5501"];
app.use((req, res, next) => {
    if (req.method === "GET") {
        return next();
    }
    const origin = req.get("origin");
    const isBlockedOrigin = blockOriginForPost.includes(origin);
    const isWriteMethod = ["POST", "PUT", "DELETE"].includes(req.method);
    if (isWriteMethod && origin && isBlockedOrigin) {
        return res.status(403).json({
            status: "403",
            message: "Not allowed to perform POST/PUT/DELETE",
            data: null
        });
    }
    next();
});
app.use(express.json());
app.use(hpp({
    whitelist: ["tags", "categories"],
    checkQuery: true,
    checkBody: true
}));
app.set("trust proxy", 1);
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: "429",
        message: "Too many attempts, please try again after a minute",
        data: null
    }
});
const globalLimiter = rateLimit({
    windowMs: 60 * 1000, // דקה
    limit: 100, // 100 בקשות
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: "429",
        message: "Too many requests, please slow down",
        data: null
    }
});
app.use("/api/v1/auth", authLimiter, authRouter);
app.use("/api/v1/users", globalLimiter, userRouter);
app.use("/api/v1/products", globalLimiter, productrout);
app.use("/api/v1/orders", globalLimiter, orderRouter);
app.use("/api/v1/cart", globalLimiter, cartRouter);
app.get("/", (req, res) => {
    res.status(200).send("server is running");
});
app.use(errorHandler);
const Port = process.env.PORT || 3000;
mongoConnect().then(() => {
    httpServer.listen(Port, () => {
        console.log(`Database connected and server is running on port ${Port}`);
    });
}).catch(err => {
    console.log("Failed to connect to DB:", err);
});
//# sourceMappingURL=server.js.map