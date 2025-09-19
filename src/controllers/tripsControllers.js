import Trip from '../models/Trip.js'

export const getAllTrips = async (req, res) => {
  try {
    const trips = await Trip.find();
    res.status(200).json(trips);
  } catch (error) {
    console.error("Error calling getAllTrip", error);
    res.status(500).json({message:"Error"});
  }
}; 

export const createTrip = async (req, res) => {
  try {
    const {name} = res.body;
    const trip = new Trip({name});

    const newTrip = await trip.save();
    res.status(201).json(newTrip);
    
  } catch (error) {
    console.error("Error calling createTrip", error);
    res.status(500).json({message:"Error"});
  }
};

export const updateTrip = (req, res) => {
  res.status(200).json({ message: "" });
};

export const deleteTrip = (req, res) => {
  res.status(200).json({ message: "" });
};
