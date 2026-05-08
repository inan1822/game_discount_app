import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const mongoConnect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log("MongoDB connected successfully ");
    }
    catch (error) {
        if (error instanceof Error) {
            console.log("cant connect to mongoo:", error);
            setTimeout(mongoConnect, 5000);
        }
    }
};
export default mongoConnect;
//# sourceMappingURL=db.js.map