import mongoose from "mongoose";
export declare const cartItemSchema: mongoose.Schema<ICartItem, mongoose.Model<ICartItem, any, any, any, (mongoose.Document<unknown, any, ICartItem, any, mongoose.DefaultSchemaOptions> & ICartItem & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (mongoose.Document<unknown, any, ICartItem, any, mongoose.DefaultSchemaOptions> & ICartItem & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}), any, ICartItem>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, ICartItem, mongoose.Document<unknown, {}, ICartItem, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<ICartItem & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    productId?: mongoose.SchemaDefinitionProperty<mongoose.Types.ObjectId, ICartItem, mongoose.Document<unknown, {}, ICartItem, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<ICartItem & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    name?: mongoose.SchemaDefinitionProperty<string, ICartItem, mongoose.Document<unknown, {}, ICartItem, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<ICartItem & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    price?: mongoose.SchemaDefinitionProperty<number, ICartItem, mongoose.Document<unknown, {}, ICartItem, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<ICartItem & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    quantity?: mongoose.SchemaDefinitionProperty<number, ICartItem, mongoose.Document<unknown, {}, ICartItem, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<ICartItem & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    image?: mongoose.SchemaDefinitionProperty<string | null | undefined, ICartItem, mongoose.Document<unknown, {}, ICartItem, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<ICartItem & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, ICartItem>;
declare const cartModel: mongoose.Model<ICart, {}, {}, {}, mongoose.Document<unknown, {}, ICart, {}, mongoose.DefaultSchemaOptions> & ICart & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ICart>;
export default cartModel;
//# sourceMappingURL=cart.model.d.ts.map