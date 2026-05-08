import mongoose from "mongoose";
declare const orderModel: mongoose.Model<IOrder, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, IOrder, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<IOrder & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, mongoose.Schema<IOrder, mongoose.Model<IOrder, any, any, any, (mongoose.Document<unknown, any, IOrder, any, mongoose.DefaultSchemaOptions> & IOrder & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | (mongoose.Document<unknown, any, IOrder, any, mongoose.DefaultSchemaOptions> & IOrder & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}), any, IOrder>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, IOrder, mongoose.Document<unknown, {}, IOrder, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<IOrder & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    _id?: mongoose.SchemaDefinitionProperty<mongoose.Types.ObjectId, IOrder, mongoose.Document<unknown, {}, IOrder, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IOrder & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    items?: mongoose.SchemaDefinitionProperty<IOrderItem[], IOrder, mongoose.Document<unknown, {}, IOrder, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IOrder & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    createdAt?: mongoose.SchemaDefinitionProperty<Date, IOrder, mongoose.Document<unknown, {}, IOrder, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IOrder & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    updatedAt?: mongoose.SchemaDefinitionProperty<Date, IOrder, mongoose.Document<unknown, {}, IOrder, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IOrder & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    orderedBy?: mongoose.SchemaDefinitionProperty<mongoose.Types.ObjectId, IOrder, mongoose.Document<unknown, {}, IOrder, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IOrder & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    address?: mongoose.SchemaDefinitionProperty<IAddress, IOrder, mongoose.Document<unknown, {}, IOrder, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IOrder & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    totalPrice?: mongoose.SchemaDefinitionProperty<number, IOrder, mongoose.Document<unknown, {}, IOrder, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IOrder & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    shippingCost?: mongoose.SchemaDefinitionProperty<number | undefined, IOrder, mongoose.Document<unknown, {}, IOrder, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IOrder & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    paymentMethod?: mongoose.SchemaDefinitionProperty<string, IOrder, mongoose.Document<unknown, {}, IOrder, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IOrder & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    paymentStatus?: mongoose.SchemaDefinitionProperty<"pending" | "paid" | "failed", IOrder, mongoose.Document<unknown, {}, IOrder, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IOrder & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    orderStatus?: mongoose.SchemaDefinitionProperty<"processing" | "shipped" | "delivered" | "cancelled", IOrder, mongoose.Document<unknown, {}, IOrder, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IOrder & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    trackingNumber?: mongoose.SchemaDefinitionProperty<string | undefined, IOrder, mongoose.Document<unknown, {}, IOrder, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IOrder & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    notes?: mongoose.SchemaDefinitionProperty<string | undefined, IOrder, mongoose.Document<unknown, {}, IOrder, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<IOrder & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, IOrder>, IOrder>;
export default orderModel;
//# sourceMappingURL=Order.model.d.ts.map