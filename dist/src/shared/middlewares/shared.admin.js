import userModel from "../../featchers/users/User.model.js";
export const isAdmin = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json({
                status: "401",
                message: "Unauthorized",
                data: null
            });
        const user = await userModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                status: "404",
                message: "User not found",
                data: null
            });
        }
        if (user.role !== "admin") {
            return res.status(403).json({
                status: "403",
                message: "Access denied, admins only",
                data: null
            });
        }
        next();
    }
    catch (error) {
        return res.status(500).json({
            status: "500",
            message: "Internal server error",
            data: error instanceof Error ? error.message : "An unexpected error occurred"
        });
    }
};
//# sourceMappingURL=shared.admin.js.map