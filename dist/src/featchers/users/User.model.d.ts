import mongoose from "mongoose";
import { Model } from "mongoose";
export interface IAddress extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    street: string;
    city: string;
    country: string;
    zipCode: string;
}
declare const userModel: Model<IUser>;
export default userModel;
//# sourceMappingURL=User.model.d.ts.map