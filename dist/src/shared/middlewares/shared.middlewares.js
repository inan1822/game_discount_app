import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import userModel from "../../featchers/users/User.model.js";
dotenv.config();
export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const inputToken = authHeader?.split(" ")[1];
        if (!inputToken) {
            return res.status(401).json({
                status: "401",
                message: "Access Denied: No Token Provided"
            });
        }
        const decoded = jwt.verify(inputToken, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id);
        if (!user || user.token !== inputToken) {
            return res.status(401).json({ message: "Token is invalid or expired" });
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        // אם הטוקן לא תקין או פג תוקף
        res.status(403).json({
            status: "401",
            message: "Invalid or Expired Token",
            data: error.message
        });
    }
};
//# sourceMappingURL=shared.middlewares.js.map