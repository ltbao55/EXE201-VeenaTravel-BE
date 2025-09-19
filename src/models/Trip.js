import mongoose from "mongoose";

const tripSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    city: String,
    province: String,
    country: { type: String, default: "Vietnam" },
  },
  description: String,
  category: {
    type: String,
    enum: ["nature", "historical", "entertainment", "cultural", "other"],
  },
  averageCost: Number,
  images: [String],
  popular: { type: Boolean, default: false },
});

const Trip = mongoose.model("Trip", tripSchema);
export default Trip;